import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp, ld, downloadCsv } from '../utils/format';

export default function ReservationPage() {
  const { me, bookings, capsters, brand, refreshAll } = useApp();
  const [filterDate, setFilterDate] = useState(ld());
  const [closures, setClosures] = useState([]);
  const [closureDate, setClosureDate] = useState(ld());
  const [closureTime, setClosureTime] = useState('');
  const [closureKap, setClosureKap] = useState('');
  const [closureError, setClosureError] = useState('');
  const [exportErr, setExportErr] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const closureSlots = useMemo(() => { const toMin = (v) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; }; const open = toMin(brand.jamBuka); const last = Math.min(toMin(brand.batasReservasiTerakhir), toMin(brand.jamTutup) - 60); return Array.from({ length: Math.max(0, Math.floor((last - open) / 30) + 1) }, (_, i) => { const min = open + i * 30; return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; }); }, [brand.jamBuka, brand.jamTutup, brand.batasReservasiTerakhir]);
  useEffect(() => { if (closureSlots.length && !closureSlots.includes(closureTime)) setClosureTime(closureSlots[0]); }, [closureSlots, closureTime]);
  const [statusError, setStatusError] = useState('');

  const canClose = me?.role === 'owner' || me?.role === 'kasir';
  const filteredBookings = useMemo(() => bookings.filter((b) => !filterDate || b.tanggal === filterDate).sort((a, b) => `${a.tanggal}${a.jam}`.localeCompare(`${b.tanggal}${b.jam}`)), [bookings, filterDate]);
  const loadClosures = useCallback(async () => {
    if (!canClose) return;
    const { data, error } = await supabase.from('booking_slot_closures').select('*').eq('tanggal', closureDate).order('jam');
    if (error) setClosureError(error.message); else setClosures(data || []);
  }, [canClose, closureDate]);
  useEffect(() => { loadClosures(); }, [loadClosures]);

  const setClosure = async (closed, kapId, id) => {
    setClosureError('');
    if (closureDate < ld()) return setClosureError('Tanggal tutup slot tidak boleh sebelum hari ini.');
    const jam = id ? closures.find((c) => c.id === id)?.jam : closureTime;
    if (!jam) return setClosureError('Pilih jam slot.');
    if (closed && kapId) {
      const active = bookings.some((b) => b.tanggal === closureDate && b.jam === jam && b.kap_id === kapId && ['Baru', 'Hadir'].includes(b.status));
      if (active && !window.confirm('Slot ini sudah memiliki booking aktif. Tutup slot tanpa membatalkan booking?')) return;
    }
    const { error } = await supabase.rpc('set_booking_slot_closure', { p_tanggal: closureDate, p_jam: jam, p_kap_id: kapId, p_closed: closed });
    if (error) setClosureError(error.message); else { await loadClosures(); await refreshAll(); }
  };
  const handleUpdateStatus = async (id, status) => {
    setUpdatingId(id); setStatusError('');
    try { const { error } = await supabase.rpc('set_booking_status', { p_id: id, p_status: status }); if (error) throw error; await refreshAll(); } catch (e) { setStatusError(e.message); } finally { setUpdatingId(''); }
  };
  const handleExportCsv = () => {
    setExportErr('');
    const rows = [['No', 'Tanggal', 'Jam', 'Pelanggan', 'WA', 'Layanan', 'Harga', 'Jumlah orang', 'Capster', 'Status'], ...filteredBookings.map((b) => [b.nomor, b.tanggal, b.jam, b.nama, b.wa, b.svc_nama, b.harga, b.people_count || 1, b.kap_nama, b.status])];
    if (!downloadCsv(`reservasi${filterDate ? '-' + filterDate : ''}.csv`, rows)) setExportErr('Unduhan tidak tersedia atau dibatalkan.');
  };

  return <>
    <div className="card">
      <label>Tanggal</label><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button onClick={() => setFilterDate('')}>Tampilkan semua</button><button onClick={handleExportCsv}>Export CSV</button></div>
      {exportErr && <div className="err">{exportErr}</div>}<p className="mu">{filteredBookings.length} reservasi</p>
    </div>
    {canClose && <div className="card">
      <h2>Tutup slot</h2>
      <div className="two"><div><label>Tanggal</label><input type="date" min={ld()} value={closureDate} onChange={(e) => setClosureDate(e.target.value)} /></div><div><label>Jam</label><select value={closureTime} onChange={(e) => setClosureTime(e.target.value)}>{closureSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></div></div>
      <label>Capster</label><select value={closureKap} onChange={(e) => setClosureKap(e.target.value)}><option value="">Semua capster</option>{capsters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="p" onClick={() => setClosure(true, closureKap || null)}>Tutup slot</button>
      {closureError && <div className="err">{closureError}</div>}
      <h2 style={{ marginTop: 16 }}>Slot ditutup</h2>
      {closures.length ? closures.map((c) => <div className="row" key={c.id}><span>{c.jam} · {c.kap_id ? capsters.find((x) => x.id === c.kap_id)?.name || 'Capster' : 'Semua capster'}</span><button onClick={() => setClosure(false, c.kap_id, c.id)}>Buka</button></div>) : <p className="mu">Belum ada slot ditutup.</p>}
    </div>}
    {statusError && <div className="err">{statusError}</div>}
    <div className="card scroll"><h2>Tabel reservasi</h2><table><thead><tr><th>No</th><th>Tanggal</th><th>Jam</th><th>Pelanggan</th><th>WA</th><th>Layanan</th><th>Harga</th><th>Jumlah orang</th><th>Capster</th><th>Status</th><th /></tr></thead><tbody>{filteredBookings.length ? filteredBookings.map((b) => <tr key={b.id}><td>{b.nomor}</td><td>{b.tanggal}</td><td>{b.jam}</td><td>{b.nama}</td><td><a style={{ color: 'var(--accent-text)' }} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${b.wa}`}>{b.wa}</a></td><td>{b.svc_nama}</td><td>{rp(b.harga)}</td><td>{b.people_count || 1}</td><td>{b.kap_nama}</td><td>{b.status}</td><td>{me?.role !== 'capster' && !['Selesai', 'Batal'].includes(b.status) && <><button disabled={updatingId === b.id} onClick={() => handleUpdateStatus(b.id, 'Hadir')}>Hadir</button>{' '}<button className="d" disabled={updatingId === b.id} onClick={() => handleUpdateStatus(b.id, 'Batal')}>Batal</button></>}</td></tr>) : <tr><td colSpan={10} className="mu">Belum ada reservasi.</td></tr>}</tbody></table></div>
  </>;
}
