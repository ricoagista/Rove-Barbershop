import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp, ld, tstr } from '../utils/format';
import { processExpenseImage } from '../utils/media';

export default function ExpensePage() {
  const { me, expenses, isServiceOpen, refreshAll } = useApp();
  const isOwner = me?.role === 'owner';

  const [kategori, setKategori] = useState('Barang');
  const [nama, setNama] = useState('');
  const [biaya, setBiaya] = useState('');
  const [tanggal, setTanggal] = useState(ld());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [bukti, setBukti] = useState('');

  const [filterDate, setFilterDate] = useState(ld());

  const kategoriList = isOwner ? ['Barang', 'Jasa', 'Gaji'] : ['Barang', 'Jasa'];

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => (isOwner || e.kategori !== 'Gaji') && (!filterDate || e.tanggal === filterDate))
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [expenses, filterDate, isOwner]);

  const totalBiaya = filteredExpenses.reduce((sum, e) => sum + e.biaya, 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    if (!isServiceOpen) {
      return setErr('Tekan Open Service dulu untuk mencatat pengeluaran.');
    }
    const cleanName = nama.trim();
    const numBiaya = Number(biaya) || 0;
    if (!cleanName || numBiaya <= 0) {
      return setErr('Isi nama keperluan dan nominal biaya dengan benar.');
    }
    if (!tanggal) {
      return setErr('Pilih tanggal pengeluaran.');
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        ts: new Date().toISOString(),
        tanggal,
        kategori,
        nama: cleanName,
        biaya: numBiaya,
        oleh_id: me.id,
        oleh_nama: me.name,
        bukti_url: bukti || null,
      });
      if (error) throw error;
      setNama('');
      setBiaya('');
      setBukti('');
      await refreshAll();
    } catch (ex) {
      setErr(ex?.message || 'Gagal menyimpan pengeluaran.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isOwner) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) return setErr(error.message);
    await refreshAll();
  };

  return (
    <>
      {!isServiceOpen && (
        <div className="card">
          <p className="err" style={{ margin: 0 }}>
            Service belum dibuka. Tekan <b>Open Service</b> di kanan atas untuk mencatat pengeluaran.
          </p>
        </div>
      )}

      <div className="card">
        <h2>Catat pengeluaran</h2>
        <form onSubmit={handleSave}>
          <label>Kategori</label>
          <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
            {kategoriList.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <label>Nama keperluan</label>
          <input
            type="text"
            placeholder="Contoh: Beli pomade / Token listrik"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />

          <div className="two">
            <div>
              <label>Biaya (Rp)</label>
              <input
                inputMode="numeric"
                placeholder="0"
                value={biaya}
                onChange={(e) => setBiaya(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label>Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
          </div>

          <label htmlFor="expense-proof">Bukti pengeluaran (opsional)</label>
          <input
            id="expense-proof"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              try {
                setErr('');
                setBukti(e.target.files?.[0] ? await processExpenseImage(e.target.files[0]) : '');
              } catch {
                setBukti('');
                setErr('Foto bukti tidak dapat diproses.');
              }
            }}
          />
          {bukti && <img className="expense-proof-preview" src={bukti} alt="Pratinjau bukti pengeluaran" />}

          {err && <div className="err">{err}</div>}
          <button
            type="submit"
            className="p"
            style={{ width: '100%' }}
            disabled={!isServiceOpen || saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan pengeluaran'}
          </button>
        </form>
      </div>

      <div className="card">
        <label>Filter tanggal</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <button onClick={() => setFilterDate('')}>Tampilkan semua</button>
        <div className="row" style={{ marginTop: 10 }}>
          <span>Total pengeluaran ({filteredExpenses.length} item)</span>
          <b className="tot">{rp(totalBiaya)}</b>
        </div>
      </div>

      <div className="card scroll">
        <h2>Daftar pengeluaran</h2>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Waktu Input</th>
              <th>Kategori</th>
              <th>Keperluan</th>
              <th>Biaya</th>
              <th>Oleh</th>
              <th>Bukti</th>
              {isOwner && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length ? (
              filteredExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.tanggal}</td>
                  <td>{tstr(e.ts)}</td>
                  <td>{e.kategori}</td>
                  <td>{e.nama}</td>
                  <td>{rp(e.biaya)}</td>
                  <td>{e.oleh_nama}</td>
                  <td>{e.bukti_url ? <a href={e.bukti_url} target="_blank" rel="noreferrer">Lihat bukti</a> : '-'}</td>
                  {isOwner && (
                    <td>
                      <button
                        className="d"
                        style={{ padding: '4px 10px' }}
                        onClick={() => handleDelete(e.id)}
                      >
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isOwner ? 8 : 7} className="mu">
                  Belum ada catatan pengeluaran.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}