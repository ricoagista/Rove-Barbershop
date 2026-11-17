import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { rp, ld, dstr, tstr } from '../utils/format';

export default function StaffHistoryPage({ onReprint }) {
  const { me, sales } = useApp();
  const today = ld();
  const minDate = ld(new Date(Date.now() - 6 * 86400000));

  const [selectedDate, setSelectedDate] = useState(today);
  const [dateErr, setDateErr] = useState('');

  const handleDateChange = (val) => {
    setDateErr('');
    if (!val) return;
    if (val < minDate) {
      setDateErr('Staf hanya bisa melihat transaksi maksimal 7 hari terakhir.');
      setSelectedDate(minDate);
      return;
    }
    if (val > today) {
      setSelectedDate(today);
      return;
    }
    setSelectedDate(val);
  };

  // Transaksi pada tanggal terpilih (untuk capster difilter miliknya sendiri, untuk kasir semua transaksi hari itu)
  const daySales = useMemo(() => {
    return sales
      .filter((s) => {
        if (dstr(s.ts) !== selectedDate) return false;
        if (me.role === 'capster') return s.capster_id === me.id;
        return true;
      })
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [sales, selectedDate, me]);

  const totalDay = daySales.reduce((sum, s) => sum + s.total, 0);

  // Kalkulasi pencapaian target bulan ini
  const targetStats = useMemo(() => {
    const ym = today.slice(0, 7);
    let hc = 0;
    let ex = 0;
    let pr = 0;

    sales.forEach((s) => {
      if (!dstr(s.ts).startsWith(ym)) return;
      const matchUser =
        me.role === 'capster' ? s.capster_id === me.id : s.kasir_id === me.id;
      if (!matchUser) return;

      (s.items || []).forEach((it) => {
        const qty = Number(it.qty) || 1;
        if (it.kat === 'Extra Service') ex += qty;
        else if (it.kat === 'Produk') pr += qty;
        else hc += qty;
      });
    });

    return [
      { label: 'Hair Cut', cur: hc, target: Number(me.t_hc) || 0 },
      { label: 'Extra Service', cur: ex, target: Number(me.t_ex) || 0 },
      { label: 'Produk', cur: pr, target: Number(me.t_pr) || 0 },
    ].filter((x) => x.target > 0);
  }, [sales, today, me]);

  return (
    <>
      {targetStats.length > 0 && (
        <div className="card">
          <h2>Target Bulanan ({today.slice(0, 7)})</h2>
          {targetStats.map((t) => {
            const pct = Math.min(100, Math.round((t.cur / t.target) * 100));
            return (
              <div key={t.label} className="bar2">
                <span>{t.label}</span>
                <div className="bt">
                  <i
                    style={{
                      width: `${pct}%`,
                      background: pct >= 100 ? '#1f8f4e' : '#3b63f0',
                    }}
                  />
                </div>
                <b>
                  {t.cur}/{t.target} ({pct}%)
                </b>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <label>Pilih tanggal (maksimal 7 hari terakhir)</label>
        <input
          type="date"
          min={minDate}
          max={today}
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
        />
        {dateErr && <div className="err">{dateErr}</div>}
        <div className="row">
          <span>Total ({daySales.length} transaksi)</span>
          <b className="tot">{rp(totalDay)}</b>
        </div>
      </div>

      <div className="card scroll">
        <h2>Daftar transaksi</h2>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Waktu</th>
              <th>Pelanggan</th>
              <th>Layanan</th>
              <th>Capster</th>
              <th>Metode</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {daySales.length ? (
              daySales.map((s) => (
                <tr key={s.id}>
                  <td>{s.nomor}</td>
                  <td>{tstr(s.ts)}</td>
                  <td>{s.pelanggan}</td>
                  <td>
                    {(s.items || []).map((it) => `${it.nama} (${it.qty})`).join(', ')}
                  </td>
                  <td>{s.capster_nama}</td>
                  <td>{s.metode}</td>
                  <td>{rp(s.total)}</td>
                  <td>
                    <button
                      style={{ padding: '4px 10px' }}
                      onClick={() => onReprint && onReprint(s)}
                    >
                      Nota
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="mu">
                  Tidak ada transaksi pada tanggal ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}