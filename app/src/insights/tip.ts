// Shared hover-tooltip helpers for the insights charts. Operates on a single
// fixed element (#ins-tip) rendered by InsightsApp.
const tipEl = () => document.getElementById('ins-tip');

export function showTip(e: React.PointerEvent, text: string) {
  const t = tipEl();
  if (!t) return;
  t.textContent = text;
  t.style.opacity = '1';
  moveTip(e);
}
export function moveTip(e: React.PointerEvent) {
  const t = tipEl();
  if (!t) return;
  t.style.left = Math.min(e.clientX + 14, window.innerWidth - t.offsetWidth - 8) + 'px';
  t.style.top = e.clientY - 34 + 'px';
}
export function hideTip() {
  const t = tipEl();
  if (t) t.style.opacity = '0';
}
