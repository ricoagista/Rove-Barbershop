import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
  rp,
  ld,
  dstr,
  tstr,
  rangeOf,
  inRange,
  downloadCsv,
  normWa,
} from '../utils/format';

export default function ReportPage({ onReprint }) {
  const { me, sales, expenses, services, capsters, brand, kontak, refreshAll } = useApp();

  const [per, setPer] = useState('harian'); // 'harian' | 'minggu' | 'bulan' | 'custom'
  const [refDate, setRefDate] = useState(ld());
  const [fromDate, setFromDate] = useState(ld());
  const [toDate, setToDate] = useState(ld());
  const [rangeErr, setRangeErr] = useState('');
  const [exportErr, setExportErr] = useState('');

  // State modal edit transaksi
  const [editingTrx, setEditingTrx] = useState(null);
  const [editCapId, setEditCapId] = useState('');
  const [editPelanggan, setEditPelanggan] = useState('');
  const [editWa, setEditWa] = useState('');
  const [editMetode, setEditMetode] = useState('Tunai');
  const [editItems, setEditItems] = useState([]);
  const [editTotal, setEditTotal] = useState('');
  const [editErr, setEditErr] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const activeRange = useMemo(() => {
    if (per === 'custom') {
      return fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
    }
    return rangeOf(per, refDate);
  }, [per, refDate, fromDate, toDate]);

  const handleCustomChange = (newFrom, newTo) => {
    setRangeErr('');
    const a = new Date(newFrom + 'T00:00:00Z').getTime();
    const b = new Date(newTo + 'T00:00:00Z').getTime();
    const diffDays = Math.abs(Math.round((b - a) / 86400000)) + 1;
    if (diffDays > 31) {
      setRangeErr('Rentang custom maksimal 31 hari.');
      return;
    }
    setFromDate(newFrom);
    setToDate(newTo);
  };

  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => inRange(dstr(s.ts), activeRange))
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [sales, activeRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => inRange(e.tanggal, activeRange));
  }, [expenses, activeRange]);

  const formatSaleItems = (items) => (Array.isArray(items) ? items : []).map((item) => {
    const service = services.find((s) => s.id === item.id || s.nama === item.nama);
    const nama = item.nama || service?.nama || 'Layanan tidak diketahui';
    const qty = Number(item.qty) || 0;
    return `${nama} (${qty})`;
  }).join(', ');

  const stats = useMemo(() => {
    let omset = 0;
    let tunai = 0;
    let qris = 0;
    let diskon = 0;
    const byCapster = {};

    filteredSales.forEach((s) => {
      omset += s.total;
      diskon += s.diskon || 0;
      if (s.metode === 'QRIS') qris += s.total;
      else tunai += s.total;

      const cname = s.capster_nama || 'Tanpa Capster';
      if (!byCapster[cname]) byCapster[cname] = { nama: cname, omset: 0, trx: 0 };
      byCapster[cname].omset += s.total;
      byCapster[cname].trx += 1;
    });

    const keluar = filteredExpenses.reduce((sum, e) => sum + e.biaya, 0);
    const bersih = omset - keluar;

    // Grafik batang harian dalam rentang tanggal aktif
    const days = [];
    let cur = new Date(activeRange[0] + 'T00:00:00Z').getTime();
    const end = new Date(activeRange[1] + 'T00:00:00Z').getTime();
    while (cur <= end && days.length < 31) {
      const ds = new Date(cur).toISOString().slice(0, 10);
      days.push({ date: ds, label: ds.slice(8, 10), tunai: 0, qris: 0, total: 0 });
      cur += 86400000;
    }

    filteredSales.forEach((s) => {
      const ds = dstr(s.ts);
      const found = days.find((d) => d.date === ds);
      if (found) {
        if (s.metode === 'QRIS') found.qris += s.total;
        else found.tunai += s.total;
        found.total += s.total;
      }
    });

    const maxDay = Math.max(1, ...days.map((d) => d.total));

    return {
      omset,
      tunai,
      qris,
      diskon,
      keluar,
      bersih,
      byCapster: Object.values(byCapster).sort((a, b) => b.omset - a.omset),
      days,
      maxDay,
    };
  }, [filteredSales, filteredExpenses, activeRange]);

  const openEdit = (s) => {
    setEditingTrx(s);
    setEditCapId(s.capster_id || '');
    setEditPelanggan(s.pelanggan || '');
    setEditWa(s.wa || '');
    setEditMetode(s.metode || 'Tunai');
    setEditItems((s.items || []).map((item) => ({ ...item })));
    setEditTotal(String(s.total || 0));
    setEditErr('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditErr('');
    if (!editPelanggan.trim()) return setEditErr('Nama pelanggan wajib diisi.');
    const cleanWa = normWa(editWa);
    if (!cleanWa) return setEditErr('Nomor WhatsApp tidak valid.');
    const items = editItems.filter((item) => item.qty > 0 && item.nama.trim());
    if (!items.length) return setEditErr('Pilih minimal satu layanan.');
    const subtotal = items.reduce((sum, item) => sum + Number(item.harga || 0) * Number(item.qty || 0), 0);
    const numTotal = Number(editTotal) || subtotal;
    const cap = capsters.find((c) => c.id === editCapId);

    setSavingEdit(true);
    try {
      const payload = {
        pelanggan: editPelanggan.trim(),
        wa: cleanWa,
        metode: editMetode,
        items,
        subtotal,
        total: numTotal,
        capster_id: cap ? cap.id : editingTrx.capster_id,
        capster_nama: cap ? cap.name : editingTrx.capster_nama,
        edit_ts: new Date().toISOString(),
        edit_oleh: me.name,
      };
      const { error } = await supabase
        .from('sales')
        .update(payload)
        .eq('id', editingTrx.id);
      if (error) throw error;
      setEditingTrx(null);
      await refreshAll();
    } catch (err) {
      setEditErr(err?.message || 'Gagal memperbarui transaksi.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSale = async (id) => {
    if (!window.confirm('Hapus transaksi ini secara permanen? Status reservasi terkait tidak otomatis dikembalikan dari "Selesai".')) return;
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) return setEditErr(error.message);
    await refreshAll();
  };

  const handleExportCsv = () => {
    setExportErr('');
    const rows = [
      [
        'No Nota',
        'Waktu',
        'Pelanggan',
        'WA',
        'Jenis',
        'Layanan',
        'Capster',
        'Kasir',
        'Subtotal',
        'Diskon',
        'Promo',
        'Total',
        'Metode',
      ],
      ...filteredSales.map((s) => [
        s.nomor,
        tstr(s.ts),
        s.pelanggan,
        s.wa,
        s.jenis === 'reservasi' ? 'Reservasi' : 'Regular',
        formatSaleItems(s.items).replaceAll(', ', '; '),
        s.capster_nama,
        s.kasir_nama,
        s.subtotal,
        s.diskon,
        s.promo,
        s.total,
        s.metode,
      ]),
    ];
    const ok = downloadCsv(`laporan-${activeRange[0]}-sd-${activeRange[1]}.csv`, rows);
    if (!ok) setExportErr('Unduhan CSV gagal.');
  };

  const mailtoBody = encodeURIComponent(
    `Laporan ${brand.nama}\nPeriode: ${activeRange[0]} s/d ${activeRange[1]}\n\n` +
      `Total Transaksi: ${filteredSales.length}\n` +
      `Omset Kotor: ${rp(stats.omset)}\n` +
      `- Tunai: ${rp(stats.tunai)}\n` +
      `- QRIS: ${rp(stats.qris)}\n` +
      `Total Pengeluaran: ${rp(stats.keluar)}\n` +
      `Laba Bersih: ${rp(stats.bersih)}\n`
  );

  return (
    <>
      <div className="card">
        <h2>Periode Laporan</h2>
        <div className="tabs" style={{ marginBottom: 8 }}>
          {[
            ['harian', 'Harian'],
            ['minggu', 'Mingguan'],
            ['bulan', 'Bulanan'],
            ['custom', 'Custom'],
          ].map(([k, lbl]) => (
            <button
              key={k}
              className={per === k ? 'on' : ''}
              onClick={() => {
                setPer(k);
                setRangeErr('');
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        {per === 'custom' ? (
          <div className="two">
            <div>
              <label>Dari Tanggal</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => handleCustomChange(e.target.value, toDate)}
              />
            </div>
            <div>
              <label>Sampai Tanggal</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => handleCustomChange(fromDate, e.target.value)}
              />
            </div>
          </div>
        ) : (
          <>
            <label>Pilih Tanggal Acuan</label>
            <input
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
            />
          </>
        )}

        {rangeErr && <div className="err">{rangeErr}</div>}
        <p className="mu">
          Menampilkan: <b>{activeRange[0]}</b> s/d <b>{activeRange[1]}</b>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleExportCsv}>Export CSV</button>
          {kontak.email && (
            <a
              className="cu"
              href={`mailto:${kontak.email}?subject=${encodeURIComponent(
                `Laporan ${brand.nama} (${activeRange[0]} - ${activeRange[1]})`
              )}&body=${mailtoBody}`}
            >
              Kirim ke Email
            </a>
          )}
        </div>
        {exportErr && <div className="err">{exportErr}</div>}
      </div>

      <div className="card">
        <h2>Ringkasan Keuangan</h2>
        <div className="row">
          <span>Jumlah Transaksi</span>
          <b>{filteredSales.length} transaksi</b>
        </div>
        <div className="row">
          <span>Omset Kotor</span>
          <b>{rp(stats.omset)}</b>
        </div>
        <div className="row">
          <span className="mu">• Pembayaran Tunai</span>
          <span>{rp(stats.tunai)}</span>
        </div>
        <div className="row">
          <span className="mu">• Pembayaran QRIS</span>
          <span>{rp(stats.qris)}</span>
        </div>
        {stats.diskon > 0 && (
          <div className="row">
            <span className="mu">• Total Diskon Promo</span>
            <span>−{rp(stats.diskon)}</span>
          </div>
        )}
        <div className="row">
          <span>Total Pengeluaran</span>
          <span style={{ color: 'var(--bad)' }}>−{rp(stats.keluar)}</span>
        </div>
        <div className="row">
          <b>Laba Bersih</b>
          <span className="tot">{rp(stats.bersih)}</span>
        </div>

        {stats.days.length > 1 && (
          <>
            <div className="mu" style={{ marginTop: 14 }}>
              Tren Harian (Biru: Tunai, Hijau: QRIS)
            </div>
            <div className="trend">
              {stats.days.map((d) => {
                const hTunai = Math.round((d.tunai / stats.maxDay) * 100);
                const hQris = Math.round((d.qris / stats.maxDay) * 100);
                return (
                  <div key={d.date} className="tc" title={`${d.date}: ${rp(d.total)}`}>
                    <div className="tb">
                      {hQris > 0 && <i style={{ height: `${hQris}%`, background: '#1f8f4e' }} />}
                      {hTunai > 0 && <i style={{ height: `${hTunai}%`, background: '#3b63f0' }} />}
                    </div>
                    <span>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {stats.byCapster.length > 0 && (
        <div className="card">
          <h2>Performa Capster</h2>
          {stats.byCapster.map((c) => {
            const pct = stats.omset > 0 ? Math.round((c.omset / stats.omset) * 100) : 0;
            return (
              <div key={c.nama} className="bar2">
                <span>{c.nama}</span>
                <div className="bt">
                  <i style={{ width: `${pct}%`, background: '#3b63f0' }} />
                </div>
                <b>
                  {rp(c.omset)} ({c.trx}x)
                </b>
              </div>
            );
          })}
        </div>
      )}

      {editingTrx && (
        <div className="card">
          <h2>Edit Transaksi ({editingTrx.nomor})</h2>
          <form onSubmit={handleSaveEdit}>
            <label>Layanan</label>
            {editItems.map((item, index) => (
              <div key={`${item.nama}-${index}`} className="row">
                <span>{item.nama}</span>
                <span className="q"><button type="button" onClick={() => setEditItems((prev) => prev.map((v, i) => i === index ? { ...v, qty: Math.max(0, Number(v.qty) - 1) } : v))}>−</button>{item.qty}<button type="button" onClick={() => setEditItems((prev) => prev.map((v, i) => i === index ? { ...v, qty: Number(v.qty) + 1 } : v))}>+</button></span>
              </div>
            ))}
            <select value="" onChange={(e) => { const svc = services.find((v) => v.id === e.target.value); if (svc) setEditItems((prev) => [...prev, { nama: svc.nama, harga: svc.harga, qty: 1, kat: svc.kat }]); }}>
              <option value="">Tambah layanan…</option>
              {services.map((svc) => <option key={svc.id} value={svc.id}>{svc.nama} — {rp(svc.harga)}</option>)}
            </select>
            <label>Pelanggan</label>
            <input
              value={editPelanggan}
              onChange={(e) => setEditPelanggan(e.target.value)}
            />
            <label>WhatsApp</label>
            <input value={editWa} onChange={(e) => setEditWa(e.target.value)} />
            <label>Capster</label>
            <select value={editCapId} onChange={(e) => setEditCapId(e.target.value)}>
              {capsters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="two">
              <div>
                <label>Metode Bayar</label>
                <select value={editMetode} onChange={(e) => setEditMetode(e.target.value)}>
                  <option value="Tunai">Tunai</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>
              <div>
                <label>Total (Rp)</label>
                <input
                  inputMode="numeric"
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
            {editErr && <div className="err">{editErr}</div>}
            <div className="two">
              <button type="submit" className="p" disabled={savingEdit}>
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button type="button" onClick={() => setEditingTrx(null)}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card scroll">
        <h2>Rincian Transaksi</h2>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Waktu</th>
              <th>Pelanggan</th>
              <th>Jenis</th>
              <th>Layanan</th>
              <th>Capster</th>
              <th>Metode</th>
              <th>Total</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length ? (
              filteredSales.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.nomor}
                    {s.edit_ts && <div className="mu">Diedit: {s.edit_oleh}</div>}
                  </td>
                  <td>{tstr(s.ts)}</td>
                  <td>{s.pelanggan}</td>
                  <td>{s.jenis === 'reservasi' ? 'Reservasi' : 'Regular'}</td>
                  <td>{formatSaleItems(s.items)}</td>
                  <td>{s.capster_nama}</td>
                  <td>{s.metode}</td>
                  <td>{rp(s.total)}</td>
                  <td>
                    <button
                      style={{ padding: '4px 10px' }}
                      onClick={() => onReprint && onReprint(s)}
                    >
                      Nota
                    </button>{' '}
                    <button
                      style={{ padding: '4px 10px' }}
                      onClick={() => openEdit(s)}
                    >
                      Edit
                    </button>{' '}
                    <button
                      className="d"
                      style={{ padding: '4px 10px' }}
                      onClick={() => handleDeleteSale(s.id)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="mu">
                  Belum ada transaksi pada periode ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}