-- Izinkan user mengubah profilnya sendiri; owner dapat mengubah semua profil.
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

alter table public.profiles enable row level security;
drop policy if exists "profiles update self or owner" on public.profiles;
create policy "profiles update self or owner" on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_owner())
with check (id = auth.uid() or public.is_owner());
