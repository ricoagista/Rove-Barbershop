import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) throw new Error('Autentikasi diperlukan.');

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(url, serviceKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Sesi tidak valid.');
    const { data: owner, error: ownerError } = await adminClient
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (ownerError || owner?.role !== 'owner') throw new Error('Hanya owner yang dapat mereset password.');

    const { user_id, password } = await request.json();
    if (!user_id || typeof password !== 'string' || password.length < 6) {
      throw new Error('User dan password minimal 6 karakter wajib diisi.');
    }
    const { data: target, error: targetError } = await adminClient
      .from('profiles').select('role').eq('id', user_id).maybeSingle();
    if (targetError || !target || !['kasir', 'capster'].includes(target.role)) {
      throw new Error('Password hanya dapat direset untuk akun kasir atau capster.');
    }
    const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
