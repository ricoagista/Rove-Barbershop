import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { ld, normWa } from '../utils/format';
import { hexRgb, shade, playBeep } from '../utils/media';
import { DEF_POL, DEF_KONTAK } from '../utils/defaults';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sessionUser, setSessionUser] = useState(null);
  const [me, setMe] = useState(null);
  const [view, setView] = useState('home'); // 'home' | 'login'
  const [tab, setTab] = useState('kasir');

  const [profiles, setProfiles] = useState([]);
  const [capsters, setCapsters] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [promos, setPromos] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [settings, setSettings] = useState({});

  const [ready, setReady] = useState(false);
  const [newBkCount, setNewBkCount] = useState(0);
  const [previewTheme, setPreviewTheme] = useState(null);

  const seenBkIds = useRef(null);
  const autoClosedIds = useRef(new Set());

  // 1. Fetch data publik (tanpa login)
  const loadPublicData = useCallback(async () => {
    if (!supabase) return;
    const [svcRes, capRes, slotRes, setRes] = await Promise.all([
      supabase.from('services').select('*').order('created_at', { ascending: true }),
      supabase.from('public_capsters').select('*').order('name', { ascending: true }),
      supabase.from('public_booked_slots').select('*'),
      supabase.from('settings').select('*'),
    ]);

    if (svcRes.data) setServices(svcRes.data);
    if (capRes.data) setCapsters(capRes.data);
    if (slotRes.data) setBookedSlots(slotRes.data);
    if (setRes.data) {
      const map = {};
      setRes.data.forEach((r) => {
        map[r.id] = r.data;
      });
      setSettings(map);
    }
  }, []);

  // 2. Fetch data staf (setelah login)
  const loadStaffData = useCallback(async (uid) => {
    if (!supabase || !uid) return;
    const [profRes, proRes, bkRes, salRes, expRes, shfRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('promos').select('*').order('created_at', { ascending: true }),
      supabase.from('bookings').select('*').order('tanggal', { ascending: true }),
      supabase.from('sales').select('*').order('ts', { ascending: false }),
      supabase.from('expenses').select('*').order('ts', { ascending: false }),
      supabase.from('shifts').select('*'),
    ]);

    if (profRes.data) {
      setProfiles(profRes.data);
      const myProf = profRes.data.find((p) => p.id === uid) || null;
      setMe(myProf);
    }
    if (proRes.data) setPromos(proRes.data);
    if (bkRes.data) {
      setBookings(bkRes.data);
      // PERBAIKAN: Amankan dengan optional chaining & default array kosong
      const bkList = Array.isArray(bkRes.data) ? bkRes.data : [];
      const ids = bkList.map((b) => b.id);
      
      if (seenBkIds.current === null) {
        seenBkIds.current = new Set(ids);
      } else {
        const added = ids.filter((id) => !seenBkIds.current.has(id));
        if (added.length > 0) {
          added.forEach((id) => seenBkIds.current.add(id));
          setNewBkCount((prev) => prev + added.length);
          playBeep();
        }
      }
    }
    if (salRes.data) setSales(salRes.data);
    if (expRes.data) setExpenses(expRes.data);
    if (shfRes.data) setShifts(shfRes.data);
  }, []);

  // 3. Inisialisasi Auth & Realtime
  useEffect(() => {
    if (!isConfigured || !supabase) {
      setReady(true);
      return;
    }

    let active = true;

    async function bootstrap() {
      await loadPublicData();
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id || null;
      if (active) {
        setSessionUser(data?.session?.user || null);
        if (uid) await loadStaffData(uid);
        setReady(true);
      }
    }

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id || null;
      setSessionUser(session?.user || null);
      if (uid) {
        await loadStaffData(uid);
      } else {
        setMe(null);
        setProfiles([]);
        setPromos([]);
        setBookings([]);
        setSales([]);
        setExpenses([]);
        setShifts([]);
        seenBkIds.current = null;
      }
    });

    // Realtime subscription
    const channel = supabase
      .channel('rove-realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadPublicData();
        supabase.auth.getSession().then(({ data }) => {
          const uid = data?.session?.user?.id;
          if (uid) loadStaffData(uid);
        });
      })
      .subscribe();

    // Fallback polling 20 detik
    const poll = setInterval(() => {
      loadPublicData();
      supabase.auth.getSession().then(({ data }) => {
        const uid = data?.session?.user?.id;
        if (uid) loadStaffData(uid);
      });
    }, 20000);

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [loadPublicData, loadStaffData]);

  // Helper Brand & Kontak
  const brand = (() => {
    const d = settings.utama || {};
    return {
      nama: d.nama || 'Rove Barbershop',
      jargon: d.jargon == null ? 'Grooming Space in the Town' : d.jargon,
      bg: d.bg || '#05070f',
      ol: d.ol || '#1b3bb5',
      tx: d.tx || '#ffffff',
      pol: d.pol == null ? DEF_POL.join('\n') : d.pol,
    };
  })();

  const kontak = (() => {
    const D = settings.kontak || DEF_KONTAK;
    const t = (x) => String(x || '').trim();
    const full = (v, b) => (/^https?:/i.test(v) ? v : b + v.replace(/^@/, ''));
    const short = (v) =>
      v
        .replace(/^https?:\/\/[^/]+\/@?/i, '')
        .replace(/\/+$/, '')
        .replace(/^@/, '');
    const wa = t(D.wa);
    const ig = t(D.ig);
    const tt = t(D.tt);
    const fb = t(D.fb);
    return {
      wa: wa ? normWa(wa) || '' : '',
      waShow: wa,
      ig: ig ? full(ig, 'https://www.instagram.com/') : '',
      igTxt: short(ig),
      tt: tt ? full(tt, 'https://www.tiktok.com/@') : '',
      ttTxt: short(tt),
      fb: fb ? full(fb, 'https://www.facebook.com/') : '',
      fbTxt: short(fb),
      email: t(D.email),
      maps: t(D.maps),
    };
  })();

  const notaConfig = settings.nota || {};

  // Terapkan tema warna dinamis ke document
  useEffect(() => {
    const activeTheme = previewTheme && tab === 'pengaturan' && me ? { ...brand, ...previewTheme } : brand;
    const r = document.documentElement.style;
    r.setProperty('--tx', activeTheme.tx);
    r.setProperty('--bd', activeTheme.ol);
    r.setProperty('--mu', `rgba(${hexRgb(activeTheme.tx).join(',')}, .62)`);
    document.body.style.background = `radial-gradient(120% 60% at 50% 0%, ${shade(activeTheme.bg, 28)} 0%, ${activeTheme.bg} 45%, ${shade(activeTheme.bg, -14)} 100%) fixed`;
    document.title = brand.nama;
  }, [brand, previewTheme, tab, me]);

  // Auto-close shift pukul 23:59 WIB
  useEffect(() => {
    if (!me || !supabase) return;
    const checkAutoClose = () => {
      const now = new Date();
      const td = ld(now);
      const w = new Date(now.getTime() + 7 * 3600000);
      const mm = w.getUTCHours() * 60 + w.getUTCMinutes();
      shifts
        .filter((x) => x.status === 'open' && (x.tanggal < td || mm >= 1439) && !autoClosedIds.current.has(x.id))
        .forEach((x) => {
          autoClosedIds.current.add(x.id);
          const closeTime = x.tanggal < td ? new Date(x.tanggal + 'T23:59:00+07:00').toISOString() : now.toISOString();
          supabase.from('shifts').update({ status: 'closed', close_ts: closeTime }).eq('id', x.id);
        });
    };
    checkAutoClose();
    const timer = setInterval(checkAutoClose, 30000);
    return () => clearInterval(timer);
  }, [me, shifts]);

  const shiftToday = me ? shifts.find((x) => x.id === `${ld()}_${me.id}`) : null;
  const isServiceOpen = Boolean(shiftToday && shiftToday.status === 'open');

  const openService = async () => {
    if (!me) return;
    const td = ld();
    await supabase.from('shifts').upsert({
      id: `${td}_${me.id}`,
      tanggal: td,
      uid: me.id,
      nama: me.name,
      role: me.role,
      open_ts: new Date().toISOString(),
      status: 'open',
    });
    await loadStaffData(me.id);
  };

  const closeService = async () => {
    if (!shiftToday) return;
    await supabase
      .from('shifts')
      .update({ status: 'closed', close_ts: new Date().toISOString() })
      .eq('id', shiftToday.id);
    await loadStaffData(me.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setView('home');
    setMe(null);
    setTab('kasir');
  };

  return (
    <AppContext.Provider
      value={{
        isConfigured,
        ready,
        sessionUser,
        me,
        view,
        setView,
        tab,
        setTab,
        profiles,
        capsters,
        bookedSlots,
        services,
        promos,
        bookings,
        sales,
        expenses,
        shifts,
        settings,
        brand,
        kontak,
        notaConfig,
        previewTheme,
        setPreviewTheme,
        newBkCount,
        setNewBkCount,
        shiftToday,
        isServiceOpen,
        openService,
        closeService,
        logout,
        refreshAll: async () => {
          await loadPublicData();
          if (me) await loadStaffData(me.id);
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);