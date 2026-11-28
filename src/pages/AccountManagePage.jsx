import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, createSecondaryClient } from '../lib/supabase';
import { rp, slug, roleName, normWa } from '../utils/format';
import { processSquareAvatar } from '../utils/media';

export default function AccountManagePage() {
  const { me, profiles, refreshAll } = useApp();

  // Form buat akun baru
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('capster');
  const [wa, setWa] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [gp, setGp] = useState('');
  const [bonus, setBonus] = useState('');
  const [sg, setSg] = useState('Bulan');
  const [libur, setLibur] = useState('');
  const [prot, setProt] = useState('');
  const [pHc, setPHc] = useState('');
  const [pEx, setPEx] = useState('');
  const [pPr, setPPr] = useState('');
  const [tHc, setTHc] = useState('');
  const [tEx, setTEx] = useState('');
  const [tPr, setTPr] = useState('');
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit profil staf
  const [editUser, setEditUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Ganti password sendiri
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [passSaving, setPassSaving] = useState(false);

  const handlePhotoUpload = async (file, isEdit = false) => {
    if (!file) return;
    try {
      const dataUrl = await processSquareAvatar(file, 240, 0.8);
      if (isEdit && editUser) {
        setEditUser({ ...editUser, photo_url: dataUrl });
      } else {
        setPhotoUrl(dataUrl);
      }
    } catch {
      setErr('Gagal memproses foto.');
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setErr('');
    setOkMsg('');

    const cleanName = name.trim();
    const cleanUser = slug(username);
    if (!cleanName || !cleanUser || password.length < 6) {
      return setErr('Nama, username, dan password (minimal 6 karakter) wajib diisi.');
    }
    if (profiles.some((p) => p.username === cleanUser)) {
      return setErr('Username sudah dipakai.');
    }

    setSaving(true);
    try {
      const secClient = createSecondaryClient();
      if (!secClient) throw new Error('Client Supabase belum siap.');

      const { data, error } = await secClient.auth.signUp({
        email: `${cleanUser}@rove.app`,
        password,
      });
      if (error) throw error;
      const newUid = data?.user?.id;
      if (!newUid) throw new Error('Gagal mendapatkan ID pengguna baru.');

      const cleanWa = wa.trim() ? normWa(wa) || wa.trim() : '';
      const payload = {
        id: newUid,
        name: cleanName,
        username: cleanUser,
        role,
        wa: cleanWa,
        photo_url: role === 'capster' ? photoUrl : '',
        gp: Number(gp) || 0,
        bonus: Number(bonus) || 0,
        sg,
        libur: Number(libur) || 0,
        prot: Number(prot) || 0,
        p_hc: Number(pHc) || 0,
        p_ex: Number(pEx) || 0,
        p_pr: Number(pPr) || 0,
        t_hc: Number(tHc) || 0,
        t_ex: Number(tEx) || 0,
        t_pr: Number(tPr) || 0,
      };

      const { error: profErr } = await supabase.from('profiles').insert(payload);
      if (profErr) throw profErr;

      setName('');
      setUsername('');
      setPassword('');
      setWa('');
      setPhotoUrl('');
      setGp('');
      setBonus('');
      setLibur('');
      setProt('');
      setPHc('');
      setPEx('');
      setPPr('');
      setTHc('');
      setTEx('');
      setTPr('');
      setOkMsg(`Akun ${cleanName} (@${cleanUser}) berhasil dibuat.`);
      await refreshAll();
    } catch (ex) {
      setErr(ex?.message || 'Gagal membuat akun.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    const cleanUsername = slug(editUser.username);
    if (!cleanUsername) return setResetMsg('Username wajib diisi.');
    if (profiles.some((p) => p.id !== editUser.id && p.username === cleanUsername)) {
      return setResetMsg('Username sudah dipakai.');
    }
    setEditSaving(true);
    setResetMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editUser.name.trim(),
          username: cleanUsername,
          role: editUser.role,
          wa: editUser.wa ? normWa(editUser.wa) || editUser.wa : '',
          photo_url: editUser.role === 'capster' ? editUser.photo_url || '' : '',
          gp: Number(editUser.gp) || 0,
          bonus: Number(editUser.bonus) || 0,
          sg: editUser.sg || 'Bulan',
          libur: Number(editUser.libur) || 0,
          prot: Number(editUser.prot) || 0,
          p_hc: Number(editUser.p_hc) || 0,
          p_ex: Number(editUser.p_ex) || 0,
          p_pr: Number(editUser.p_pr) || 0,
          t_hc: Number(editUser.t_hc) || 0,
          t_ex: Number(editUser.t_ex) || 0,
          t_pr: Number(editUser.t_pr) || 0,
        })
        .eq('id', editUser.id);
      if (error) throw error;
      setEditUser(null);
      await refreshAll();
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editUser) return;
    const newPassword = window.prompt(`Password baru untuk ${editUser.name} (minimal 6 karakter):`);
    if (newPassword === null) return;
    if (newPassword.length < 6) return setResetMsg('Password minimal 6 karakter.');
    setResetSaving(true);
    setResetMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: editUser.id, password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResetMsg('Password akun berhasil direset.');
    } catch (ex) {
      setResetMsg(ex?.message || 'Gagal mereset password.');
    } finally {
      setResetSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (u.id === me.id) return;
    if (!window.confirm(`Hapus profil ${u.name}?`)) return;
    await supabase.from('profiles').delete().eq('id', u.id);
    await refreshAll();
  };

  const handleChangeOwnPassword = async (e) => {
    e.preventDefault();
    setPassErr('');
    setPassMsg('');
    if (newPass.length < 6) {
      return setPassErr('Password baru minimal 6 karakter.');
    }
    setPassSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setNewPass('');
      setPassMsg('Password berhasil diperbarui.');
    } catch (ex) {
      setPassErr(ex?.message || 'Gagal mengganti password.');
    } finally {
      setPassSaving(false);
    }
  };

  return (
    <>
      <div className="card">
        <h2>Buat Akun Staf Baru</h2>
        <form onSubmit={handleCreateAccount}>
          <div className="two">
            <div>
              <label>Nama Lengkap *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label>Peran *</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="capster">Capster</option>
                <option value="kasir">Kasir</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>

          <div className="two">
            <div>
              <label>Username Login *</label>
              <input
                placeholder="huruf kecil tanpa spasi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label>Password Awal * (min 6 karakter)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <label>Nomor WhatsApp</label>
          <input
            placeholder="08123456789"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
          />

          {role === 'capster' && (
            <>
              <label>Foto Profil Capster (Tampil di halaman booking)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0], false)}
              />
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Preview"
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }}
                />
              )}
            </>
          )}

          {role !== 'owner' && (
            <>
              <div className="mu" style={{ margin: '10px 0 6px' }}>
                Skema Gaji &amp; Target Bulanan (Opsional)
              </div>
              <div className="two">
                <div>
                  <label>Gaji Pokok (Rp)</label>
                  <input
                    inputMode="numeric"
                    value={gp}
                    onChange={(e) => setGp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div>
                  <label>Skema Gaji</label>
                  <select value={sg} onChange={(e) => setSg(e.target.value)}>
                    <option value="Bulan">Bulanan</option>
                    <option value="Minggu">Mingguan</option>
                    <option value="Hari">Harian</option>
                  </select>
                </div>
              </div>

              <div className="two">
                <div>
                  <label>Bonus (Rp)</label>
                  <input
                    inputMode="numeric"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div>
                  <label>Jatah Libur / Bulan</label>
                  <input
                    inputMode="numeric"
                    value={libur}
                    onChange={(e) => setLibur(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="two">
                <div>
                  <label>Target Hair Cut / Bulan</label>
                  <input
                    inputMode="numeric"
                    value={tHc}
                    onChange={(e) => setTHc(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div>
                  <label>Komisi Hair Cut (%)</label>
                  <input
                    inputMode="numeric"
                    value={pHc}
                    onChange={(e) => setPHc(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="two">
                <div>
                  <label>Target Extra Service / Bulan</label>
                  <input
                    inputMode="numeric"
                    value={tEx}
                    onChange={(e) => setTEx(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div>
                  <label>Komisi Extra Service (%)</label>
                  <input
                    inputMode="numeric"
                    value={pEx}
                    onChange={(e) => setPEx(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="two">
                <div>
                  <label>Target Produk / Bulan</label>
                  <input
                    inputMode="numeric"
                    value={tPr}
                    onChange={(e) => setTPr(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div>
                  <label>Komisi Produk (%)</label>
                  <input
                    inputMode="numeric"
                    value={pPr}
                    onChange={(e) => setPPr(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <label>Potongan Keterlambatan / Lainnya (Rp)</label>
              <input
                inputMode="numeric"
                value={prot}
                onChange={(e) => setProt(e.target.value.replace(/\D/g, ''))}
              />
            </>
          )}

          {err && <div className="err">{err}</div>}
          {okMsg && <p style={{ color: '#6ee7b7', fontSize: 14 }}>{okMsg}</p>}
          <button type="submit" className="p" style={{ width: '100%' }} disabled={saving}>
            {saving ? 'Membuat Akun...' : 'Buat Akun'}
          </button>
        </form>
      </div>

      {editUser && (
        <div className="card">
          <h2>Edit Akun: {editUser.name} (@{editUser.username})</h2>
          <form onSubmit={handleSaveEditUser}>
            <div className="two">
              <div>
                <label>Nama</label>
                <input
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
              <div>
                <label>Username</label>
                <input
                  value={editUser.username || ''}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  autoComplete="username"
                />
              </div>
              <div>
                <label>Peran</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                >
                  <option value="capster">Capster</option>
                  <option value="kasir">Kasir</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>

            <label>WhatsApp</label>
            <input
              value={editUser.wa || ''}
              onChange={(e) => setEditUser({ ...editUser, wa: e.target.value })}
            />

            {editUser.role === 'capster' && (
              <>
                <label>Ganti Foto Profil</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files?.[0], true)}
                />
              </>
            )}

            <div className="two">
              <div>
                <label>Gaji Pokok (Rp)</label>
                <input
                  inputMode="numeric"
                  value={editUser.gp || 0}
                  onChange={(e) =>
                    setEditUser({ ...editUser, gp: e.target.value.replace(/\D/g, '') })
                  }
                />
              </div>
              <div>
                <label>Bonus (Rp)</label>
                <input
                  inputMode="numeric"
                  value={editUser.bonus || 0}
                  onChange={(e) =>
                    setEditUser({ ...editUser, bonus: e.target.value.replace(/\D/g, '') })
                  }
                />
              </div>
            </div>

            <div className="two">
              <div>
                <label>Target Hair Cut</label>
                <input
                  inputMode="numeric"
                  value={editUser.t_hc || 0}
                  onChange={(e) =>
                    setEditUser({ ...editUser, t_hc: e.target.value.replace(/\D/g, '') })
                  }
                />
              </div>
              <div>
                <label>Target Extra Service</label>
                <input
                  inputMode="numeric"
                  value={editUser.t_ex || 0}
                  onChange={(e) =>
                    setEditUser({ ...editUser, t_ex: e.target.value.replace(/\D/g, '') })
                  }
                />
              </div>
            </div>

            <label>Target Produk</label>
            <input
              inputMode="numeric"
              value={editUser.t_pr || 0}
              onChange={(e) =>
                setEditUser({ ...editUser, t_pr: e.target.value.replace(/\D/g, '') })
              }
            />

            {resetMsg && <p className={resetMsg.includes('berhasil') ? 'ok' : 'err'}>{resetMsg}</p>}
            <div className="two">
              <button type="submit" className="p" disabled={editSaving}>
                {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button type="button" onClick={handleResetPassword} disabled={resetSaving}>
                {resetSaving ? 'Mereset...' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setEditUser(null)}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Daftar Akun ({profiles.length})</h2>
        {profiles.map((u) => (
          <div key={u.id} className="row">
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {u.photo_url && (
                <img
                  src={u.photo_url}
                  alt={u.name}
                  style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
              <span>
                <b>{u.name}</b> (@{u.username})
                <br />
                <span className="mu">
                  {roleName(u.role)}
                  {u.gp > 0 ? ` · GP ${rp(u.gp)}/${u.sg}` : ''}
                </span>
              </span>
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button
                style={{ padding: '4px 10px' }}
                onClick={() => setEditUser({ ...u })}
              >
                Edit
              </button>
              {u.id !== me.id && (
                <button
                  className="d"
                  style={{ padding: '4px 10px' }}
                  onClick={() => handleDeleteUser(u)}
                >
                  Hapus
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Ubah Password Akun Saya ({me.username})</h2>
        <form onSubmit={handleChangeOwnPassword}>
          <label>Password Baru (min 6 karakter)</label>
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
          />
          {passErr && <div className="err">{passErr}</div>}
          {passMsg && <p style={{ color: '#6ee7b7', fontSize: 14 }}>{passMsg}</p>}
          <button type="submit" disabled={passSaving}>
            {passSaving ? 'Memperbarui...' : 'Ganti Password'}
          </button>
        </form>
      </div>
    </>
  );
}