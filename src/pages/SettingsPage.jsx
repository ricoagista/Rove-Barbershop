import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { processLogoUpload, processNotaImage } from '../utils/media';
import { DEF_POL, DEF_KONTAK } from '../utils/defaults';

export default function SettingsPage() {
  const { settings, brand, setPreviewTheme, refreshAll } = useApp();
  const [subTab, setSubTab] = useState('utama'); // 'utama' | 'kontak' | 'nota'

  // State Pengaturan Utama
  const dUtama = settings.utama || {};
  const [nama, setNama] = useState(dUtama.nama || 'Rove Barbershop');
  const [jargon, setJargon] = useState(
    dUtama.jargon == null ? 'Grooming Space in the Town' : dUtama.jargon
  );
  const [logo, setLogo] = useState(dUtama.logo || '');
  const [logoBw, setLogoBw] = useState(dUtama.logoBw || '');
  const [bg, setBg] = useState(dUtama.bg || '#05070f');
  const [ol, setOl] = useState(dUtama.ol || '#1b3bb5');
  const [tx, setTx] = useState(dUtama.tx || '#ffffff');
  const [pol, setPol] = useState(dUtama.pol == null ? DEF_POL.join('\n') : dUtama.pol);

  // State Pengaturan Kontak
  const dKontak = settings.kontak || DEF_KONTAK;
  const [wa, setWa] = useState(dKontak.wa || '');
  const [ig, setIg] = useState(dKontak.ig || '');
  const [tt, setTt] = useState(dKontak.tt || '');
  const [fb, setFb] = useState(dKontak.fb || '');
  const [email, setEmail] = useState(dKontak.email || '');
  const [maps, setMaps] = useState(dKontak.maps || '');

  // State Pengaturan Nota
  const dNota = settings.nota || {};
  const [msgBaru, setMsgBaru] = useState(
    dNota.msgBaru == null
      ? 'Sampaikan pengalaman baik Anda pada Kawan\nJika ada kurang puas info kami GARANASI 24 Jam'
      : dNota.msgBaru
  );
  const [msgLama, setMsgLama] = useState(
    dNota.msgLama == null ? 'Terimakasih Sudah Menjadi RVB Fams' : dNota.msgLama
  );
  const [notaImg, setNotaImg] = useState(dNota.img || '');

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Live preview perubahan warna tema
  useEffect(() => {
    setPreviewTheme({ bg, ol, tx });
    return () => setPreviewTheme(null);
  }, [bg, ol, tx, setPreviewTheme]);

  const handleLogoFile = async (file) => {
    if (!file) return;
    setErr('');
    try {
      const res = await processLogoUpload(file);
      setLogo(res.logo);
      setLogoBw(res.logoBw);
    } catch {
      setErr('Gagal memproses file logo.');
    }
  };

  const handleNotaImgFile = async (file) => {
    if (!file) return;
    setErr('');
    try {
      const bwDataUrl = await processNotaImage(file);
      setNotaImg(bwDataUrl);
    } catch {
      setErr('Gagal memproses gambar nota.');
    }
  };

  const saveSettingSection = async (id, data) => {
    setMsg('');
    setErr('');
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        id,
        data,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await refreshAll();
      setMsg('Pengaturan berhasil disimpan.');
    } catch (ex) {
      setErr(ex?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUtama = (e) => {
    e.preventDefault();
    saveSettingSection('utama', {
      nama: nama.trim() || 'Rove Barbershop',
      jargon: jargon.trim(),
      logo,
      logoBw,
      bg,
      ol,
      tx,
      pol,
    });
  };

  const handleResetWarna = () => {
    setBg('#05070f');
    setOl('#1b3bb5');
    setTx('#ffffff');
  };

  const handleSaveKontak = (e) => {
    e.preventDefault();
    saveSettingSection('kontak', {
      wa: wa.trim(),
      ig: ig.trim(),
      tt: tt.trim(),
      fb: fb.trim(),
      email: email.trim(),
      maps: maps.trim(),
    });
  };

  const handleSaveNota = (e) => {
    e.preventDefault();
    saveSettingSection('nota', {
      msgBaru,
      msgLama,
      img: notaImg,
    });
  };

  return (
    <>
      <div className="tabs">
        {[
          ['utama', 'Tampilan & Kebijakan'],
          ['kontak', 'Contact Us'],
          ['nota', 'Nota Thermal'],
        ].map(([k, lbl]) => (
          <button
            key={k}
            className={subTab === k ? 'on' : ''}
            onClick={() => {
              setSubTab(k);
              setMsg('');
              setErr('');
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {subTab === 'utama' && (
        <div className="card">
          <h2>Identitas, Warna Tema &amp; Kebijakan</h2>
          <form onSubmit={handleSaveUtama}>
            <label>Nama Barbershop</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} />

            <label>Jargon / Tagline</label>
            <input value={jargon} onChange={(e) => setJargon(e.target.value)} />

            <label>Upload Logo (Otomatis dikonversi ke warna &amp; hitam-putih nota)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
            />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <img
                src={logo || brand.logo}
                alt="Logo Warna"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
              />
              <img
                src={logoBw || brand.logoBw}
                alt="Logo Nota"
                style={{ width: 64, height: 64, background: '#fff', padding: 4, borderRadius: 8 }}
              />
              {logo && (
                <button
                  type="button"
                  className="d"
                  onClick={() => {
                    setLogo('');
                    setLogoBw('');
                  }}
                >
                  Reset Logo Bawaan
                </button>
              )}
            </div>

            <div className="mu" style={{ marginTop: 10 }}>
              Tema Warna Aplikasi (Live Preview)
            </div>
            <div className="crow">
              <input
                type="color"
                className="cc"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
              />
              <span>Warna Latar Belakang ({bg})</span>
            </div>
            <div className="crow">
              <input
                type="color"
                className="cc"
                value={ol}
                onChange={(e) => setOl(e.target.value)}
              />
              <span>Warna Garis / Outline ({ol})</span>
            </div>
            <div className="crow">
              <input
                type="color"
                className="cc"
                value={tx}
                onChange={(e) => setTx(e.target.value)}
              />
              <span>Warna Teks Utama ({tx})</span>
            </div>
            <button type="button" style={{ marginBottom: 12 }} onClick={handleResetWarna}>
              Reset Warna Default
            </button>

            <label>Booking Policy (1 baris = 1 poin aturan)</label>
            <textarea
              rows={4}
              value={pol}
              onChange={(e) => setPol(e.target.value)}
            />

            {err && <div className="err">{err}</div>}
            {msg && <p style={{ color: '#6ee7b7', fontSize: 14 }}>{msg}</p>}
            <button type="submit" className="p" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Utama'}
            </button>
          </form>
        </div>
      )}

      {subTab === 'kontak' && (
        <div className="card">
          <h2>Pengaturan Contact Us</h2>
          <form onSubmit={handleSaveKontak}>
            <label>Nomor WhatsApp / Hotline</label>
            <input
              placeholder="087753321188"
              value={wa}
              onChange={(e) => setWa(e.target.value)}
            />

            <label>Instagram (Username atau URL)</label>
            <input
              placeholder="rove_barbershop"
              value={ig}
              onChange={(e) => setIg(e.target.value)}
            />

            <label>TikTok (Username atau URL)</label>
            <input
              placeholder="rove_barbershop"
              value={tt}
              onChange={(e) => setTt(e.target.value)}
            />

            <label>Facebook (Username atau URL)</label>
            <input
              placeholder="rove.barbershop"
              value={fb}
              onChange={(e) => setFb(e.target.value)}
            />

            <label>Email Laporan &amp; Kontak</label>
            <input
              type="email"
              placeholder="rvbpng@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Link Google Maps</label>
            <input
              placeholder="https://maps.app.goo.gl/..."
              value={maps}
              onChange={(e) => setMaps(e.target.value)}
            />

            {err && <div className="err">{err}</div>}
            {msg && <p style={{ color: '#6ee7b7', fontSize: 14 }}>{msg}</p>}
            <button type="submit" className="p" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Kontak'}
            </button>
          </form>
        </div>
      )}

      {subTab === 'nota' && (
        <div className="card">
          <h2>Kustomisasi Nota Thermal 58mm</h2>
          <form onSubmit={handleSaveNota}>
            <label>Pesan Penutup — Pelanggan Baru &amp; Reservasi</label>
            <textarea
              rows={3}
              value={msgBaru}
              onChange={(e) => setMsgBaru(e.target.value)}
            />

            <label>Pesan Penutup — Pelanggan Lama</label>
            <textarea
              rows={2}
              value={msgLama}
              onChange={(e) => setMsgLama(e.target.value)}
            />

            <label>Gambar / QR Promo Bawah Nota (Otomatis Dithering Hitam-Putih)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleNotaImgFile(e.target.files?.[0])}
            />
            {notaImg && (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={notaImg}
                  alt="Preview Nota"
                  style={{
                    maxWidth: 180,
                    display: 'block',
                    background: '#fff',
                    padding: 4,
                    marginBottom: 6,
                  }}
                />
                <button type="button" className="d" onClick={() => setNotaImg('')}>
                  Hapus Gambar Nota
                </button>
              </div>
            )}

            {err && <div className="err">{err}</div>}
            {msg && <p style={{ color: '#6ee7b7', fontSize: 14 }}>{msg}</p>}
            <button type="submit" className="p" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Nota'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}