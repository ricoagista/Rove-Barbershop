import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { roleName } from '../utils/format';

export default function TopBar({ onSelectTab }) {
  const {
    me,
    brand,
    tab,
    setTab,
    isServiceOpen,
    openService,
    closeService,
    logout,
    newBkCount,
    setNewBkCount,
  } = useApp();

  const [confirmClose, setConfirmClose] = useState(false);
  const [busyShift, setBusyShift] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!confirmClose) return;
    const t = setTimeout(() => setConfirmClose(false), 4000);
    return () => clearTimeout(t);
  }, [confirmClose]);

  if (!me) return null;

  const isOwner = me.role === 'owner';
  const tabs = isOwner
    ? [
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
        ['kasir', 'Kasir'],
        ['reservasi', 'Reservasi'],
        ['pengeluaran', 'Pengeluaran'],
        ['daftar', 'Daftar Transaksi'],
      ];

  const handleShiftClick = async () => {
    if (busyShift) return;
    if (!isServiceOpen) {
      setBusyShift(true);
      try {
        await openService();
      } finally {
        setBusyShift(false);
      }
    } else {
      if (!confirmClose) {
        setConfirmClose(true);
      } else {
        setBusyShift(true);
        setConfirmClose(false);
        try {
          await closeService();
        } finally {
          setBusyShift(false);
        }
      }
    }
  };

  const handleTabChange = (key) => {
    setTab(key);
    if (key === 'reservasi') setNewBkCount(0);
    if (onSelectTab) onSelectTab(key);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="bar">
        <img src="/logo.jpeg" alt="Logo" />
        <div className="t">
          <b>{brand.nama}</b>
          {brand.jargon && (
            <>
              <span>{brand.jargon}</span>
              <br />
            </>
          )}
          <span>
            {me.name} · {roleName(me.role)}
          </span>
        </div>
        <button
          className={isServiceOpen ? 'cl' : 'ok'}
          disabled={busyShift}
          onClick={handleShiftClick}
        >
          {isServiceOpen
            ? confirmClose
              ? 'Yakin Close?'
              : 'Close Service'
            : 'Open Service'}
        </button>
        <button onClick={logout}>Keluar</button>
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