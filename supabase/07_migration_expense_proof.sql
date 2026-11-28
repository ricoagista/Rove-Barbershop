-- Bukti foto pengeluaran disimpan sebagai data URL terkompresi di row expense.
alter table public.expenses add column if not exists bukti_url text;
