import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp, ld, normWa, fmtPhone } from '../utils/format';

export default function BookingPage() {
  const {
    isConfigured,
    ready,
    brand,
    kontak,
    services,
    capsters,
    bookedSlots,
    setView,
    refreshAll,
  } = useApp();

  const today = ld();
  const [selectedSvcIds, setSelectedSvcIds] = useState([]);
  const [tanggal, setTanggal] = useState(today);
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
    return new Date(`${tglStr}T${jamStr}:00+07:00`).getTime() >= Date.now() + 60 * 60000;
  };

  // Cek bentrok capster (selisih < 30 menit di tanggal yang sama)
  const isCapsterBusy = (capsterId, tglStr, jamStr) => {
    if (!capsterId || !tglStr || !jamStr) return false;
    const [hh, mm] = jamStr.split(':').map(Number);
    const targetMin = hh * 60 + mm;
    return bookedSlots.some((b) => {
      if (b.kap_id !== capsterId || b.tanggal !== tglStr) return false;
      const [bh, bm] = String(b.jam || '00:00').split(':').map(Number);
      return Math.abs(bh * 60 + bm - targetMin) < 30;
    });
  };

  const toggleService = (id) => {
    setSelectedSvcIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDateChange = (val) => {
    const cleanDate = val < today ? today : val;
    setTanggal(cleanDate);
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

  const selectedServices = services.filter((s) => selectedSvcIds.includes(s.id));
  const totalHarga = selectedServices.reduce((sum, s) => sum + s.harga, 0);
  const policyLines = brand.pol
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConfigured || !supabase) {
      return setErrorMsg('Konfigurasi database belum dipasang.');
    }
    if (!selectedSvcIds.length) {
      return setErrorMsg('Pilih minimal satu layanan.');
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
    const cleanWa = normWa(wa);
    if (!cleanWa) {
      return setErrorMsg('Nomor WhatsApp tidak valid (contoh: 08123456789).');
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('buat_booking', {
        p_svc_ids: selectedSvcIds,
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
    setTanggal(today);
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
          <a className="cu" href="#kontak">
            Contact Us
          </a>
        </div>
      </div>

      <h1 className="ht">Book Your Session Now</h1>

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
            {kontak.wa && (
              <a
                className="cu"
                style={{ flex: 1, textAlign: 'center' }}
                href={`https://wa.me/${kontak.wa}?text=${encodeURIComponent(
                  `Halo ${brand.nama}, saya sudah booking dengan kode ${doneBooking.nomor} (${doneBooking.nama}) jadwal ${doneBooking.tanggal} jam ${doneBooking.jam} bersama ${doneBooking.kap_nama}.`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Konfirmasi via WA
              </a>
            )}
            <button type="button" onClick={resetForm}>
              Booking Lagi
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card">
            <h2>1. Pilih Layanan</h2>
            {services.length === 0 ? (
              <p className="mu">Belum ada daftar layanan tersedia.</p>
            ) : (
              <div className="grid">
                {services.map((s) => {
                  const isOn = selectedSvcIds.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      className={`svc ${isOn ? 'on' : ''}`}
                      onClick={() => toggleService(s.id)}
                    >
                      <b>{s.nama}</b>
                      <span>
                        {rp(s.harga)} · {s.kat}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="row" style={{ marginTop: 10 }}>
                <span>{selectedServices.length} layanan dipilih</span>
                <b className="tot">{rp(totalHarga)}</b>
              </div>
            )}
          </div>

          <div className="card">
            <h2>2. Pilih Tanggal &amp; Jam</h2>
            <label>Tanggal Kedatangan</label>
            <input
              type="date"
              min={today}
              value={tanggal}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <label>Jam Layanan (WIB)</label>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', marginTop: 6 }}>
              {timeSlots.map((slot) => {
                const allowed = isSlotAllowed(tanggal, slot);
                return (
                  <button
                    type="button"
                    key={slot}
                    className={jam === slot ? 'on' : ''}
                    disabled={!allowed}
                    onClick={() => handleSelectTime(slot)}
                  >
                    {slot}
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
              placeholder="Contoh: Budi Santoso"
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
        <div className="card">
          <h2>Booking Policy</h2>
          <ol className="pol">
            {policyLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="card prof" id="kontak">
        <img className="logo" src="/logo.jpeg" alt={brand.nama} />
        <h2 className="pn">{brand.nama}</h2>
        <div className="cl">
          {kontak.wa && (
            <a className="ci" href={`https://wa.me/${kontak.wa}`} target="_blank" rel="noreferrer">
              <span>WhatsApp:</span>
              <b>{fmtPhone(kontak.waShow)}</b>
            </a>
          )}
          {kontak.ig && (
            <a className="ci" href={kontak.ig} target="_blank" rel="noreferrer">
              <span>Instagram:</span>
              <b>@{kontak.igTxt}</b>
            </a>
          )}
          {kontak.tt && (
            <a className="ci" href={kontak.tt} target="_blank" rel="noreferrer">
              <span>TikTok:</span>
              <b>@{kontak.ttTxt}</b>
            </a>
          )}
          {kontak.fb && (
            <a className="ci" href={kontak.fb} target="_blank" rel="noreferrer">
              <span>Facebook:</span>
              <b>{kontak.fbTxt}</b>
            </a>
          )}
          {kontak.maps && (
            <a className="ci" href={kontak.maps} target="_blank" rel="noreferrer">
              <span>Lokasi Google Maps</span>
            </a>
          )}
        </div>
        {kontak.email && (
          <p style={{ marginTop: 12 }}>
            Email:{' '}
            <a className="em" href={`mailto:${kontak.email}`}>
              {kontak.email}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}