import type { DetailedHTMLProps, HTMLAttributes } from 'react';

export interface ModelViewerElement extends HTMLElement {
  cameraControls: boolean;
  autoRotate: boolean;
  cameraOrbit: string;
  fieldOfView: string;
  loaded: boolean;
  src: string;
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
