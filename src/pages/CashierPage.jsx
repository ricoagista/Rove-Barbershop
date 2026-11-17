import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp, dstr, normWa } from '../utils/format';
import { KATS } from '../utils/defaults';
import Receipt58mm from '../components/Receipt58mm';

export default function CashierPage({ externalReceipt, onClearExternalReceipt }) {
  const {
    me,
    services,
    promos,
    bookings,
    sales,
    capsters,
    isServiceOpen,
    refreshAll,
  } = useApp();

  const [cart, setCart] = useState({});
  const [promoId, setPromoId] = useState('');
  const [capsterId, setCapsterId] = useState('');
  const [ptype, setPtype] = useState('baru'); // 'baru' | 'lama' | 'reservasi'
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

  // Daftar pelanggan unik dari riwayat transaksi untuk opsi Pelanggan Lama
  const pastCustomers = useMemo(() => {
    const map = {};
    [...sales]
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .forEach((s) => {
        if (s.wa) {
          map[s.wa] = { nama: s.pelanggan || '', wa: s.wa };
        }
      });
    return Object.values(map).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [sales]);

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
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setErr('');
  };

  const changeQty = (id, delta) => {
    setCart((prev) => {
      const next = { ...prev };
      const val = (next[id] || 0) + delta;
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
    setErr('');
  };

  const handlePickPastCustomer = (waVal) => {
    const found = pastCustomers.find((c) => c.wa === waVal);
    setCustName(found ? found.nama : '');
    setCustWa(found ? found.wa : '');
  };

  const handlePickBooking = (id) => {
    setBkId(id);
    setErr('');
    const bk = bookings.find((b) => b.id === id);
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

    const activeCap =
      me.role === 'capster'
        ? { id: me.id, name: me.name }
        : capsters.find((c) => c.id === capsterId) || null;

    if (!activeCap) {
      return setErr('Pilih capster yang melayani.');
    }
    if (!custName.trim()) {
      return setErr(
        ptype === 'lama'
          ? 'Pilih pelanggan terlebih dulu.'
          : ptype === 'reservasi'
          ? 'Pilih reservasi terlebih dulu.'
          : 'Nama pelanggan wajib diisi.'
      );
    }
    if (!custWa.trim()) {
      return setErr('Kontak WhatsApp wajib diisi.');
    }
    const cleanWa = normWa(custWa);
    if (!cleanWa) {
      return setErr('Nomor WhatsApp tidak valid. Contoh: 081234567890.');
    }
    if (metode === 'Tunai' && bayarNum < total) {
      return setErr('Uang diterima kurang dari total.');
    }

    setSaving(true);
    try {
      const now = new Date();
      const todayWib = dstr(now);
      const countToday = sales.filter((s) => dstr(s.ts) === todayWib).length + 1;
      const wibDate = new Date(now.getTime() + 7 * 3600000);
      const yy = String(wibDate.getUTCFullYear()).slice(2);
      const mm = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(wibDate.getUTCDate()).padStart(2, '0');
      const nomor = `RV-${yy}${mm}${dd}-${String(countToday).padStart(3, '0')}`;

      const itemsPayload = cartEntries.map(({ svc, qty }) => ({
        nama: svc.nama,
        harga: svc.harga,
        qty,
        kat: svc.kat || 'Hair Cut',
      }));

      const payload = {
        nomor,
        ts: now.toISOString(),
        kasir_id: me.id,
        kasir_nama: me.name,
        capster_id: activeCap.id,
        capster_nama: activeCap.name,
        jenis: ptype,
        booking_id: ptype === 'reservasi' && bkId ? bkId : null,
        items: itemsPayload,
        subtotal,
        diskon,
        promo: diskon > 0 && selectedPromo ? selectedPromo.nama : '',
        total,
        metode,
        pelanggan: custName.trim(),
        wa: cleanWa,
        diterima: metode === 'Tunai' ? bayarNum : total,
        kembali: metode === 'Tunai' ? bayarNum - total : 0,
      };

      const { data, error } = await supabase.from('sales').insert(payload).select().single();
      if (error) throw error;

      if (payload.booking_id) {
        await supabase.from('bookings').update({ status: 'Selesai' }).eq('id', payload.booking_id);
      }

      setLocalReceipt(data || payload);
      setCart({});
      setBayar('');
      setCustName('');
      setCustWa('');
      setPromoId('');
      setPtype('baru');
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
        <h2>Pilih layanan</h2>
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
                  <button key={v.id} className="svc" onClick={() => addItem(v.id)}>
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
            <label>Dilayani Capster *</label>
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

        <label>Jenis pelanggan *</label>
        <div className="two" style={{ marginBottom: 10 }}>
          <button
            className={ptype === 'baru' ? 'on' : ''}
            onClick={() => handleSelectPtype('baru')}
          >
            Pelanggan baru
          </button>
          <button
            className={ptype === 'lama' ? 'on' : ''}
            onClick={() => handleSelectPtype('lama')}
          >
            Pelanggan lama
          </button>
          <button
            className={ptype === 'reservasi' ? 'on' : ''}
            style={{ gridColumn: '1 / -1' }}
            onClick={() => handleSelectPtype('reservasi')}
          >
            Pelanggan Reservasi
          </button>
        </div>

        {ptype === 'lama' ? (
          pastCustomers.length ? (
            <>
              <label>Pilih pelanggan *</label>
              <select value={custWa} onChange={(e) => handlePickPastCustomer(e.target.value)}>
                <option value="">Pilih pelanggan…</option>
                {pastCustomers.map((c) => (
                  <option key={c.wa} value={c.wa}>
                    {c.nama} — {c.wa}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="mu">Belum ada pelanggan tersimpan. Gunakan Pelanggan baru dulu.</p>
          )
        ) : ptype === 'reservasi' ? (
          activeBookings.length ? (
            <>
              <label>Pilih reservasi *</label>
              <select value={bkId} onChange={(e) => handlePickBooking(e.target.value)}>
                <option value="">Pilih reservasi…</option>
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.tanggal} {b.jam} · {b.nama} · {b.svc_nama}
                  </option>
                ))}
              </select>
              {pickedBooking && (
                <p className="mu">
                  {pickedBooking.nama} · {pickedBooking.wa} · Capster {pickedBooking.kap_nama}
                </p>
              )}
            </>
          ) : (
            <p className="mu">Belum ada reservasi aktif.</p>
          )
        ) : (
          <>
            <label>Nama pelanggan *</label>
            <input
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              autoComplete="off"
            />
            <label>Kontak WhatsApp * (contoh 081234567890)</label>
            <input
              type="tel"
              inputMode="tel"
              value={custWa}
              onChange={(e) => setCustWa(e.target.value)}
              autoComplete="off"
            />
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