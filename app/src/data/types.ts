export interface Hotspot {
  id: string;
  title: string;
  description: string;
  /** model-viewer data-position, in the model's local space: "x y z" */
  position: string;
  /** model-viewer data-normal: "x y z" */
  normal: string;
}

export interface CatalogEntry {
  id: string;
  label: string;
  subtitle: string;
  modelUrl: string;
  /** Pipeline/source description, shown in the comparison stats chip. */
  source: string;
  fileSizeMB: number;
  triangleCount: number;
  hotspots: Hotspot[];
}
