-- Audit immutable untuk perubahan transaksi.
create table if not exists public.sales_edit_history (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  edited_at timestamptz not null default now(),
  edited_by_id uuid references public.profiles(id) on delete set null,
  edited_by_name text not null default '',
  before_data jsonb not null,
  after_data jsonb not null
);

alter table public.sales_edit_history enable row level security;
drop policy if exists "staff_read_sales_edit_history" on public.sales_edit_history;
create policy "staff_read_sales_edit_history" on public.sales_edit_history
  for select to authenticated using (public.is_staff());

drop trigger if exists sales_edit_audit_trigger on public.sales;
create or replace function public.record_sales_edit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if to_jsonb(old) is distinct from to_jsonb(new) then
    insert into public.sales_edit_history (sale_id, edited_by_id, edited_by_name, before_data, after_data)
    values (
      old.id,
      auth.uid(),
      coalesce((select name from public.profiles where id = auth.uid()), 'Staf tidak diketahui'),
      to_jsonb(old),
      to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

create trigger sales_edit_audit_trigger
after update on public.sales
for each row execute function public.record_sales_edit();

revoke all on function public.record_sales_edit() from public;
notify pgrst, 'reload schema';
