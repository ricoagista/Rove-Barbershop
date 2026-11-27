import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import TopBar from './components/TopBar';
import BookingPage from './pages/BookingPage';
import LoginPage from './pages/LoginPage';
import CashierPage from './pages/CashierPage';
import ReservationPage from './pages/ReservationPage';
import ExpensePage from './pages/ExpensePage';
import StaffHistoryPage from './pages/StaffHistoryPage';
import ReportPage from './pages/ReportPage';
import ServiceManagePage from './pages/ServiceManagePage';
import PromoManagePage from './pages/PromoManagePage';
import AccountManagePage from './pages/AccountManagePage';
import SettingsPage from './pages/SettingsPage';

function MainRouter() {
  const { isConfigured, ready, sessionUser, me, tab, setTab, logout } = useApp();
  const [reprintReceipt, setReprintReceipt] = useState(null);

  if (!isConfigured) {
    return (
      <div className="wrap">
        <div className="card">
          <h2>Konfigurasi Supabase Belum Dipasang</h2>
          <p className="mu">
            Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di file{' '}
            <code>.env</code> pada root proyek, lalu jalankan ulang server Vite.
          </p>
        </div>
      </div>
    );
  }

  // Jika user sudah login di Auth, namun profil belum ada di tabel profiles
  if (ready && sessionUser && !me) {
    return (
      <div className="wrap" style={{ maxWidth: 460, marginTop: 32 }}>
        <div className="card">
          <h2>Profil Staf Tidak Ditemukan</h2>
          <p className="mu">
            Akun berhasil login, tetapi data profil belum terdaftar di tabel <code>profiles</code>.
            Hubungi Owner untuk mendaftarkan akun Anda.
          </p>
          <button onClick={logout}>Keluar</button>
        </div>
      </div>
    );
  }

  // Area Staf & Owner setelah login
  if (me) {
    const isOwner = me.role === 'owner';

    const handleReprint = (trx) => {
      setReprintReceipt(trx);
      setTab('kasir');
    };

    const handleTabChange = (nextTab) => {
      if (nextTab !== 'kasir') {
        setReprintReceipt(null);
      }
    };

    return (
      <div className="wrap">
        <TopBar onSelectTab={handleTabChange} />

        <main>
        {tab === 'kasir' && (
          <CashierPage
            externalReceipt={reprintReceipt}
            onClearExternalReceipt={() => setReprintReceipt(null)}
          />
        )}
        {tab === 'reservasi' && <ReservationPage />}
        {tab === 'pengeluaran' && <ExpensePage />}
        {tab === 'daftar' && !isOwner && <StaffHistoryPage onReprint={handleReprint} />}
        {tab === 'promo' && isOwner && <PromoManagePage />}
        {tab === 'layanan' && isOwner && <ServiceManagePage />}
        {tab === 'akun' && isOwner && <AccountManagePage />}
        {tab === 'pengaturan' && isOwner && <SettingsPage />}
        {tab === 'laporan' && isOwner && <ReportPage onReprint={handleReprint} />}
        </main>
      </div>
    );
  }

  // Area Publik (Tanpa Login)
  if (window.location.pathname === '/login') {
    return <LoginPage />;
  }

  return <BookingPage />;
}

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}