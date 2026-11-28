import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { roleName } from '../utils/format';

export default function TopBar({ onSelectTab }) {
  const {
    me,
    brand,
    tab,
    setTab,
    logout,
    newBkCount,
    setNewBkCount,
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);

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

  const handleTabChange = (key) => {
    setTab(key);
    if (key === 'reservasi') setNewBkCount(0);
    if (onSelectTab) onSelectTab(key);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="bar">
        <div className="t"><b>{brand.nama}</b><span>Panel staf</span></div>
        <button type="button" className="profile-link" onClick={() => handleTabChange('profile')}>{me.name} · {roleName(me.role)}</button>
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
            {label}
            {key === 'reservasi' && newBkCount > 0 ? ` (${newBkCount})` : ''}
          </button>
        ))}
      </div>
    </>
  );
}