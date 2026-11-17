import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { rp } from '../utils/format';
import { KATS } from '../utils/defaults';

export default function ServiceManagePage() {
  const { services, refreshAll } = useApp();

  const [editId, setEditId] = useState(null);
  const [nama, setNama] = useState('');
  const [harga, setHarga] = useState('');
  const [kat, setKat] = useState('Hair Cut');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setNama('');
    setHarga('');
    setKat('Hair Cut');
    setErr('');
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setNama(s.nama);
    setHarga(String(s.harga));
    setKat(s.kat || 'Hair Cut');
    setErr('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    const cleanName = nama.trim();
    const numHarga = Number(harga);
    if (!cleanName || Number.isNaN(numHarga) || numHarga < 0) {
      return setErr('Nama layanan dan harga wajib diisi dengan benar.');
    }

    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from('services')
          .update({ nama: cleanName, harga: numHarga, kat })
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('services')
          .insert({ nama: cleanName, harga: numHarga, kat });
        if (error) throw error;
      }
      resetForm();
      await refreshAll();
    } catch (ex) {
      setErr(ex?.message || 'Gagal menyimpan layanan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus layanan ini?')) return;
    await supabase.from('services').delete().eq('id', id);
    if (editId === id) resetForm();
    await refreshAll();
  };

  return (
    <>
      <div className="card">
        <h2>{editId ? 'Edit Layanan' : 'Tambah Layanan / Produk'}</h2>
        <form onSubmit={handleSave}>
          <label>Kategori</label>
          <select value={kat} onChange={(e) => setKat(e.target.value)}>
            {KATS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <label>Nama Layanan / Produk</label>
          <input
            placeholder="Contoh: Gentleman Cut / Pomade"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />

          <label>Harga (Rp)</label>
          <input
            inputMode="numeric"
            placeholder="35000"
            value={harga}
            onChange={(e) => setHarga(e.target.value.replace(/\D/g, ''))}
          />

          {err && <div className="err">{err}</div>}
          <div className="two">
            <button type="submit" className="p" disabled={saving}>
              {saving ? 'Menyimpan...' : editId ? 'Update Layanan' : 'Tambah Layanan'}
            </button>
            {editId && (
              <button type="button" onClick={resetForm}>
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Daftar Layanan &amp; Produk ({services.length})</h2>
        {KATS.map((k) => {
          const list = services.filter((s) => (s.kat || 'Hair Cut') === k);
          return (
            <div key={k} style={{ marginBottom: 14 }}>
              <div className="mu" style={{ marginBottom: 6 }}>
                {k} ({list.length})
              </div>
              {list.length ? (
                list.map((s) => (
                  <div key={s.id} className="row">
                    <span>
                      <b>{s.nama}</b>
                      <br />
                      <span className="mu">{rp(s.harga)}</span>
                    </span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button
                        style={{ padding: '4px 10px' }}
                        onClick={() => startEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        className="d"
                        style={{ padding: '4px 10px' }}
                        onClick={() => handleDelete(s.id)}
                      >
                        Hapus
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <p className="mu">Kosong.</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}