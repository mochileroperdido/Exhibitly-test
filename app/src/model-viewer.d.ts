import type { DetailedHTMLProps, HTMLAttributes } from 'react';

export interface ModelViewerElement extends HTMLElement {
  cameraControls: boolean;
  autoRotate: boolean;
  cameraOrbit: string;
  fieldOfView: string;
  loaded: boolean;
  src: string;
  /** Current orbit; radius is in meters. */
  getCameraOrbit(): { theta: number; phi: number; radius: number };
  /** Current vertical field of view, in degrees. */
  getFieldOfView(): number;
}

type ModelViewerJSX = DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
  src?: string;
  alt?: string;
  cameraControls?: boolean;
  autoRotate?: boolean;
  autoRotateDelay?: number;
  cameraOrbit?: string;
  minCameraOrbit?: string;
  maxCameraOrbit?: string;
  fieldOfView?: string;
  minFieldOfView?: string;
  maxFieldOfView?: string;
  exposure?: number | string;
  shadowIntensity?: number | string;
  environmentImage?: string;
  disableZoom?: boolean;
  disablePan?: boolean;
  interactionPrompt?: string;
  interpolationDecay?: number | string;
  loading?: string;
  reveal?: string;
};

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSX;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSX;
    }
  }
}
