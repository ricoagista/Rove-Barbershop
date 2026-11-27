import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { slug } from '../utils/format';

export default function LoginPage() {
  const { isConfigured, brand, setView } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConfigured || !supabase) {
      return setErrorMsg('Konfigurasi Supabase belum diatur di .env.');
    }

    const u = slug(username);
    if (!u || !password) {
      return setErrorMsg('Username dan password wajib diisi.');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${u}@rove.app`,
        password,
      });
      if (error) {
        throw new Error('Username atau password salah.');
      }
      setView('home');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrap" style={{ maxWidth: 420, marginTop: 32 }}>
      <div className="card">
        <img className="logo" src="/logo.jpeg" alt={brand.nama} />
        <h1 style={{ textAlign: 'center', marginBottom: 4 }}>{brand.nama}</h1>
        <p className="sub">Login Kasir, Capster &amp; Owner</p>

        <form onSubmit={handleLogin}>
          <label>Username</label>
          <input
            type="text"
            autoComplete="username"
            placeholder="Masukkan username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {errorMsg && <div className="err">{errorMsg}</div>}

          <button
            type="submit"
            className="p"
            style={{ width: '100%', marginTop: 6 }}
            disabled={loading}
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <button
          type="button"
          className="ghost"
          style={{ width: '100%', marginTop: 12 }}
          onClick={() => window.location.assign('/')}
        >
          ← Kembali ke Halaman Booking
        </button>
      </div>
    </div>
  );
}