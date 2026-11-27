import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { processNotaImage } from '../utils/media';
import { DEF_POL, DEFAULT_JAM_BUKA, DEFAULT_JAM_TUTUP, DEFAULT_BATAS_RESERVASI_TERAKHIR } from '../utils/defaults';

export default function SettingsPage() {
  const { settings, refreshAll } = useApp();
  const utama = settings.utama || {};
  const nota = settings.nota || {};
  const operasional = settings.operasional || {};
  const [tab, setTab] = useState('utama');
  const [pol, setPol] = useState(utama.pol || DEF_POL.join('\n'));
  const [jamBuka, setJamBuka] = useState(operasional.jam_buka || DEFAULT_JAM_BUKA);
  const [jamTutup, setJamTutup] = useState(operasional.jam_tutup || DEFAULT_JAM_TUTUP);
  const [batas, setBatas] = useState(operasional.batas_reservasi_terakhir || DEFAULT_BATAS_RESERVASI_TERAKHIR);
  const [msgRegular, setMsgRegular] = useState(nota.msgRegular ?? nota.msgBaru ?? '');
  const [msgReservasi, setMsgReservasi] = useState(nota.msgReservasi ?? nota.msgLama ?? '');
  const [img, setImg] = useState(nota.img || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (id, patch) => { setSaving(true); setError(''); setMessage(''); try { const data = { ...(settings[id] || {}), ...patch }; const { error: e } = await supabase.from('settings').upsert({ id, data, updated_at: new Date().toISOString() }); if (e) throw e; await refreshAll(); setMessage('Pengaturan berhasil disimpan.'); } catch (e) { setError(e.message || 'Gagal menyimpan pengaturan.'); } finally { setSaving(false); } };
  const saveMain = (e) => { e.preventDefault(); save('utama', { ...(settings.utama || {}), pol }); };
  const saveOps = (e) => { e.preventDefault(); const valid = (x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x); if (!valid(jamBuka) || !valid(jamTutup) || !valid(batas)) return setError('Jam harus berformat HH:MM.'); if (jamBuka >= jamTutup || batas < jamBuka || (Number(jamTutup.slice(0,2))*60+Number(jamTutup.slice(3)) - Number(jamBuka.slice(0,2))*60-Number(jamBuka.slice(3)) < 60)) return setError('Jam operasional tidak valid.'); save('operasional', { jam_buka: jamBuka, jam_tutup: jamTutup, batas_reservasi_terakhir: batas }); };
  return <><div className="tabs">{[['utama','Jam & Policy'],['nota','Nota Thermal']].map(([k,l]) => <button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);setError('');setMessage('');}}>{l}</button>)}</div>{error&&<div className="err">{error}</div>}{message&&<p className="ok">{message}</p>}{tab==='utama'&&<><div className="card"><h2>Booking Policy</h2><form onSubmit={saveMain}><textarea rows={4} value={pol} onChange={e=>setPol(e.target.value)}/><button className="p" disabled={saving}>Simpan Policy</button></form></div><div className="card"><h2>Jam Operasional</h2><form onSubmit={saveOps}><label>Jam buka</label><input type="time" value={jamBuka} onChange={e=>setJamBuka(e.target.value)}/><label>Jam tutup</label><input type="time" value={jamTutup} onChange={e=>setJamTutup(e.target.value)}/><label>Batas reservasi terakhir</label><input type="time" value={batas} onChange={e=>setBatas(e.target.value)}/><button className="p" disabled={saving}>Simpan Jam</button></form></div></>}{tab==='nota'&&<div className="card"><h2>Nota Thermal 58mm</h2><form onSubmit={e=>{e.preventDefault();save('nota',{msgRegular,msgReservasi,img});}}><label>Pesan pelanggan Regular</label><textarea value={msgRegular} onChange={e=>setMsgRegular(e.target.value)} placeholder="Isi pesan untuk pelanggan Regular"/><label>Pesan pelanggan Reservasi</label><textarea value={msgReservasi} onChange={e=>setMsgReservasi(e.target.value)} placeholder="Isi pesan untuk pelanggan Reservasi"/><label>QR atau gambar promo</label><input type="file" accept="image/*" onChange={async e=>{try{setImg(await processNotaImage(e.target.files?.[0]));}catch{setError('Gagal memproses gambar.');}}}/>{img ? <div><img src={img} alt="Preview QR promo" style={{maxWidth:180,background:'#fff',padding:4}}/><p className="mu">Gambar promo tersimpan. Upload gambar baru untuk menggantinya.</p></div> : <p className="mu">Belum ada QR atau gambar promo.</p>}<button className="p" disabled={saving}>Simpan Nota</button></form></div>}</>;
}
