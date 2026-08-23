import { useKioskStore } from '../store/kioskStore';
import { catalog } from '../data/catalog';

function toCSV(rows: ReturnType<typeof useKioskStore.getState>['leads']): string {
  const header = ['Name', 'Email', 'Interest', 'Variant viewed', 'Hotspots viewed', 'Videos viewed', 'Captured at'];
  const lines = rows.map((r) =>
    [r.name, r.email, r.interest, r.variantViewed, r.hotspotsViewed.join('; '), r.videosViewed.join('; '), r.createdAt]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export function LeadsDebugView() {
  const open = useKioskStore((s) => s.leadsViewOpen);
  const leads = useKioskStore((s) => s.leads);
  const activeEntryId = useKioskStore((s) => s.activeEntryId);
  const lastLoadMs = useKioskStore((s) => s.lastLoadMs);
  const toggle = useKioskStore((s) => s.toggleLeadsView);
  const clearLeads = useKioskStore((s) => s.clearLeads);

  if (!open) return null;

  const entry = catalog.find((e) => e.id === activeEntryId) ?? catalog[0];

  const downloadCSV = () => {
    const blob = new Blob([toCSV(leads)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exhibly-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="absolute inset-0 z-[60] bg-graphite text-mist p-6 overflow-auto"
      data-screen-label="Leads debug view"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="font-display font-bold text-3xl uppercase tracking-[0.02em]">Captured leads</div>
          <div className="font-mono text-xs text-mist/50 mt-1">
            Internal view · tap the watermark 5× to reopen · not visitor-facing
          </div>
          {/* Model telemetry — relocated here from the visitor UI. */}
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-mist/45 mt-2">
            {entry.source} · {entry.fileSizeMB.toFixed(2)} MB · {entry.triangleCount.toLocaleString()} tris
            {lastLoadMs != null && ` · loaded in ${lastLoadMs}ms`}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            disabled={!leads.length}
            className="focus-ring min-h-11 px-4 rounded-full font-sans text-sm font-semibold text-graphite border-none cursor-pointer disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            Download CSV
          </button>
          <button
            onClick={clearLeads}
            disabled={!leads.length}
            className="focus-ring min-h-11 px-4 rounded-full font-sans text-sm border border-mist/30 bg-transparent text-mist cursor-pointer disabled:opacity-40"
          >
            Clear
          </button>
          <button
            onClick={toggle}
            className="focus-ring min-h-11 px-4 rounded-full font-sans text-sm border border-mist/30 bg-transparent text-mist cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="font-mono text-sm text-mist/40 mt-10">
          No leads captured yet in this session. Submit the lead form to see it appear here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-mist/20 font-mono text-[10px] uppercase tracking-[0.12em] text-mist/50">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Interest</th>
                <th className="py-2 pr-4">Variant viewed</th>
                <th className="py-2 pr-4">Hotspots viewed</th>
                <th className="py-2 pr-4">Videos viewed</th>
                <th className="py-2 pr-4">Captured</th>
              </tr>
            </thead>
            <tbody>
              {[...leads].reverse().map((lead) => (
                <tr key={lead.id} className="border-b border-mist/10">
                  <td className="py-2.5 pr-4">{lead.name}</td>
                  <td className="py-2.5 pr-4">{lead.email}</td>
                  <td className="py-2.5 pr-4">{lead.interest || '—'}</td>
                  <td className="py-2.5 pr-4">{lead.variantViewed}</td>
                  <td className="py-2.5 pr-4">{lead.hotspotsViewed.join(', ') || '—'}</td>
                  <td className="py-2.5 pr-4">{lead.videosViewed.join(', ') || '—'}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-mist/60">
                    {new Date(lead.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
