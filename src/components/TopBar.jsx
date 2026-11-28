import React from 'react';
import { useApp } from '../context/AppContext';

export default function TopBar({ onSelectTab, onOpenProfile, sidebarOpen, onToggleSidebar }) {
  const { me, tab, setTab, newBkCount, setNewBkCount } = useApp();
  if (!me) return null;
  const isOwner = me.role === 'owner';
  const tabs = isOwner ? [['kasir','Kasir'],['reservasi','Reservasi'],['promo','Promo'],['layanan','Layanan'],['akun','Akun'],['pengeluaran','Pengeluaran'],['pengaturan','Pengaturan'],['laporan','Laporan']] : [['kasir','Kasir'],['reservasi','Reservasi'],['pengeluaran','Pengeluaran'],['daftar','Daftar Transaksi']];
  const select = (key) => { setTab(key); if (key === 'reservasi') setNewBkCount(0); if (onSelectTab) onSelectTab(key); };
  return <>
    <button className="mobile-menu-button" type="button" aria-expanded={sidebarOpen} onClick={onToggleSidebar}>☰ Menu</button>
    <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <button className="sidebar-profile" type="button" onClick={onOpenProfile}>Profil</button>
      <nav>{tabs.map(([key, label]) => <button key={key} className={tab === key ? 'on' : ''} onClick={() => select(key)}>{label}{key === 'reservasi' && newBkCount > 0 ? ` (${newBkCount})` : ''}</button>)}</nav>
    </aside>
  </>;
}
