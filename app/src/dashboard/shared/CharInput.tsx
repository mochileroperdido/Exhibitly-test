// Text input / textarea with a live character counter and hard cap. The cap
// blocks typing past the limit (rather than showing an error state) so the
// user learns the budget by feeling it, not by hitting Save and being told.
import { useId } from 'react';

export function CharInput({
  label,
  value,
  onChange,
  max,
  placeholder,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const id = useId();
  const clamp = (v: string) => (v.length > max ? v.slice(0, max) : v);
  const remain = max - value.length;
  const near = remain <= Math.max(20, Math.floor(max * 0.1));
  return (
    <label htmlFor={id} className="block">
      <span className="ins-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>{label}</span>
        <span className="ins-num-small" style={{ color: near ? 'var(--accent)' : 'var(--muted)' }}>
          {value.length}/{max}
        </span>
      </span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(clamp(e.target.value))}
          maxLength={max}
          placeholder={placeholder}
          rows={rows ?? 3}
          className="ins-input"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(clamp(e.target.value))}
          maxLength={max}
          placeholder={placeholder}
          className="ins-input"
        />
      )}
    </label>
  );
}
