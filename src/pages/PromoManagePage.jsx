import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp } from '../utils/format';

export default function PromoManagePage() {
  const { promos, refreshAll } = useApp();

  const [nama, setNama] = useState('');
  const [tipe, setTipe] = useState('persen'); // 'persen' | 'rupiah'
  const [nilai, setNilai] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    const cleanName = nama.trim();
    const numNilai = Number(nilai) || 0;

    if (!cleanName || numNilai <= 0) {
      return setErr('Nama promo dan nilai potongan wajib diisi.');
    }
    if (tipe === 'persen' && numNilai > 100) {
      return setErr('Diskon persen maksimal 100%.');
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('promos').insert({
        nama: cleanName,
        tipe,
        nilai: numNilai,
      });
      if (error) throw error;
      setNama('');
      setNilai('');
      await refreshAll();
    } catch (ex) {
      setErr(ex?.message || 'Gagal menyimpan promo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus promo ini?')) return;
    const { error } = await supabase.from('promos').delete().eq('id', id);
    if (error) return setErr(error.message);
    await refreshAll();
  };

  return (
    <>
      <div className="card">
        <h2>Tambah Promo</h2>
        <form onSubmit={handleSave}>
          <label>Nama Promo</label>
          <input
            placeholder="Contoh: Diskon Opening / Member RVB"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />

          <div className="two">
            <div>
              <label>Jenis Potongan</label>
              <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
                <option value="persen">Persen (%)</option>
                <option value="rupiah">Nominal (Rp)</option>
              </select>
            </div>
            <div>
              <label>{tipe === 'persen' ? 'Nilai (%)' : 'Nominal (Rp)'}</label>
              <input
                inputMode="numeric"
                placeholder={tipe === 'persen' ? '10' : '15000'}
                value={nilai}
                onChange={(e) => setNilai(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          {err && <div className="err">{err}</div>}
          <button type="submit" className="p" style={{ width: '100%' }} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Tambah Promo'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Daftar Promo ({promos.length})</h2>
        {promos.length ? (
          promos.map((p) => (
            <div key={p.id} className="row">
              <span>
                <b>{p.nama}</b>
                <br />
                <span className="mu">
                  Potongan: {p.tipe === 'persen' ? `${p.nilai}%` : rp(p.nilai)}
                </span>
              </span>
              <button
                className="d"
                style={{ padding: '4px 10px' }}
                onClick={() => handleDelete(p.id)}
              >
                Hapus
              </button>
            </div>
          ))
        ) : (
          <p className="mu">Belum ada promo aktif.</p>
        )}
      </div>
    </>
  );
}