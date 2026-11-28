import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { roleName } from '../utils/format';

export default function ProfilePage() {
  const { me, brand, isServiceOpen, openService, closeService, logout } = useApp();
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!confirmClose) return undefined; const id = setTimeout(() => setConfirmClose(false), 4000); return () => clearTimeout(id); }, [confirmClose]);
  const toggleShift = async () => {
    if (busy) return;
    if (isServiceOpen && !confirmClose) return setConfirmClose(true);
    setBusy(true);
    try { if (isServiceOpen) await closeService(); else await openService(); } finally { setBusy(false); setConfirmClose(false); }
  };
  return <div className="card profile-page">
    <div className="profile-heading"><img src="/logo.jpeg" alt="Logo" /><div><h2>{brand.nama}</h2><p className="mu">{brand.jargon}</p></div></div>
    <div className="profile-info"><b>{me.name}</b><span>{roleName(me.role)}</span></div>
    <button className={isServiceOpen ? 'cl' : 'ok'} disabled={busy} onClick={toggleShift}>{isServiceOpen ? confirmClose ? 'Yakin Close?' : 'Close Service' : 'Open Service'}</button>
    <button type="button" onClick={logout}>Keluar</button>
  </div>;
}
