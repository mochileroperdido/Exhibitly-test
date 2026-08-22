// Anonymous engagement analytics — the data layer behind the Insights dashboard.
// Events are product-scoped and carry no PII except the lead_capture payload
// (which in production lives in a separate, access-controlled store).

export type EventType =
  | 'session_start'
  | 'session_end'
  | 'product_view'
  | 'hotspot_open'
  | 'video_play'
  | 'lead_capture';

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  /** epoch ms */
  ts: number;
  sessionId: string;
  productId: string;
  payload?: Record<string, unknown>;
}

export interface LeadRecord {
  name: string;
  email: string;
  interest: string;
  explored: string[];
  ts: number;
  productId: string;
}

export interface Aggregates {
  kpis: {
    sessions: number;
    avgTimeMs: number;
    engagementPct: number;
    conversionPct: number;
    leads: number;
    videos: number;
  };
  attention: { title: string; dwellMs: number; taps: number }[];
  interest: { name: string; count: number }[];
  videos: { title: string; plays: number; completionPct: number }[];
  traffic: {
    hour: { label: string; value: number }[];
    day: { label: string; value: number }[];
  };
  leads: LeadRecord[];
  byProduct: { productId: string; label: string; sessions: number; engagementPct: number; leads: number }[];
}

export interface Deltas {
  leads?: number;
  sessions?: number;
  label?: string;
}
