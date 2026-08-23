import { showTip, hideTip } from './tip';

export function TrafficBars({
  data,
  markers = {},
}: {
  data: { label: string; value: number }[];
  markers?: Record<string, string>;
}) {
  const W = 640, H = 210, pad = { l: 34, r: 8, t: 16, b: 26 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, n = data.length;
  const bw = n <= 2 ? Math.min(110, (iw / n) * 0.5) : (iw / n) * 0.62;
  const gx = (i: number) => pad.l + ((i + 0.5) / n) * iw;
  const gy = (v: number) => pad.t + ih - (v / max) * ih;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Traffic">
      {[0, 0.5, 1].map((f) => {
        const y = pad.t + ih - f * ih;
        return (
          <g key={f}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="var(--edge)" />
            <text x={pad.l - 8} y={y + 3} textAnchor="end" className="ins-axis">{Math.round(max * f)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = gx(i) - bw / 2, y = gy(d.value), h = pad.t + ih - y;
        const peak = d.value === max;
        const mk = markers[d.label];
        return (
          <g key={d.label}>
            {mk && (
              <>
                <line x1={gx(i)} y1={pad.t} x2={gx(i)} y2={pad.t + ih} stroke="var(--accent)" strokeDasharray="3 3" strokeOpacity="0.5" />
                <text x={gx(i)} y={pad.t - 4} textAnchor="middle" className="ins-axis" fill="var(--accent)">{mk}</text>
              </>
            )}
            <rect
              x={x} y={y} width={bw} height={h} rx="4"
              fill={peak ? 'var(--accent)' : 'var(--blue)'} style={{ cursor: 'pointer' }}
              onPointerMove={(e) => showTip(e, `${d.label} — ${d.value} sessions`)}
              onPointerLeave={hideTip}
            />
            <text x={gx(i)} y={H - 8} textAnchor="middle" className="ins-axis">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
