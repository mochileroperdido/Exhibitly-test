import { useEffect, useState } from 'react';
import type { FormField, FormDefinition } from '../shared/content';
import { listForms, saveForm } from '../shared/content';
import { CharInput } from '../shared/CharInput';

const MAX_FIELDS = 5;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const OPTION_MAX = 24;

type Draft = Omit<FormField, 'id' | 'form_id'>;

function blankField(): Draft {
  return { kind: 'short_text', label: '', required: false, options: [], sort_order: 0 };
}

export function FormEditor({ formId, onDone }: { formId: string | null; onDone: () => void }) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [fields, setFields] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(!!formId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) return;
    listForms()
      .then((forms) => {
        const f: FormDefinition | undefined = forms.find((x) => x.id === formId);
        if (!f) { setError('Form not found'); return; }
        setName(f.name);
        setIsDefault(f.is_default);
        setFields(f.fields.map((fld) => ({
          kind: fld.kind, label: fld.label, required: fld.required, options: fld.options, sort_order: fld.sort_order,
        })));
      })
      .catch((e) => setError(e.message ?? 'load failed'))
      .finally(() => setLoading(false));
  }, [formId]);

  function updateField(i: number, patch: Partial<Draft>) {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function addField() {
    if (fields.length >= MAX_FIELDS) return;
    setFields([...fields, { ...blankField(), sort_order: fields.length }]);
  }
  function removeField(i: number) {
    setFields(fields.filter((_, idx) => idx !== i));
  }
  function moveField(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next.map((f, idx) => ({ ...f, sort_order: idx })));
  }

  async function save() {
    if (!name.trim()) { setError('Give the form a name.'); return; }
    for (const f of fields) {
      if (!f.label.trim()) { setError('Every question needs a label.'); return; }
      if (f.kind === 'single_select' && (f.options.length < MIN_OPTIONS || f.options.length > MAX_OPTIONS)) {
        setError(`Single-select needs ${MIN_OPTIONS}–${MAX_OPTIONS} options.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await saveForm({ id: formId ?? undefined, name: name.trim(), is_default: isDefault, fields });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ins-page">Loading…</div>;

  return (
    <div className="ins-page">
      <div className="ins-pagehead">
        <div>
          <nav className="ins-crumb">
            <a href="#/forms">Forms</a>
            <span className="ins-crumb-sep">/</span>
            <span className="ins-crumb-cur">{formId ? name || 'Edit form' : 'New form'}</span>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ins-btn ghost" onClick={onDone}>Cancel</button>
          <button className="ins-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save form'}</button>
        </div>
      </div>

      <div className="ins-form-grid">
        <div>

      <section className="ins-panel">
        <CharInput label="Form name" value={name} onChange={setName} max={60} placeholder="e.g. BuildTech Expo 2026" />
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          <span>Use as default for new events</span>
        </label>
      </section>

      <section className="ins-panel">
        <h2 className="ins-h2">System fields (always present)</h2>
        <p className="ins-sub">Name · Email · Consent — collected on every kiosk, regardless of which form you pick.</p>
      </section>

      <section className="ins-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="ins-h2">Custom questions</h2>
          <span className="ins-num-small" style={{ color: 'var(--muted)' }}>{fields.length}/{MAX_FIELDS}</span>
        </div>

        {fields.length === 0 && (
          <p className="ins-sub" style={{ marginTop: 12 }}>Add up to {MAX_FIELDS} custom questions. Keep them short — visitors answer on a kiosk touchscreen.</p>
        )}

        {fields.map((f, i) => (
          <div key={i} className="ins-fieldrow">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <CharInput label={`Question ${i + 1}`} value={f.label} onChange={(v) => updateField(i, { label: v })} max={40} />
                <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="ins-label" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    Type
                    <select
                      className="ins-select"
                      value={f.kind}
                      onChange={(e) => updateField(i, { kind: e.target.value as Draft['kind'], options: e.target.value === 'single_select' ? (f.options.length ? f.options : ['', '']) : [] })}
                    >
                      <option value="short_text">Short text</option>
                      <option value="email">Email</option>
                      <option value="single_select">Single select</option>
                    </select>
                  </label>
                  <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
                <p className="ins-sub" style={{ marginTop: 6, fontSize: 12 }}>
                  {f.kind === 'email'
                    ? 'Kiosk validates the format on this field.'
                    : f.kind === 'single_select'
                      ? 'Visitors tap one of the pill-shaped options.'
                      : 'Free-form input — accepts anything.'}
                </p>

                {f.kind === 'single_select' && (
                  <div style={{ marginTop: 10 }}>
                    <div className="ins-label">Options ({f.options.length}/{MAX_OPTIONS})</div>
                    {f.options.map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input
                          className="ins-input"
                          style={{ marginTop: 0, flex: 1 }}
                          value={opt}
                          maxLength={OPTION_MAX}
                          onChange={(e) => {
                            const next = [...f.options];
                            next[oi] = e.target.value.slice(0, OPTION_MAX);
                            updateField(i, { options: next });
                          }}
                          placeholder={`Option ${oi + 1}`}
                        />
                        <button
                          className="ins-btn ghost"
                          onClick={() => updateField(i, { options: f.options.filter((_, idx) => idx !== oi) })}
                          disabled={f.options.length <= MIN_OPTIONS}
                          aria-label="Remove option"
                        >×</button>
                      </div>
                    ))}
                    <button
                      className="ins-btn"
                      style={{ marginTop: 8 }}
                      onClick={() => updateField(i, { options: [...f.options, ''] })}
                      disabled={f.options.length >= MAX_OPTIONS}
                    >Add option</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="ins-btn ghost" onClick={() => moveField(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button className="ins-btn ghost" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} aria-label="Move down">↓</button>
                <button className="ins-btn ghost" onClick={() => removeField(i)} aria-label="Remove question">✕</button>
              </div>
            </div>
          </div>
        ))}

        {fields.length < MAX_FIELDS && (
          <button className="ins-btn" style={{ marginTop: 12 }} onClick={addField}>Add question</button>
        )}
      </section>

      {error && <p className="ins-warn" style={{ marginTop: 12 }}>{error}</p>}
        </div>
        <aside className="ins-form-preview">
          <div className="ins-form-preview-label">Kiosk preview</div>
          <KioskPreview name={name} fields={fields} />
        </aside>
      </div>
    </div>
  );
}

/** Approximate render of what the kiosk's LeadCapture will show. Uses the
 *  runtime brand accent if the customer has set one; otherwise Lathe's default
 *  orange. Not a shared component with LeadCapture — we don't want the
 *  dashboard to depend on kiosk internals — so this is a simple mirror
 *  updated when LeadCapture changes shape. */
function KioskPreview({ name, fields }: { name: string; fields: Draft[] }) {
  return (
    <div className="ins-kiosk-preview">
      <div className="ins-kp-head">
        <div className="ins-kp-title">Stay in touch</div>
        <div className="ins-kp-sub">We'll send specs and pricing after the show.</div>
      </div>
      <div className="ins-kp-fieldlabel">Name</div>
      <div className="ins-kp-input" />
      <div className="ins-kp-fieldlabel">Email</div>
      <div className="ins-kp-input" />
      {fields.map((f, i) => (
        <div key={i}>
          <div className="ins-kp-fieldlabel">{f.label || `Question ${i + 1}`}{f.required ? ' *' : ''}</div>
          {f.kind === 'single_select' ? (
            <div className="ins-kp-chips">
              {(f.options.length ? f.options : ['Option A', 'Option B']).map((o, j) => (
                <span key={j} className="ins-kp-chip">{o || `Option ${j + 1}`}</span>
              ))}
            </div>
          ) : (
            <div className="ins-kp-input" />
          )}
        </div>
      ))}
      <div className="ins-kp-consent">
        <span className="ins-kp-checkbox" />
        <span>I agree that my details may be shared with this exhibitor…</span>
      </div>
      <div className="ins-kp-submit">Send it over</div>
      <div className="ins-kp-note">{name ? `Preview of "${name}"` : 'Preview updates as you edit'}</div>
    </div>
  );
}
