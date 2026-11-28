import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { roleName, normWa } from '../utils/format';
import { processSquareAvatar } from '../utils/media';
import { supabase } from '../lib/supabase';

export default function ProfilePage() {
  const { me, isServiceOpen, openService, closeService, logout, refreshAll } = useApp();
  const [confirmClose, setConfirmClose] = useState(false);
  const [form, setForm] = useState({ name: me?.name || '', wa: me?.wa || '', photo_url: me?.photo_url || '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirmClose) return undefined;
    const timer = setTimeout(() => setConfirmClose(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmClose]);

  useEffect(() => {
    setForm({ name: me?.name || '', wa: me?.wa || '', photo_url: me?.photo_url || '' });
  }, [me]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    try {
      const photo_url = await processSquareAvatar(file, 320, 0.82);
      setForm((current) => ({ ...current, photo_url }));
      setError('');
    } catch (ex) { setError(ex?.message || 'Gagal mengompres foto.'); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError('Nama wajib diisi.');
    setSaving(true); setError(''); setMessage('');
    try {
      const { error: saveError } = await supabase.from('profiles').update({ name, wa: form.wa.trim() ? normWa(form.wa) || form.wa.trim() : '', photo_url: form.photo_url.trim() }).eq('id', me.id);
      if (saveError) throw saveError;
      await refreshAll();
      setMessage('Profil berhasil disimpan.');
    } catch (ex) { setError(ex?.message || 'Gagal menyimpan profil.'); }
    finally { setSaving(false); }
  };

  const handleShift = async () => {
    if (busy) return;
    if (isServiceOpen && !confirmClose) return setConfirmClose(true);
    setBusy(true);
    setConfirmClose(false);
    try {
      await (isServiceOpen ? closeService() : openService());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="card profile-card">
        <div className="profile-actions profile-shift-actions">
          <button className={isServiceOpen ? 'cl' : 'ok'} disabled={busy} onClick={handleShift}>
            {isServiceOpen ? (confirmClose ? 'Yakin Close?' : 'Close Service') : 'Open Service'}
          </button>
        </div>
        <h1>Profil Saya</h1>
        <div className="profile-identity">
          <b>{me.name}</b>
          <span>{roleName(me.role)} · @{me.username}</span>
        </div>
        {error && <p className="err">{error}</p>}
        {message && <p className="ok">{message}</p>}
        <form onSubmit={saveProfile}>
          <label>Nama lengkap<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} /></label>
          <label>Nomor WhatsApp<input value={form.wa} onChange={(e) => setForm({ ...form, wa: e.target.value })} inputMode="tel" maxLength={20} /></label>
          <label>Foto profil<input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files?.[0])} /></label>
          {form.photo_url && <img className="profile-avatar-preview" src={form.photo_url} alt="Pratinjau foto profil" />}
          <button className="p" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Profil'}</button>
        </form>
        <div className="profile-actions">
          <button type="button" onClick={logout}>Keluar</button>
        </div>
      </div>
    </div>
  );
}
