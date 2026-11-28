import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Content-Type': 'application/json' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const admin = createClient(url, service);
    const { data: actor } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (actor?.role !== 'owner') return json({ error: 'Owner only' }, 403);

    const { userId, username, password } = await req.json();
    if (!userId || !/^[a-z0-9]{1,32}$/.test(username) || (password !== null && (typeof password !== 'string' || password.length < 6))) {
      return json({ error: 'Data akun tidak valid' }, 400);
    }
    const { data: target } = await admin.from('profiles').select('role').eq('id', userId).single();
    if (!target || !['kasir', 'capster'].includes(target.role)) return json({ error: 'Akun staf tidak ditemukan' }, 400);
    const update = password === null ? { email: `${username}@rove.app` } : { email: `${username}@rove.app`, password };
    const { error } = await admin.auth.admin.updateUserById(userId, update);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Request gagal' }, 500);
  }
});
