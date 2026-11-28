import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { roleName } from '../utils/format';

const icons = {
  profile: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" /></svg>,
  kasir: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h2m2 0h2m2 0h2" /></svg>,
  reservasi: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></svg>,
  promo: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 8-4 8 4-8 4-8-4Z" /><path d="m4 12 8 4 8-4M4 16l8 4 8-4" /></svg>,
  layanan: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3c3 0 5 2 5 5v2h2V8c0-3 2-5 5-5" /><path d="M11 10 5 21M13 10l6 11M8 16h8" /></svg>,
  akun: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20c.7-3.2 2.7-5 6-5s5.3 1.8 6 5M15 15c2.7 0 4.6 1.5 5 4" /></svg>,
  pengeluaran: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM7 7V5h10v2M4 11h16" /><path d="M9 15h6" /></svg>,
  pengaturan: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" /><circle cx="12" cy="12" r="4" /></svg>,
  laporan: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10m7 10V4m7 16v-7" /></svg>,
  daftar: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h13M7 12h13M7 19h13M3 5h.01M3 12h.01M3 19h.01" /></svg>,
  default: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><path d="M12 8v4l3 2" /></svg>,
  menu: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  open: null,
  close: null,
};

export default function TopBar({ onSelectTab }) {
  const {
    me,
    tab,
    setTab,
    newBkCount,
    setNewBkCount,
    isServiceOpen,
    openService,
    closeService,
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  if (!me) return null;

  const isOwner = me.role === 'owner';
  const tabs = isOwner
    ? [
        ['profile', 'Profil'],
        ['kasir', 'Kasir'],
        ['reservasi', 'Reservasi'],
        ['promo', 'Promo'],
        ['layanan', 'Layanan'],
        ['akun', 'Akun'],
        ['pengeluaran', 'Pengeluaran'],
        ['pengaturan', 'Pengaturan'],
        ['laporan', 'Laporan'],
      ]
    : [
        ['profile', 'Profil'],
        ['kasir', 'Kasir'],
        ['reservasi', 'Reservasi'],
        ['pengeluaran', 'Pengeluaran'],
        ['daftar', 'Daftar Transaksi'],
      ];

  const handleShift = async () => {
    if (shiftBusy) return;
    if (isServiceOpen && !confirmClose) return setConfirmClose(true);
    setShiftBusy(true); setConfirmClose(false);
    try { await (isServiceOpen ? closeService() : openService()); } finally { setShiftBusy(false); }
  };

  const handleTabChange = (key) => {
    setTab(key);
    if (key === 'reservasi') setNewBkCount(0);
    if (onSelectTab) onSelectTab(key);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="top-shift-bar">
        <div className="top-user-info">
          <strong>{me.name}</strong>
          <span>{roleName(me.role)}</span>
        </div>
        <button className={`shift-button ${isServiceOpen ? 'close' : 'open'}`} disabled={shiftBusy} onClick={handleShift}>
          {isServiceOpen ? (confirmClose ? 'Yakin Close?' : 'Close Service') : 'Open Service'}
        </button>
      </div>
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
        <span className="nav-icon">{icons.menu}</span>
        <span>{menuOpen ? 'Tutup menu' : 'Menu'}</span>
      </button>
      <div className={`tabs ${menuOpen ? 'menu-open' : ''}`}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'on' : ''}
            onClick={() => handleTabChange(key)}
          >
            <span className="nav-icon">{icons[key] || icons.default}</span>
            <span>{label}</span>
            {key === 'reservasi' && newBkCount > 0 ? ` (${newBkCount})` : ''}
          </button>
        ))}
      </div>
    </>
  );
}