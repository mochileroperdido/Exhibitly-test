export interface Hotspot {
  id: string;
  title: string;
  description: string;
  /** model-viewer data-position, in the model's local space: "x y z" */
  position: string;
  /** model-viewer data-normal: "x y z" */
  normal: string;
}

export interface MediaItem {
  id: string;
  /** Only 'video' is built today; typed as a union so photos can be added later. */
  type: 'video';
  src: string;
  /** Optional poster still; when absent the <video> shows its own first frame. */
  poster?: string;
  title: string;
}

export interface CatalogEntry {
  id: string;
  label: string;
  subtitle: string;
  /** One-line hook shown on the overview card. */
  tagline: string;
  /** 2–3 sentence product intro for the overview card. */
  overview: string;
  /** Key specs shown as a small grid on the overview card. */
  specs: { label: string; value: string }[];
  /** Per-product media gallery (silent how-to videos for the demo). */
  media: MediaItem[];
  modelUrl: string;
  /** Pipeline/source description — internal telemetry, shown only in the debug view. */
  source: string;
  fileSizeMB: number;
  triangleCount: number;
  hotspots: Hotspot[];
}
