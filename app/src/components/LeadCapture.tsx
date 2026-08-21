import { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';

const INTERESTS = ['Pricing', 'Demo unit', 'Partnership'];

export function LeadCapturePill({
  visible,
  orientation,
  onOpen,
}: {
  visible: boolean;
  orientation: 'portrait' | 'landscape';
  onOpen: () => void;
}) {
  const posClass = orientation === 'portrait' ? 'top-4 right-4' : 'bottom-5 right-5';
  return (
    <button
      onClick={onOpen}
      onPointerDown={(e) => e.stopPropagation()}
      className={
        'focus-ring absolute z-[35] min-h-12 px-5.5 rounded-full border-none text-graphite font-semibold text-base cursor-pointer shadow-[0_4px_14px_rgba(0,0,0,.3)] transition-opacity ' +
        posClass +
        (visible ? ' opacity-100' : ' opacity-0 pointer-events-none')
      }
      style={{ background: 'var(--accent)' }}
    >
      Leave your details
    </button>
  );
}

export function LeadCaptureForm() {
  const leadOpen = useKioskStore((s) => s.leadOpen);
  const leadDone = useKioskStore((s) => s.leadDone);
  const leadError = useKioskStore((s) => s.leadError);
  const leadName = useKioskStore((s) => s.leadName);
  const leadEmail = useKioskStore((s) => s.leadEmail);
  const leadInterest = useKioskStore((s) => s.leadInterest);
  const setLeadField = useKioskStore((s) => s.setLeadField);
  const submitLead = useKioskStore((s) => s.submitLead);
  const closeLead = useKioskStore((s) => s.closeLead);

  useEffect(() => {
    if (!leadDone) return;
    const t = setTimeout(closeLead, 2400);
    return () => clearTimeout(t);
  }, [leadDone, closeLead]);

  if (!leadOpen) return null;

  return (
    <div
      onClick={closeLead}
      onPointerDown={(e) => e.stopPropagation()}
      data-screen-label="Lead capture"
      className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center animate-[fade-in_0.25s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(440px,90vw)] bg-mist text-graphite border border-black/8 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,.35)] px-6.5 pt-6.5 pb-6 animate-[card-in_0.28s_ease-out]"
      >
        {!leadDone ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-bold text-[28px] tracking-[0.02em] uppercase">Stay in touch</div>
                <div className="mt-0.5 text-sm text-graphite/60">We'll send specs and pricing after the show.</div>
              </div>
              <button
                aria-label="Close form"
                onClick={closeLead}
                className="focus-ring w-11 h-11 -mt-2.5 -mr-3 bg-transparent border-none text-graphite/55 text-2xl cursor-pointer rounded-lg"
              >
                ×
              </button>
            </div>

            <label className="block mt-4.5 font-mono text-[10px] tracking-[0.16em] uppercase text-graphite/55">
              Name
              <input
                value={leadName}
                onChange={(e) => setLeadField('leadName', e.target.value)}
                className="focus-ring block w-full box-border mt-1.5 px-3.5 py-3 font-sans text-base bg-white border border-line rounded-[10px] text-graphite"
              />
            </label>
            <label className="block mt-3.5 font-mono text-[10px] tracking-[0.16em] uppercase text-graphite/55">
              Email
              <input
                value={leadEmail}
                onChange={(e) => setLeadField('leadEmail', e.target.value)}
                type="email"
                className="focus-ring block w-full box-border mt-1.5 px-3.5 py-3 font-sans text-base bg-white border border-line rounded-[10px] text-graphite"
              />
            </label>

            <div className="mt-3.5 font-mono text-[10px] tracking-[0.16em] uppercase text-graphite/55">
              Area of interest
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {INTERESTS.map((label) => {
                const selected = leadInterest === label;
                return (
                  <button
                    key={label}
                    onClick={() => setLeadField('leadInterest', label)}
                    className={
                      'focus-ring min-h-11 px-4 whitespace-nowrap rounded-full font-sans text-[15px] cursor-pointer transition-colors border ' +
                      (selected ? 'text-graphite border-transparent font-semibold' : 'bg-transparent text-graphite border-line')
                    }
                    style={selected ? { background: 'var(--accent)' } : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {leadError && <div className="mt-3 text-sm text-[#c0341d]">Please add your name and email.</div>}

            <button
              onClick={submitLead}
              className="focus-ring block w-full mt-5 py-3.5 border-none rounded-full text-graphite font-semibold text-base cursor-pointer"
              style={{ background: 'var(--accent)' }}
            >
              Send it over
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4.5 text-center">
            <span
              className="w-13 h-13 rounded-full text-graphite flex items-center justify-center text-2xl font-semibold"
              style={{ background: 'var(--accent)', width: 52, height: 52 }}
            >
              ✓
            </span>
            <span className="font-display font-bold text-2xl tracking-[0.02em] uppercase">Thanks — you're in</span>
            <span className="text-[15px] text-graphite/60">We'll be in touch after the show. Keep exploring.</span>
          </div>
        )}
      </div>
    </div>
  );
}
