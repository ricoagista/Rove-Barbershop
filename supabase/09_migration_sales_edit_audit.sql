-- Audit immutable untuk perubahan transaksi.
create table if not exists public.sales_edit_history (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  edited_at timestamptz not null default now(),
  edited_by_id uuid references public.profiles(id) on delete set null,
  edited_by_name text not null default '',
  reason text not null default 'Edit transaksi',
  before_data jsonb not null,
  after_data jsonb not null
);

alter table public.sales_edit_history add column if not exists reason text not null default 'Edit transaksi';
alter table public.sales_edit_history enable row level security;
drop policy if exists "staff_read_sales_edit_history" on public.sales_edit_history;
create policy "staff_read_sales_edit_history" on public.sales_edit_history
  for select to authenticated using (public.is_staff());

create or replace function public.record_sales_edit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if to_jsonb(old) is distinct from to_jsonb(new) then
    insert into public.sales_edit_history (sale_id, edited_by_id, edited_by_name, reason, before_data, after_data)
    values (
      old.id,
      auth.uid(),
      coalesce((select name from public.profiles where id = auth.uid()), 'Staf tidak diketahui'),
      'Edit transaksi',
      to_jsonb(old),
      to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sales_edit_audit_trigger on public.sales;
create trigger sales_edit_audit_trigger
after update on public.sales
for each row execute function public.record_sales_edit();

create or replace function public.record_reservation_difference()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  booking_row public.bookings%rowtype;
  booking_items jsonb;
  sale_items jsonb;
  changed boolean;
begin
  if new.booking_id is null then return new; end if;

  select * into booking_row from public.bookings where id = new.booking_id;
  if not found then return new; end if;

  booking_items := coalesce(booking_row.items, '[]'::jsonb);
  sale_items := coalesce(new.items, '[]'::jsonb);
  changed := booking_row.nama is distinct from new.pelanggan
    or booking_row.wa is distinct from new.wa
    or booking_items is distinct from sale_items
    or booking_row.harga is distinct from new.subtotal;

  if changed then
    insert into public.sales_edit_history (sale_id, edited_by_id, edited_by_name, reason, before_data, after_data)
    values (
      new.id,
      auth.uid(),
      coalesce((select name from public.profiles where id = auth.uid()), new.kasir_nama, 'Staf tidak diketahui'),
      'Perbedaan saat penyelesaian reservasi',
      jsonb_build_object(
        'pelanggan', booking_row.nama,
        'wa', booking_row.wa,
        'items', booking_items,
        'subtotal', booking_row.harga,
        'total', booking_row.harga,
        'capster_nama', booking_row.kap_nama
      ),
      to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists reservation_difference_audit_trigger on public.sales;
create trigger reservation_difference_audit_trigger
after insert on public.sales
for each row execute function public.record_reservation_difference();

revoke all on function public.record_sales_edit() from public;
revoke all on function public.record_reservation_difference() from public;
notify pgrst, 'reload schema';
