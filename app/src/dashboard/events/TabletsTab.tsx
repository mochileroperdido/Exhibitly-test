import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { listKiosks, addTablet, setKioskActive, kioskLink, type Kiosk } from './shows';

const slug = (s: string) => s.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'tablet';

// Tablet management for one event: each tablet on a single line (link · copy ·
// open · QR), with the QR shown in a popup that can be downloaded as a PNG.
export function TabletsTab({ showId, eventName }: { showId: string; eventName: string }) {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [err, setErr] = useState('');
  const [qr, setQr] = useState<{ label: string; link: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setKiosks(await listKiosks(showId));
    } catch (e) {
      setErr((e as Error)?.message ?? 'Failed to load tablets');
    }
  }, [showId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const copy = (token: string) => {
    navigator.clipboard?.writeText(kioskLink(token)).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  const add = async () => {
    if (!label.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await addTablet(showId, label.trim());
      setLabel('');
      await refresh();
    } catch (e) {
      setErr((e as Error)?.message ?? 'Could not add tablet');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    setErr('');
    try {
      await setKioskActive(id, active);
      await refresh();
    } catch (e) {
      setErr((e as Error)?.message ?? 'Could not update tablet');
    }
  };

  return (
    <div>
      <p className="ins-sub" style={{ marginTop: 0 }}>
        Open a tablet's link (or scan its QR) on the booth device to bind it to this event. Everything it captures is
        attributed to this event and tablet.
      </p>
      {err && <div className="ins-panel" style={{ color: 'var(--bad, #c0341d)', marginBottom: 12 }}>{err}</div>}

      {kiosks.map((k) => (
        <div key={k.id} className="ins-tablet">
          <div className="ins-tablet-head">
            <b>{k.label}{k.active ? '' : ' · revoked'}</b>
            <button className="ins-btn" onClick={() => toggle(k.id, !k.active)}>{k.active ? 'Revoke' : 'Re-enable'}</button>
          </div>
          {k.token && k.active && (
            <div className="ins-tablet-row">
              <input readOnly className="ins-field" value={kioskLink(k.token)} onFocus={(e) => e.target.select()} />
              <button className="ins-btn" onClick={() => copy(k.token!)}>{copied === k.token ? 'Copied' : 'Copy'}</button>
              <a className="ins-btn" href={kioskLink(k.token)} target="_blank" rel="noreferrer">Open ↗</a>
              <button className="ins-btn" onClick={() => setQr({ label: k.label, link: kioskLink(k.token!) })}>QR</button>
            </div>
          )}
        </div>
      ))}

      <div className="ins-tablet-row" style={{ marginTop: 16, maxWidth: 460 }}>
        <input className="ins-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add tablet (e.g. Tablet 2)" />
        <button className="ins-btn primary" disabled={busy || !label.trim()} onClick={add}>{busy ? 'Adding…' : 'Add tablet'}</button>
      </div>

      {qr && <QrModal label={qr.label} link={qr.link} eventName={eventName} onClose={() => setQr(null)} />}
    </div>
  );
}

function QrModal({ label, link, eventName, onClose }: { label: string; link: string; eventName: string; onClose: () => void }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let ok = true;
    QRCode.toDataURL(link, { margin: 2, width: 240 }).then((d) => ok && setSrc(d)).catch(() => {});
    return () => {
      ok = false;
    };
  }, [link]);

  const download = async () => {
    const png = await QRCode.toDataURL(link, { margin: 2, width: 512 });
    const a = document.createElement('a');
    a.href = png;
    a.download = `${slug(eventName)}-${slug(label)}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="ins-scrim" onClick={onClose}>
      <div className="ins-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 340 }}>
        <h2 className="ins-h2" style={{ marginTop: 0 }}>{label}</h2>
        <p className="ins-sub" style={{ marginTop: 2 }}>Scan on the booth device to bind it to this event.</p>
        <div style={{ margin: '18px auto', width: 240, height: 240, background: '#fff', borderRadius: 12, display: 'grid', placeItems: 'center' }}>
          {src && <img src={src} width={216} height={216} alt={`QR code for ${label}`} />}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="ins-btn" onClick={onClose}>Close</button>
          <button className="ins-btn primary" onClick={download}>Download QR</button>
        </div>
      </div>
    </div>
  );
}
