import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp, normWa } from '../utils/format';
import { KATS } from '../utils/defaults';
import Receipt58mm from '../components/Receipt58mm';

export default function CashierPage({ externalReceipt, onClearExternalReceipt }) {
  const {
    me,
    services,
    promos,
    bookings,
    capsters,
    isCapsterActive,
    isServiceOpen,
    refreshAll,
  } = useApp();

  const [cart, setCart] = useState({});
  const hairCutCount = Object.entries(cart).reduce((sum, [id, qty]) => sum + (services.find((s) => s.id === id)?.kat === 'Hair Cut' ? qty : 0), 0);
  const [promoId, setPromoId] = useState('');
  const [capsterId, setCapsterId] = useState('');
  const [ptype, setPtype] = useState('regular'); // 'regular' | 'reservasi'
  const [bkId, setBkId] = useState('');
  const [custName, setCustName] = useState('');
  const [custWa, setCustWa] = useState('');
  const [metode, setMetode] = useState('Tunai');
  const [bayar, setBayar] = useState('');
  const [err, setErr] = useState('');
  const [printErr, setPrintErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [localReceipt, setLocalReceipt] = useState(null);

  const activeReceipt = externalReceipt || localReceipt;

  // Daftar reservasi aktif (Baru / Hadir)
  const activeBookings = useMemo(() => {
    return bookings
      .filter((b) => b.status === 'Baru' || b.status === 'Hadir')
      .sort((a, b) => `${a.tanggal}${a.jam}`.localeCompare(`${b.tanggal}${b.jam}`));
  }, [bookings]);

  const cartEntries = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const svc = services.find((v) => v.id === id);
        return svc ? { svc, qty } : null;
      })
      .filter(Boolean);
  }, [cart, services]);

  const subtotal = cartEntries.reduce((sum, item) => sum + item.svc.harga * item.qty, 0);
  const selectedPromo = promos.find((p) => p.id === promoId) || null;
  const diskon = (() => {
    if (!selectedPromo || !subtotal) return 0;
    const raw =
      selectedPromo.tipe === 'persen'
        ? Math.round((subtotal * selectedPromo.nilai) / 100)
        : selectedPromo.nilai;
    return Math.min(raw, subtotal);
  })();
  const total = subtotal - diskon;
  const bayarNum = Number(bayar) || 0;

  const addItem = (id) => {
    if (me.role === 'capster' && ptype === 'regular' && !isCapsterActive(me.id)) {
      setErr('Anda sedang tidak shift dan tidak dapat melayani transaksi regular.');
      return;
    }
    if (ptype === 'reservasi' && !bkId) {
      setErr('Pilih reservasi terlebih dulu untuk memuat layanan.');
      return;
    }
    const svc = services.find((s) => s.id === id);
    if (svc?.kat === 'Hair Cut' && (cart[id] || 0) >= 1 && ptype === 'regular') {
      setErr('Hair Cut sudah dipilih. Gunakan jumlah orang untuk menambah Hair Cut.');
      return;
    }
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setErr('');
  };

  const changeQty = (id, delta) => {
    const svc = services.find((s) => s.id === id);
    setCart((prev) => {
      const next = { ...prev };
      const current = next[id] || 0;
      const hairCount = Object.entries(prev).reduce((sum, [serviceId, qty]) => sum + (services.find((s) => s.id === serviceId)?.kat === 'Hair Cut' ? qty : 0), 0);
      const maxQty = svc?.kat === 'Hair Cut' ? (ptype === 'reservasi' ? Math.max(hairCount, current) : hairCount + 1) : Infinity;
      const val = Math.min(maxQty, current + delta);
      if (val <= 0) delete next[id];
      else next[id] = val;
      return next;
    });
  };

  const handleSelectPtype = (type) => {
    setPtype(type);
    setCustName('');
    setCustWa('');
    setBkId('');
    setCart({});
    setCapsterId('');
    setErr('');
  };

  const handlePickBooking = (id) => {
    setBkId(id);
    setErr('');
    const bk = bookings.find((b) => b.id === id);
    if (me.role === 'capster' && bk?.kap_id !== me.id) {
      setErr('Reservasi ini ditujukan untuk capster lain. Pastikan pergantian capster sudah disetujui.');
    }
    if (!bk) {
      setCustName('');
      setCustWa('');
      return;
    }
    setCustName(bk.nama || '');
    setCustWa(bk.wa || '');
    if (bk.kap_id && me.role !== 'capster' && capsters.some((c) => c.id === bk.kap_id)) {
      setCapsterId(bk.kap_id);
    }
    const nextCart = {};
    const itemsList = Array.isArray(bk.items)
      ? bk.items
      : String(bk.svc_nama || '')
          .split(', ')
          .map((nama) => ({ nama }));
    itemsList.forEach((it) => {
      const match = services.find((v) => v.nama === it.nama);
      if (match) nextCart[match.id] = (nextCart[match.id] || 0) + 1;
    });
    setCart(nextCart);
  };

  const handlePay = async () => {
    setErr('');
    if (!isServiceOpen) {
      return setErr('Tekan Open Service dulu untuk memulai transaksi.');
    }

    if (me.role === 'capster' && !isCapsterActive(me.id)) {
      return setErr('Anda sedang tidak shift dan tidak dapat dipilih untuk transaksi.');
    }

    const activeCap =
      me.role === 'capster'
        ? { id: me.id, name: me.name }
        : capsters.find((c) => c.id === capsterId) || null;

    if (!activeCap) {
      return setErr('Pilih capster yang melayani.');
    }
    if (!isCapsterActive(activeCap.id)) {
      return setErr('Capster tersebut sedang tidak shift dan tidak dapat dipilih.');
    }
    if (!hairCutCount) {
      return setErr('Pilih minimal satu layanan Hair Cut.');
    }
    if (ptype === 'reservasi' && !bkId) {
      return setErr('Pilih reservasi terlebih dulu.');
    }
    const cleanWa = custWa.trim() ? normWa(custWa) : '';
    if (ptype === 'reservasi' && !cleanWa) {
      return setErr('Nomor WhatsApp reservasi tidak valid.');
    }
    if (metode === 'Tunai' && bayarNum < total) {
      return setErr('Uang diterima kurang dari total.');
    }

    setSaving(true);
    try {
      const now = new Date();
      const itemsPayload = cartEntries.map(({ svc, qty }) => ({
        id: svc.id,
        nama: svc.nama,
        harga: Number(svc.harga) || 0,
        kat: svc.kat,
        qty,
      }));

      const payload = {
        ts: now.toISOString(),
        kasir_id: me.id,
        kasir_nama: me.name,
        capster_id: activeCap.id,
        capster_nama: activeCap.name,
        jenis: ptype === 'regular' ? 'baru' : 'reservasi',
        booking_id: ptype === 'reservasi' && bkId ? bkId : null,
        items: itemsPayload,
        subtotal,
        diskon,
        promo: diskon > 0 && selectedPromo ? selectedPromo.nama : '',
        total,
        metode,
        pelanggan: custName.trim() || 'Regular',
        wa: cleanWa || '',
        diterima: metode === 'Tunai' ? bayarNum : total,
        kembali: metode === 'Tunai' ? bayarNum - total : 0,
      };

      const { data, error } = await supabase.rpc('buat_penjualan', { p_payload: payload });
      if (error) throw error;

      setLocalReceipt(data || payload);
      setCart({});
      setBayar('');
      setCustName('');
      setCustWa('');
      setPromoId('');
      setPtype('regular');
      setBkId('');
      setCapsterId('');
      await refreshAll();
    } catch (e) {
      setErr(e?.message || 'Gagal menyimpan transaksi. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    setPrintErr('');
    try {
      window.print();
    } catch {
      setPrintErr('Cetak tidak bisa dibuka di peramban ini.');
    }
  };

  const handleNewTransaction = () => {
    setLocalReceipt(null);
    setPrintErr('');
    if (onClearExternalReceipt) onClearExternalReceipt();
  };

  if (activeReceipt) {
    return (
      <div className="card">
        <h2>{externalReceipt ? 'Cetak Ulang Nota' : 'Pembayaran berhasil ✓'}</h2>
        <p className="mu">Pratinjau nota (kertas 58mm). Tekan Cetak nota untuk mencetak.</p>
        <Receipt58mm trx={activeReceipt} />
        <div className="two">
          <button className="p" onClick={handlePrint}>
            Cetak nota
          </button>
          <button onClick={handleNewTransaction}>
            {externalReceipt ? 'Kembali ke Kasir' : 'Transaksi baru'}
          </button>
        </div>
        {printErr && <div className="err">{printErr}</div>}
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="card">
        <p className="mu">
          Belum ada layanan.{' '}
          {me.role === 'owner' ? 'Tambahkan di tab Layanan.' : 'Minta Owner menambahkan layanan.'}
        </p>
      </div>
    );
  }

  const pickedBooking = bookings.find((b) => b.id === bkId);

  return (
    <>
      {!isServiceOpen && (
        <div className="card">
          <p className="err" style={{ margin: 0 }}>
            Service belum dibuka. Tekan <b>Open Service</b> di kanan atas untuk memulai transaksi.
          </p>
        </div>
      )}

      <div className="card">
        <h2>Jenis pelanggan</h2>
        <div className="two" style={{ marginBottom: 10 }}>
          <button type="button" className={ptype === 'regular' ? 'on' : ''} onClick={() => handleSelectPtype('regular')}>
            Regular
          </button>
          <button type="button" className={ptype === 'reservasi' ? 'on' : ''} onClick={() => handleSelectPtype('reservasi')}>
            Reservasi
          </button>
        </div>
        {ptype === 'reservasi' ? (
          activeBookings.length ? (
            <div className="booking-picker">
              <label htmlFor="cashier-booking">Pilih reservasi</label>
              <div className="booking-options" role="listbox" aria-label="Daftar reservasi aktif">
                {activeBookings.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    role="option"
                    aria-selected={bkId === b.id}
                    className={`booking-option ${bkId === b.id ? 'selected' : ''}`}
                    onClick={() => handlePickBooking(b.id)}
                  >
                    <span className="booking-option-time">{b.jam}</span>
                    <span className="booking-option-info">
                      <strong>{b.nama}</strong>
                      <span>{b.tanggal} · {b.svc_nama}</span>
                    </span>
                    <span className={`booking-option-status ${me.role === 'capster' && b.kap_id !== me.id ? 'booking-warning' : ''}`}>
                      {me.role === 'capster' && b.kap_id !== me.id ? <><span className="warning-icon" aria-hidden="true">!</span>Bukan untuk Anda</> : bkId === b.id ? 'Dipilih' : 'Pilih'}
                    </span>
                  </button>
                ))}
              </div>
              {pickedBooking && me.role === 'capster' && pickedBooking.kap_id !== me.id ? (
                <p className="booking-warning-message"><span className="warning-icon" aria-hidden="true">!</span>Reservasi ini ditujukan untuk {pickedBooking.kap_nama || 'capster lain'}. Pastikan pergantian capster sudah disetujui.</p>
              ) : !pickedBooking ? <p className="booking-picker-hint">Pilih reservasi untuk mengisi pelanggan dan layanan secara otomatis.</p> : null}
            </div>
          ) : <p className="mu">Belum ada reservasi aktif.</p>
        ) : null}
      </div>

      <div className={`card service-picker ${ptype === 'reservasi' && !bkId ? 'service-picker-locked' : ''}`}>
        <h2>{ptype === 'reservasi' ? 'Tambah layanan' : 'Pilih layanan'}</h2>
        {ptype === 'reservasi' && !bkId && <p className="booking-picker-hint">Pilih reservasi terlebih dahulu untuk membuka layanan.</p>}
        {KATS.map((kat) => {
          const list = services.filter((v) => (v.kat || 'Hair Cut') === kat);
          if (!list.length) return null;
          return (
            <React.Fragment key={kat}>
              <div className="mu" style={{ margin: '10px 0 6px' }}>
                {kat}
              </div>
              <div className="grid">
                {list.map((v) => (
                  <button key={v.id} className="svc" disabled={ptype === 'reservasi' && !bkId} onClick={() => addItem(v.id)}>
                    <b>{v.nama}</b>
                    <span>{rp(v.harga)}</span>
                  </button>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="card">
        <h2>Keranjang</h2>
        <p className="mu">Jumlah orang: {hairCutCount}</p>
        {cartEntries.length ? (
          cartEntries.map(({ svc, qty }) => (
            <div key={svc.id} className="row">
              <span>
                {svc.nama}
                <br />
                <span className="mu">{rp(svc.harga)}</span>
              </span>
              <span className="q">
                <button onClick={() => changeQty(svc.id, -1)}>−</button>
                {qty}
                <button onClick={() => changeQty(svc.id, 1)}>+</button>
              </span>
            </div>
          ))
        ) : (
          <p className="mu">Belum ada pilihan.</p>
        )}

        <label>Promo</label>
        <select value={promoId} onChange={(e) => setPromoId(e.target.value)}>
          <option value="">Tanpa promo</option>
          {promos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama} — {p.tipe === 'persen' ? `${p.nilai}%` : rp(p.nilai)}
            </option>
          ))}
        </select>

        {diskon > 0 && (
          <>
            <div className="row">
              <span>Subtotal</span>
              <span>{rp(subtotal)}</span>
            </div>
            <div className="row">
              <span>Potongan ({selectedPromo?.nama})</span>
              <span>−{rp(diskon)}</span>
            </div>
          </>
        )}

        <div className="row">
          <b>Total</b>
          <span className="tot">{rp(total)}</span>
        </div>

        {me.role === 'capster' ? (
          <div className="row">
            <span>Dilayani Capster</span>
            <b>{me.name}</b>
          </div>
        ) : (
          <>
            <label>Dilayani Capster</label>
            {ptype === 'reservasi' && pickedBooking && <p className="booking-picker-hint">Default reservasi: {pickedBooking.kap_nama || 'belum ditentukan'}. Anda dapat menggantinya.</p>}
            <select value={capsterId} onChange={(e) => setCapsterId(e.target.value)}>
              <option value="">Pilih capster</option>
              {capsters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label>Metode bayar *</label>
        <div className="two" style={{ marginBottom: 10 }}>
          {['Tunai', 'QRIS'].map((m) => (
            <button
              key={m}
              className={metode === m ? 'on' : ''}
              onClick={() => setMetode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {subtotal > 0 && total === 0 ? (
          <p className="mu">
            Total Rp 0 karena promo, tidak ada yang perlu dibayar. Nota tetap bisa dicetak.
          </p>
        ) : metode === 'Tunai' ? (
          <>
            <label>Uang diterima *</label>
            <input
              inputMode="numeric"
              value={bayar}
              onChange={(e) => setBayar(e.target.value.replace(/\D/g, ''))}
            />
            {bayarNum >= total && total > 0 && (
              <div className="mu">Kembalian: {rp(bayarNum - total)}</div>
            )}
            <button style={{ margin: '6px 0' }} onClick={() => setBayar(String(total))}>
              Uang pas
            </button>
          </>
        ) : (
          <p className="mu">Pastikan pembayaran QRIS sudah masuk sebelum menekan Bayar.</p>
        )}

        {err && <div className="err">{err}</div>}
        <button
          className="p"
          style={{ width: '100%', marginTop: 6 }}
          disabled={!subtotal || !isServiceOpen || saving}
          onClick={handlePay}
        >
          {saving ? 'Menyimpan...' : `Bayar ${subtotal ? rp(total) : ''}`}
        </button>
      </div>
    </>
  );
}