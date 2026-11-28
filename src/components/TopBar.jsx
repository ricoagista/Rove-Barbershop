import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { roleName } from '../utils/format';

const icons = {
  profile: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" /></svg>,
  kasir: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h2m2 0h2m2 0h2" /></svg>,
  reservasi: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></svg>,
  default: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><path d="M12 8v4l3 2" /></svg>,
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
        {menuOpen ? 'Tutup menu' : 'Menu'}
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