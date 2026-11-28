-- Staf hanya boleh mengubah pengeluaran yang mereka buat sendiri. Owner tetap full access.
drop policy if exists "owner_all_expenses" on public.expenses;
create policy "owner_all_expenses" on public.expenses for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists "staff_update_own_expenses" on public.expenses;
create policy "staff_update_own_expenses" on public.expenses for update to authenticated
  using (public.is_staff() and (public.is_owner() or oleh_id = auth.uid()))
  with check (public.is_staff() and (public.is_owner() or oleh_id = auth.uid()));
