import { useRef, useState } from 'react';
import type { ModelViewerElement } from '../../model-viewer';
import { CharInput } from '../shared/CharInput';

// Hotspot the editor holds in local state before saving. `position` and
// `normal` follow model-viewer's "x y z" string format (matches DB shape).
export interface DraftHotspot {
  slug: string;
  title: string;
  description: string;
  position: string;
  normal: string;
}

// Character budgets measured against the kiosk's FeatureCard (portrait 440px,
// landscape 348px, text-base ~16px, leading-relaxed) — 220 gives 4–6 lines.
const TITLE_MAX = 28;
const DESC_MAX = 220;

export function HotspotPicker({
  modelUrl,
  hotspots,
  onChange,
}: {
  modelUrl: string;
  hotspots: DraftHotspot[];
  onChange: (next: DraftHotspot[]) => void;
}) {
  const mvRef = useRef<ModelViewerElement | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent<HTMLElement>) {
    const mv = mvRef.current;
    if (!mv || !mv.loaded) return;
    const hit = mv.positionAndNormalFromPoint(e.clientX, e.clientY);
    if (!hit) {
      setError('Click on the model itself — that spot missed the mesh.');
      return;
    }
    setError(null);
    const pos = `${hit.position.x.toFixed(4)} ${hit.position.y.toFixed(4)} ${hit.position.z.toFixed(4)}`;
    const norm = `${hit.normal.x.toFixed(4)} ${hit.normal.y.toFixed(4)} ${hit.normal.z.toFixed(4)}`;
    const next: DraftHotspot = {
      slug: `h_${crypto.randomUUID().slice(0, 6)}`,
      title: '',
      description: '',
      position: pos,
      normal: norm,
    };
    const list = [...hotspots, next];
    onChange(list);
    setSelected(list.length - 1);
  }

  function updateAt(i: number, patch: Partial<DraftHotspot>) {
    onChange(hotspots.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }
  function removeAt(i: number) {
    onChange(hotspots.filter((_, idx) => idx !== i));
    setSelected(null);
  }

  return (
    <div className="ins-hp-grid">
      <div className="ins-hp-viewer" onClick={handleClick}>
        <model-viewer
          ref={mvRef}
          src={modelUrl}
          camera-controls
          exposure="1"
          shadow-intensity="0.4"
          style={{ width: '100%', height: '100%', background: 'var(--panel)' }}
        >
          {hotspots.map((h, i) => (
            <button
              key={i}
              slot={`hotspot-${i}`}
              data-position={h.position}
              data-normal={h.normal}
              className={'ins-hp-dot' + (selected === i ? ' is-selected' : '')}
              onClick={(e) => { e.stopPropagation(); setSelected(i); }}
              aria-label={`Hotspot ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </model-viewer>
        <p className="ins-sub" style={{ padding: '8px 10px', margin: 0 }}>
          Click a spot on the model to add a hotspot. Click an existing dot to edit it.
        </p>
      </div>

      <div className="ins-hp-side">
        {error && <p className="ins-warn">{error}</p>}
        {selected === null ? (
          hotspots.length === 0
            ? <p className="ins-sub">No hotspots yet. Click on the model to place one.</p>
            : <p className="ins-sub">Select a dot on the model to edit its label.</p>
        ) : (
          (() => {
            const h = hotspots[selected];
            if (!h) return null;
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ins-label">Hotspot {selected + 1}</span>
                  <button className="ins-btn ghost" onClick={() => removeAt(selected)}>Remove</button>
                </div>
                <CharInput
                  label="Title"
                  value={h.title}
                  onChange={(v) => updateAt(selected, { title: v })}
                  max={TITLE_MAX}
                  placeholder="e.g. Keyless Chuck"
                />
                <div style={{ marginTop: 10 }}>
                  <CharInput
                    label="Description"
                    value={h.description}
                    onChange={(v) => updateAt(selected, { description: v })}
                    max={DESC_MAX}
                    multiline
                    rows={5}
                    placeholder="One or two sentences that fit on the kiosk feature card."
                  />
                </div>
              </div>
            );
          })()
        )}

        {hotspots.length > 0 && (
          <ul className="ins-hp-list">
            {hotspots.map((h, i) => (
              <li key={i}>
                <button
                  className={'ins-hp-listbtn' + (selected === i ? ' is-selected' : '')}
                  onClick={() => setSelected(i)}
                >
                  <span className="ins-hp-listnum">{i + 1}</span>
                  <span>{h.title || <em style={{ color: 'var(--muted)' }}>Untitled</em>}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
