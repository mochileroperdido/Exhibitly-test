import { useEffect, useState } from 'react';
import type { FormDefinition } from '../shared/content';
import { listForms, deleteForm } from '../shared/content';
import { loadWithSchemaGuard } from '../shared/schemaGuard';
import { FormEditor } from './FormEditor';

// #/forms         → list
// #/forms/new     → new form
// #/forms/:id     → edit form
function parseFormRoute(hash: string): { mode: 'list' } | { mode: 'edit'; id: string | null } {
  const m = /^#\/forms(?:\/([^/?]+))?/.exec(hash);
  if (!m) return { mode: 'list' };
  if (!m[1]) return { mode: 'list' };
  if (m[1] === 'new') return { mode: 'edit', id: null };
  return { mode: 'edit', id: m[1] };
}

export function FormsPage() {
  const [route, setRoute] = useState(() => parseFormRoute(window.location.hash));
  const [forms, setForms] = useState<FormDefinition[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setRoute(parseFormRoute(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (route.mode !== 'list') return;
    loadWithSchemaGuard('forms', () => listForms(), [] as FormDefinition[])
      .then(setForms)
      .catch((e) => setError(e.message ?? 'load failed'));
  }, [route.mode]);

  if (route.mode === 'edit') {
    return (
      <FormEditor
        formId={route.id}
        onDone={() => { window.location.hash = '#/forms'; }}
      />
    );
  }

  if (forms === null) return <div className="ins-page">Loading…</div>;

  return (
    <div className="ins-page">
      <div className="ins-pagehead">
        <div>
          <h1 className="ins-h1">Forms</h1>
          <p className="ins-sub">Name, email and consent are always collected. Add up to 5 custom questions to build a form for a specific event.</p>
        </div>
        <a className="ins-btn primary" href="#/forms/new">New form</a>
      </div>

      {error && <p className="ins-warn">{error}</p>}

      {forms.length === 0 ? (
        <div className="ins-empty" style={{ padding: '28px 20px' }}>
          <p className="ins-empty-body">No custom forms yet — every event uses the default (name, email, area of interest).</p>
          <a className="ins-btn primary" href="#/forms/new">Build a form</a>
        </div>
      ) : (
        <div className="ins-cards">
          {forms.map((f) => (
            <div key={f.id} className="ins-card">
              <div className="ins-card-top">
                <a className="ins-card-name" href={`#/forms/${f.id}`}>{f.name}</a>
                {f.is_default && <span className="ins-badge">Default</span>}
              </div>
              <div className="ins-card-dates">{f.fields.length} custom question{f.fields.length === 1 ? '' : 's'}</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <a className="ins-btn" href={`#/forms/${f.id}`}>Edit</a>
                <button
                  className="ins-btn ghost"
                  onClick={async () => {
                    if (!confirm(`Delete form "${f.name}"? Events still using it will fall back to the default.`)) return;
                    await deleteForm(f.id);
                    setForms(forms.filter((x) => x.id !== f.id));
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
