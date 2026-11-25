import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { processNotaImage } from '../utils/media';
import { DEF_POL, DEF_KONTAK, DEFAULT_JAM_BUKA, DEFAULT_JAM_TUTUP, DEFAULT_BATAS_RESERVASI_TERAKHIR } from '../utils/defaults';

export default function SettingsPage() {
  const { settings, refreshAll } = useApp();
  const utama = settings.utama || {};
  const kontak = settings.kontak || DEF_KONTAK;
  const nota = settings.nota || {};
  const operasional = settings.operasional || {};
  const [tab, setTab] = useState('utama');
  const [nama, setNama] = useState(utama.nama || 'Rove Barbershop');
  const [pol, setPol] = useState(utama.pol || DEF_POL.join('\n'));
  const [jamBuka, setJamBuka] = useState(operasional.jam_buka || DEFAULT_JAM_BUKA);
  const [jamTutup, setJamTutup] = useState(operasional.jam_tutup || DEFAULT_JAM_TUTUP);
  const [batas, setBatas] = useState(operasional.batas_reservasi_terakhir || DEFAULT_BATAS_RESERVASI_TERAKHIR);
  const [wa, setWa] = useState(kontak.wa || ''); const [ig, setIg] = useState(kontak.ig || '');
  const [tt, setTt] = useState(kontak.tt || ''); const [fb, setFb] = useState(kontak.fb || '');
  const [email, setEmail] = useState(kontak.email || ''); const [maps, setMaps] = useState(kontak.maps || '');
  const [msgBaru, setMsgBaru] = useState(nota.msgBaru || ''); const [msgLama, setMsgLama] = useState(nota.msgLama || ''); const [img, setImg] = useState(nota.img || '');
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const save = async (id, patch) => { setSaving(true); setError(''); setMessage(''); try { const data = { ...(settings[id] || {}), ...patch }; const { error: e } = await supabase.from('settings').upsert({ id, data, updated_at: new Date().toISOString() }); if (e) throw e; await refreshAll(); setMessage('Pengaturan berhasil disimpan.'); } catch (e) { setError(e.message || 'Gagal menyimpan pengaturan.'); } finally { setSaving(false); } };
  const saveMain = (e) => { e.preventDefault(); save('utama', { nama: nama.trim() || 'Rove Barbershop', pol }); };
  const saveOps = (e) => { e.preventDefault(); const valid = (x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x); if (!valid(jamBuka) || !valid(jamTutup) || !valid(batas)) return setError('Jam harus berformat HH:MM.'); if (jamBuka >= jamTutup || batas < jamBuka || (Number(jamTutup.slice(0,2))*60+Number(jamTutup.slice(3)) - Number(jamBuka.slice(0,2))*60-Number(jamBuka.slice(3)) < 60)) return setError('Jam operasional tidak valid.'); save('operasional', { jam_buka: jamBuka, jam_tutup: jamTutup, batas_reservasi_terakhir: batas }); };
  return <><div className="tabs">{[['utama','Identitas & Jam'],['kontak','Contact Us'],['nota','Nota Thermal']].map(([k,l]) => <button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);setError('');setMessage('');}}>{l}</button>)}</div>{error&&<div className="err">{error}</div>}{message&&<p className="ok">{message}</p>}{tab==='utama'&&<><div className="card"><h2>Identitas &amp; Kebijakan</h2><form onSubmit={saveMain}><label>Nama Barbershop</label><input value={nama} onChange={e=>setNama(e.target.value)}/><label>Booking Policy</label><textarea rows={4} value={pol} onChange={e=>setPol(e.target.value)}/><button className="p" disabled={saving}>Simpan</button></form></div><div className="card"><h2>Jam Operasional</h2><form onSubmit={saveOps}><label>Jam buka</label><input type="time" value={jamBuka} onChange={e=>setJamBuka(e.target.value)}/><label>Jam tutup</label><input type="time" value={jamTutup} onChange={e=>setJamTutup(e.target.value)}/><label>Batas reservasi terakhir</label><input type="time" value={batas} onChange={e=>setBatas(e.target.value)}/><button className="p" disabled={saving}>Simpan Jam</button></form></div></>}{tab==='kontak'&&<div className="card"><h2>Contact Us</h2><form onSubmit={e=>{e.preventDefault();save('kontak',{wa,ig,tt,fb,email,maps});}}>{[['WhatsApp',wa,setWa],['Instagram',ig,setIg],['TikTok',tt,setTt],['Facebook',fb,setFb],['Email',email,setEmail],['Maps',maps,setMaps]].map(([l,v,set])=><React.Fragment key={l}><label>{l}</label><input value={v} onChange={e=>set(e.target.value)}/></React.Fragment>)}<button className="p" disabled={saving}>Simpan Kontak</button></form></div>}{tab==='nota'&&<div className="card"><h2>Nota Thermal 58mm</h2><form onSubmit={e=>{e.preventDefault();save('nota',{msgBaru,msgLama,img});}}><label>Pesan pelanggan baru/reservasi</label><textarea value={msgBaru} onChange={e=>setMsgBaru(e.target.value)}/><label>Pesan pelanggan lama</label><textarea value={msgLama} onChange={e=>setMsgLama(e.target.value)}/><label>QR atau gambar promo</label><input type="file" accept="image/*" onChange={async e=>{try{setImg(await processNotaImage(e.target.files?.[0]));}catch{setError('Gagal memproses gambar.');}}}/>{img&&<img src={img} alt="Preview QR promo" style={{maxWidth:180,background:'#fff',padding:4}}/>}<button className="p" disabled={saving}>Simpan Nota</button></form></div>}</>;
}
