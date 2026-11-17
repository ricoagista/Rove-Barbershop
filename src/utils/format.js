export const rp = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0);

// Mengembalikan tanggal YYYY-MM-DD dalam zona waktu WIB (UTC+7)
export function ld(d = new Date()) {
  const dateObj = d instanceof Date ? d : new Date(d);
  return new Date(dateObj.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

export const dstr = (ts) => ld(new Date(ts));

export const tstr = (ts) =>
  new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const slug = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export function normWa(x) {
  let d = String(x || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : '';
}

export function fmtPhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  return /^0\d{10,12}$/.test(d) ? d.replace(/^(\d{4})(\d{4})(\d+)$/, '$1 $2 $3') : v;
}

export function roleName(r) {
  return { owner: 'Owner', kasir: 'Kasir', capster: 'Capster' }[r] || r;
}

export function rangeOf(per, d) {
  if (per === 'bulan') {
    const y = +d.slice(0, 4);
    const m = +d.slice(5, 7);
    const lastDay = String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0');
    return [d.slice(0, 7) + '-01', d.slice(0, 7) + '-' + lastDay];
  }
  if (per === 'minggu') {
    const t = new Date(d + 'T00:00:00Z');
    const w = (t.getUTCDay() + 6) % 7;
    const a = new Date(t.getTime() - w * 86400000);
    const b = new Date(a.getTime() + 6 * 86400000);
    return [a.toISOString().slice(0, 10), b.toISOString().slice(0, 10)];
  }
  return [d, d];
}

export const inRange = (x, R) => x >= R[0] && x <= R[1];

export function downloadCsv(filename, rows) {
  const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csvContent = '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\n');
  try {
    const u = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = u;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    return true;
  } catch {
    return false;
  }
}