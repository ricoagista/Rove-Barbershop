import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp, ld, downloadCsv } from '../utils/format';

export default function ReservationPage() {
  const { bookings, refreshAll } = useApp();
  const [filterDate, setFilterDate] = useState(ld());
  const [exportErr, setExportErr] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => !filterDate || b.tanggal === filterDate)
      .sort((a, b) => `${a.tanggal}${a.jam}`.localeCompare(`${b.tanggal}${b.jam}`));
  }, [bookings, filterDate]);

  const handleUpdateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await supabase.from('bookings').update({ status }).eq('id', id);
      await refreshAll();
    } finally {
      setUpdatingId('');
    }
  };

  const handleExportCsv = () => {
    setExportErr('');
    const rows = [
      ['No', 'Tanggal', 'Jam', 'Pelanggan', 'WA', 'Layanan', 'Harga', 'Capster', 'Status'],
      ...filteredBookings.map((b) => [
        b.nomor,
        b.tanggal,
        b.jam,
        b.nama,
        b.wa,
        b.svc_nama,
        b.harga,
        b.kap_nama,
        b.status,
      ]),
    ];
    const ok = downloadCsv(`reservasi${filterDate ? '-' + filterDate : ''}.csv`, rows);
    if (!ok) setExportErr('Unduhan tidak tersedia atau dibatalkan.');
  };

  return (
    <>
      <div className="card">
        <label>Tanggal</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterDate('')}>Tampilkan semua</button>
          <button onClick={handleExportCsv}>Export CSV</button>
        </div>
        {exportErr && <div className="err">{exportErr}</div>}
        <p className="mu">{filteredBookings.length} reservasi</p>
      </div>

      <div className="card scroll">
        <h2>Tabel reservasi</h2>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Jam</th>
              <th>Pelanggan</th>
              <th>WA</th>
              <th>Layanan</th>
              <th>Harga</th>
              <th>Capster</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length ? (
              filteredBookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.nomor}</td>
                  <td>{b.tanggal}</td>
                  <td>{b.jam}</td>
                  <td>{b.nama}</td>
                  <td>
                    <a
                      style={{ color: 'var(--ac)' }}
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://wa.me/${b.wa}`}
                    >
                      {b.wa}
                    </a>
                  </td>
                  <td>{b.svc_nama}</td>
                  <td>{rp(b.harga)}</td>
                  <td>{b.kap_nama}</td>
                  <td>{b.status}</td>
                  <td>
                    <button
                      style={{ padding: '4px 10px' }}
                      disabled={updatingId === b.id}
                      onClick={() => handleUpdateStatus(b.id, 'Hadir')}
                    >
                      Hadir
                    </button>{' '}
                    <button
                      className="d"
                      style={{ padding: '4px 10px' }}
                      disabled={updatingId === b.id}
                      onClick={() => handleUpdateStatus(b.id, 'Batal')}
                    >
                      Batal
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="mu">
                  Belum ada reservasi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}