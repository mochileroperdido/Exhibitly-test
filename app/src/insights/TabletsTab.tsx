import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { listKiosks, addTablet, setKioskActive, kioskLink, type Kiosk } from './shows';

function Qr({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let ok = true;
    QRCode.toDataURL(text, { margin: 1, width: 160 }).then((d) => ok && setSrc(d)).catch(() => {});
    return () => {
      ok = false;
    };
  }, [text]);
  return src ? <img src={src} width={120} height={120} alt="Kiosk QR code" style={{ borderRadius: 8 }} /> : null;
}

// Tablet management for one event: each tablet's link + QR, add, and revoke.
export function TabletsTab({ showId }: { showId: string }) {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [err, setErr] = useState('');

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
            <div className="ins-tabletbody">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ins-linkrow">
                  <input readOnly className="ins-field" value={kioskLink(k.token)} onFocus={(e) => e.target.select()} />
                  <button className="ins-btn" onClick={() => copy(k.token!)}>{copied === k.token ? 'Copied' : 'Copy'}</button>
                  <a className="ins-btn" href={kioskLink(k.token)} target="_blank" rel="noreferrer">Open ↗</a>
                </div>
              </div>
              <Qr text={kioskLink(k.token)} />
            </div>
          )}
        </div>
      ))}

      <div className="ins-linkrow" style={{ marginTop: 16, maxWidth: 460 }}>
        <input className="ins-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add tablet (e.g. Tablet 2)" />
        <button className="ins-btn primary" disabled={busy || !label.trim()} onClick={add}>{busy ? 'Adding…' : 'Add tablet'}</button>
      </div>
    </div>
  );
}
