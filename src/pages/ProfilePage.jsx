import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { roleName } from '../utils/format';

export default function ProfilePage() {
  const { me, brand, isServiceOpen, openService, closeService, logout } = useApp();
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirmClose) return undefined;
    const timer = setTimeout(() => setConfirmClose(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmClose]);

  const handleShift = async () => {
    if (busy) return;
    if (isServiceOpen && !confirmClose) return setConfirmClose(true);
    setBusy(true);
    setConfirmClose(false);
    try {
      await (isServiceOpen ? closeService() : openService());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="card profile-card">
        <img className="profile-card-logo" src="/logo.jpeg" alt="Logo" />
        <h1>{brand.nama}</h1>
        {brand.jargon && <p className="sub">{brand.jargon}</p>}
        <div className="profile-identity">
          <b>{me.name}</b>
          <span>{roleName(me.role)}</span>
        </div>
        <div className="profile-actions">
          <button className={isServiceOpen ? 'cl' : 'ok'} disabled={busy} onClick={handleShift}>
            {isServiceOpen ? (confirmClose ? 'Yakin Close?' : 'Close Service') : 'Open Service'}
          </button>
          <button type="button" onClick={logout}>Keluar</button>
        </div>
      </div>
    </div>
  );
}
