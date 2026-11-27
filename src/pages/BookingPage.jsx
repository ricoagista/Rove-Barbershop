import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp, ld, normWa } from '../utils/format';

const BOOKING_DATE_KEY = 'rove.booking.date';

function readBookingDate(today) {
  try {
    const saved = window.sessionStorage.getItem(BOOKING_DATE_KEY);
    return saved && /^\d{4}-\d{2}-\d{2}$/.test(saved) && saved >= today ? saved : today;
  } catch {
    return today;
  }
}

function writeBookingDate(value) {
  try { window.sessionStorage.setItem(BOOKING_DATE_KEY, value); } catch { /* storage unavailable */ }
}

function clearBookingDate() {
  try { window.sessionStorage.removeItem(BOOKING_DATE_KEY); } catch { /* storage unavailable */ }
}

export default function BookingPage() {
  const {
    isConfigured,
    ready,
    brand,
    services,
    capsters,
    bookedSlots,
    setView,
    refreshAll,
  } = useApp();

  const today = ld();
  const [selectedSvcIds, setSelectedSvcIds] = useState([]);
  const [peopleCount, setPeopleCount] = useState(1);
  const [tanggal, setTanggal] = useState(() => readBookingDate(today));
  const [jam, setJam] = useState('');
  const [kapId, setKapId] = useState('');
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneBooking, setDoneBooking] = useState(null);

  const timeSlots = useMemo(() => {
    const toMin = (value) => { const [h, m] = String(value).split(':').map(Number); return h * 60 + m; };
    const open = toMin(brand.jamBuka);
    const last = Math.min(toMin(brand.batasReservasiTerakhir), toMin(brand.jamTutup) - 60);
    return Array.from({ length: Math.max(0, Math.floor((last - open) / 30) + 1) }, (_, i) => {
      const min = open + i * 30;
      return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    });
  }, [brand.jamBuka, brand.jamTutup, brand.batasReservasiTerakhir]);

  const isSlotAllowed = (tglStr, jamStr) => {
    if (!tglStr || !jamStr) return false;
    const serviceTs = new Date(`${tglStr}T${jamStr}:00+07:00`).getTime();
    return Number.isFinite(serviceTs) && serviceTs >= Date.now() + 60 * 60000;
  };

  // Cek bentrok capster (selisih < 30 menit di tanggal yang sama)
  const isCapsterBusy = (capsterId, tglStr, jamStr) => {
    if (!capsterId || !tglStr || !jamStr) return false;
    const [hh, mm] = jamStr.split(':').map(Number);
    const targetMin = hh * 60 + mm;
    const target = bookedSlots.filter((b) => b.tanggal === tglStr && b.jam === jamStr);
    return target.some((b) => b.sumber === 'ditutup' && (b.kap_id === null || b.kap_id === capsterId)) || target.some((b) => {
      if (b.sumber === 'ditutup' || b.kap_id !== capsterId || typeof b.jam !== 'string') return false;
      const [bookedHour, bookedMinute] = b.jam.split(':').map(Number);
      if (!Number.isFinite(bookedHour) || !Number.isFinite(bookedMinute)) return false;
      return Math.abs(bookedHour * 60 + bookedMinute - targetMin) < 30;
    });
  };

  const isSlotFull = (tglStr, jamStr) => capsters.length > 0 && capsters.every((c) => isCapsterBusy(c.id, tglStr, jamStr));

  const toggleService = (id) => {
    const svc = services.find((s) => s.id === id);
    setSelectedSvcIds((prev) => {
      const count = prev.filter((x) => x === id).length;
      if (svc?.kat === 'Hair Cut') {
        if (peopleCount === 1) {
          return count ? prev : [...prev.filter((selectedId) => services.find((s) => s.id === selectedId)?.kat !== 'Hair Cut'), id];
        }
        const hairCutCount = prev.filter((selectedId) => services.find((s) => s.id === selectedId)?.kat === 'Hair Cut').length;
        return hairCutCount < peopleCount ? [...prev, id] : prev;
      }
      return count ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const changeExtraQty = (id, delta) => {
    setSelectedSvcIds((prev) => {
      const count = prev.filter((x) => x === id).length;
      const next = count + delta;
      if (next < 0 || next > peopleCount) return prev;
      if (delta > 0) return [...prev, id];
      let removed = false;
      return prev.filter((x) => {
        if (x === id && !removed) { removed = true; return false; }
        return true;
      });
    });
  };

  const changeHairCutQty = (id, delta) => {
    setSelectedSvcIds((prev) => {
      const count = prev.filter((x) => x === id).length;
      const total = prev.filter((selectedId) => services.find((s) => s.id === selectedId)?.kat === 'Hair Cut').length;
      if (delta > 0 && total >= peopleCount) return prev;
      if (delta < 0 && count === 0) return prev;
      if (delta < 0) {
        let removed = false;
        return prev.filter((x) => {
          if (x === id && !removed) { removed = true; return false; }
          return true;
        });
      }
      return [...prev, id];
    });
  };

  const changePeopleCount = (nextCount) => {
    const next = Math.min(5, Math.max(1, nextCount));
    setPeopleCount(next);
    if (next >= peopleCount) return;
    setSelectedSvcIds((prev) => {
      let remaining = next;
      return prev.filter((id) => {
        const isHairCut = services.find((s) => s.id === id)?.kat === 'Hair Cut';
        if (!isHairCut) return true;
        if (remaining > 0) {
          remaining -= 1;
          return true;
        }
        return false;
      });
    });
  };

  const handleDateChange = (val) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return;
    const cleanDate = val < today ? today : val;
    setTanggal(cleanDate);
    writeBookingDate(cleanDate);
    if (jam && !isSlotAllowed(cleanDate, jam)) {
      setJam('');
      setKapId('');
    }
  };

  const handleSelectTime = (slot) => {
    setJam(slot);
    if (kapId && isCapsterBusy(kapId, tanggal, slot)) {
      setKapId('');
    }
  };

  const selectedServices = selectedSvcIds.map((id) => services.find((s) => s.id === id)).filter(Boolean);
  const mainServices = services.filter((s) => !s.kat || s.kat === 'Hair Cut');
  const extraServices = services.filter((s) => s.kat === 'Extra Service');
  const selectedMain = selectedServices.filter((s) => !s.kat || s.kat === 'Hair Cut');
  const selectedExtras = selectedServices.filter((s) => s.kat === 'Extra Service');
  const totalHarga = selectedServices.reduce((sum, s) => sum + s.harga, 0);
  const policyLines = String(brand.pol || '').split('\n').map((x) => x.trim()).filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConfigured || !supabase) {
      return setErrorMsg('Konfigurasi database belum dipasang.');
    }
    if (!selectedSvcIds.length) {
      return setErrorMsg('Pilih minimal satu layanan.');
    }
    const selectedHairCutCount = selectedServices.filter((s) => s.kat === 'Hair Cut').length;
    if (selectedHairCutCount !== peopleCount) {
      return setErrorMsg(`Jumlah Hair Cut harus sama dengan jumlah orang (${peopleCount}). Pilih atau atur Hair Cut terlebih dahulu.`);
    }
    if (!tanggal || !jam) {
      return setErrorMsg('Pilih tanggal dan jam layanan.');
    }
    if (!isSlotAllowed(tanggal, jam)) {
      return setErrorMsg('Waktu layanan harus minimal 60 menit dari sekarang.');
    }
    if (!kapId) {
      return setErrorMsg('Pilih capster terlebih dahulu.');
    }
    if (!nama.trim()) {
      return setErrorMsg('Isi nama lengkap Anda.');
    }
    const hairCuts = selectedServices.filter((s) => s.kat === 'Hair Cut');
    if (!hairCuts.length) return setErrorMsg('Pilih minimal satu layanan Hair Cut.');
    const cleanWa = normWa(wa);
    if (!cleanWa) {
      return setErrorMsg('Nomor WhatsApp tidak valid (contoh: 08123456789).');
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('buat_booking', {
        p_svc_ids: selectedSvcIds,
        p_people_count: peopleCount,
        p_tanggal: tanggal,
        p_jam: jam,
        p_kap_id: kapId,
        p_nama: nama.trim(),
        p_wa: cleanWa,
      });
      if (error) throw error;
      setDoneBooking(data);
      await refreshAll();
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal mengirim reservasi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDoneBooking(null);
    setSelectedSvcIds([]);
    setPeopleCount(1);
    setTanggal(today);
    clearBookingDate();
    setJam('');
    setKapId('');
    setNama('');
    setWa('');
    setErrorMsg('');
  };

  return (
    <div className="wrap">
      <div className="hb">
        <img className="hl" src="/logo.jpeg" alt={brand.nama} />
        <div className="hr">
          <button className="ghost" onClick={() => setView('login')}>
            Login Staf
          </button>
        </div>
      </div>

      <h1 className="ht">Book Your Session Now</h1>
      {brand.jargon && <p className="sub">{brand.jargon}</p>}

      {!ready ? (
        <div className="card">
          <p className="mu" style={{ textAlign: 'center' }}>
            Memuat jadwal &amp; layanan...
          </p>
        </div>
      ) : doneBooking ? (
        <div className="card">
          <h2>Reservasi Berhasil Dibuat</h2>
          <p className="mu">Simpan kode booking di bawah ini dan tunjukkan saat tiba di lokasi.</p>
          <div className="row">
            <span>Kode Booking</span>
            <b>{doneBooking.nomor}</b>
          </div>
          <div className="row">
            <span>Nama</span>
            <b>{doneBooking.nama}</b>
          </div>
          <div className="row">
            <span>Layanan</span>
            <b>{doneBooking.svc_nama}</b>
          </div>
          <div className="row">
            <span>Jadwal</span>
            <b>
              {doneBooking.tanggal} pukul {doneBooking.jam} WIB
            </b>
          </div>
          <div className="row">
            <span>Capster</span>
            <b>{doneBooking.kap_nama}</b>
          </div>
          <div className="row">
            <span>Estimasi Total</span>
            <b className="tot">{rp(doneBooking.harga)}</b>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button type="button" onClick={resetForm}>
              Booking Lagi
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card booking-summary">
            <b>Ringkasan Booking</b>
            <div className="mu">Layanan: {selectedMain.map((s) => s.nama).join(', ') || 'Belum dipilih'}</div>
            {selectedExtras.length > 0 && <div className="mu">Extra: {selectedExtras.map((s) => s.nama).join(', ')}</div>}
            <strong>{rp(totalHarga)}</strong>
          </div>
          <div className="card">
            <h2>1. Pilih Layanan</h2>
            {services.length === 0 ? (
              <p className="mu">Belum ada daftar layanan tersedia.</p>
            ) : (
              <div className="grid">
                {mainServices.map((s) => {
                  const selectedCount = selectedSvcIds.filter((id) => id === s.id).length;
                  const isOn = selectedCount > 0;
                  return (
                    <div
                      key={s.id}
                      className={`svc ${isOn ? 'on' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleService(s.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleService(s.id); } }}
                    >
                      <b>{s.nama}</b>
                      <span>
                        {rp(s.harga)} · {s.kat}
                      </span>
                      {s.kat === 'Hair Cut' && peopleCount > 1 && selectedCount > 0 && (
                        <span className="q" onClick={(e) => e.stopPropagation()}>
                          <button type="button" aria-label={`Kurangi ${s.nama}`} onClick={() => changeHairCutQty(s.id, -1)}>−</button>
                          {selectedCount}
                          <button type="button" aria-label={`Tambah ${s.nama}`} onClick={() => changeHairCutQty(s.id, 1)}>+</button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {selectedMain.length > 0 && (
              <div className="row" style={{ marginTop: 10 }}>
                <span>{selectedMain.length} layanan utama dipilih</span>
                <b className="tot">{rp(selectedMain.reduce((sum, s) => sum + s.harga, 0))}</b>
              </div>
            )}
          </div>

          {selectedMain.length > 0 && (
            <div className="extra-sheet" role="region" aria-label="Pilihan extra service">
              <h3>Extra Service (opsional)</h3>
              {extraServices.length ? <div className="grid">{extraServices.map((s) => { const qty = selectedSvcIds.filter((id) => id === s.id).length; return <div key={s.id} className={`svc ${qty ? 'on' : ''}`}><b>{s.nama}</b><span>{rp(s.harga)} · {qty} dari {peopleCount} orang</span><span className="q"><button type="button" aria-label={`Kurangi ${s.nama}`} disabled={!qty} onClick={() => changeExtraQty(s.id, -1)}>−</button><b>{qty}</b><button type="button" aria-label={`Tambah ${s.nama}`} disabled={qty >= peopleCount} onClick={() => changeExtraQty(s.id, 1)}>+</button></span></div>; })}</div> : <p className="mu">Belum ada extra service.</p>}
            </div>
          )}

          <div className="card">
            <h2>2. Jumlah Orang &amp; Jadwal</h2>
            <label htmlFor="people-count">Jumlah orang</label>
            <div className="q" aria-labelledby="people-count">
              <button type="button" aria-label="Kurangi jumlah orang" disabled={peopleCount <= 1} onClick={() => changePeopleCount(peopleCount - 1)}>−</button>
              <b id="people-count" aria-live="polite">{peopleCount}</b>
              <button type="button" aria-label="Tambah jumlah orang" disabled={peopleCount >= 5} onClick={() => changePeopleCount(peopleCount + 1)}>+</button>
            </div>
            <p className="mu">Hair Cut akan dihitung untuk setiap orang.</p>
            <h2>Pilih Tanggal &amp; Jam</h2>
            <label htmlFor="booking-date">Tanggal Kedatangan</label>
            <input
              id="booking-date"
              type="date"
              min={today}
              value={tanggal}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <label id="booking-time-label">Jam Layanan (WIB)</label>
            {!timeSlots.some((slot) => isSlotAllowed(tanggal, slot)) && <p className="mu">Tidak ada slot tersedia minimal 60 menit dari sekarang. Silakan pilih tanggal lain.</p>}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', marginTop: 6 }}>
              {timeSlots.map((slot) => {
                const allowed = isSlotAllowed(tanggal, slot);
                const full = isSlotFull(tanggal, slot);
                return (
                  <button
                    type="button"
                    key={slot}
                    aria-describedby="booking-time-label"
                    className={`${jam === slot ? 'on' : ''} ${full ? 'unavailable' : ''}`}
                    disabled={!allowed || full}
                    aria-label={`${slot}${full ? ', penuh' : ''}`}
                    onClick={() => handleSelectTime(slot)}
                  >
                    <span>{slot}</span>{full && <small>Penuh</small>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2>3. Pilih Capster</h2>
            {!jam ? (
              <p className="mu">Pilih tanggal dan jam terlebih dahulu untuk melihat ketersediaan capster.</p>
            ) : capsters.length === 0 ? (
              <p className="mu">Belum ada data capster.</p>
            ) : (
              <div className="grid">
                {capsters.map((c) => {
                  const busy = isCapsterBusy(c.id, tanggal, jam);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      className={`kap ${kapId === c.id ? 'on' : ''}`}
                      disabled={busy}
                      onClick={() => setKapId(c.id)}
                    >
                      {c.photo_url ? (
                        <img src={c.photo_url} alt={c.name} />
                      ) : (
                        <i>✂️</i>
                      )}
                      <b>{c.name}</b>
                      <span>{busy ? 'Penuh di jam ini' : 'Tersedia'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h2>4. Data Pemesan</h2>
            <label>Nama Lengkap</label>
            <input
              type="text"
              maxLength={60}
              placeholder="Contoh: Jhon Doe"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
            <label>Nomor WhatsApp</label>
            <input
              type="tel"
              placeholder="Contoh: 08123456789"
              value={wa}
              onChange={(e) => setWa(e.target.value)}
            />
            {errorMsg && <div className="err">{errorMsg}</div>}
            <button
              type="submit"
              className="p"
              style={{ width: '100%', marginTop: 6 }}
              disabled={submitting}
            >
              {submitting ? 'Memproses Reservasi...' : 'Konfirmasi Booking'}
            </button>
          </div>
        </form>
      )}

      {policyLines.length > 0 && (
        <div className="card policy-last">
          <h2>Booking Policy</h2>
          <ol className="pol">
            {policyLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

