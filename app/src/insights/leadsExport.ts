import type { LeadRow } from './dataSource';

// Client-side CSV export so the exhibitor owns their leads (GDPR portability).
// Runs off the authed, RLS-scoped rows already loaded into the dashboard.

function csvCell(value: string): string {
  // Quote if the value contains a comma, quote, or newline; double embedded quotes.
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function leadsToCsv(leads: LeadRow[]): string {
  const header = ['Name', 'Email', 'Interest', 'Explored', 'Product', 'Captured at'];
  const rows = leads.map((l) =>
    [
      l.name,
      l.email,
      l.interest ?? '',
      Array.isArray(l.explored) ? l.explored.join(' · ') : '',
      l.product_key ?? '',
      new Date(l.captured_at).toISOString(),
    ]
      .map((v) => csvCell(String(v)))
      .join(','),
  );
  return [header.join(','), ...rows].join('\r\n');
}

export function downloadLeadsCsv(leads: LeadRow[], filename = 'lathe-leads.csv') {
  const blob = new Blob(['﻿' + leadsToCsv(leads)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
