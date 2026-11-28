import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { normWa } from '../utils/format';
import { processSquareAvatar } from '../utils/media';
import { supabase } from '../lib/supabase';

const ActionIcon = ({ type }) => {
  const paths = { save: 'M5 4h12l2 2v14H5zM8 4v5h8V4M8 15h8', lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z', logout: 'M10 5H5v14h5M13 8l4 4-4 4M9 12h8' };
  return <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[type]} /></svg>;
};

export default function ProfilePage() {
  const { me, logout, refreshAll } = useApp();
  const [form, setForm] = useState({ name: me?.name || '', wa: me?.wa || '', photo_url: me?.photo_url || '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

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

  const changePassword = async (e) => {
    e.preventDefault();
    setPasswordError(''); setPasswordMessage('');
    if (newPassword.length < 6) return setPasswordError('Password minimal 6 karakter.');
    setPasswordSaving(true);
    try {
      const { error: passwordSaveError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordSaveError) throw passwordSaveError;
      setNewPassword(''); setPasswordMessage('Password berhasil diperbarui.');
    } catch (ex) { setPasswordError(ex?.message || 'Gagal mengubah password.'); }
    finally { setPasswordSaving(false); }
  };

  return (
    <div className="profile-page">
      <div className="card profile-card">
        <h1>Profil Saya</h1>
        {error && <p className="err">{error}</p>}
        {message && <p className="ok">{message}</p>}
        <form className="profile-form" onSubmit={saveProfile}>
          <label>Nama lengkap<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} /></label>
          <label>Nomor WhatsApp<input value={form.wa} onChange={(e) => setForm({ ...form, wa: e.target.value })} inputMode="tel" maxLength={20} /></label>
          <label>Foto profil<input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files?.[0])} /></label>
          {form.photo_url && <img className="profile-avatar-preview" src={form.photo_url} alt="Pratinjau foto profil" />}
          <button className="p action-button" disabled={saving}><ActionIcon type="save" />{saving ? 'Menyimpan...' : 'Simpan Profil'}</button>
        </form>
        <div className="profile-section">
          <h2>Ubah Password</h2>
          {passwordError && <p className="err">{passwordError}</p>}
          {passwordMessage && <p className="ok">{passwordMessage}</p>}
          <form onSubmit={changePassword}>
            <label>Password baru<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} autoComplete="new-password" /></label>
            <button className="p action-button" disabled={passwordSaving}><ActionIcon type="lock" />{passwordSaving ? 'Menyimpan...' : 'Ubah Password'}</button>
          </form>
        </div>
        <div className="profile-actions">
          <button type="button" className="action-button" onClick={logout}><ActionIcon type="logout" />Logout</button>
        </div>
      </div>
    </div>
  );
}
