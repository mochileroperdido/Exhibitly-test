import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { catalog } from '../data/catalog';
import * as analytics from '../analytics';

const hotspotTitle = (entryId: string, hotspotId: string) =>
  catalog.find((c) => c.id === entryId)?.hotspots.find((h) => h.id === hotspotId)?.title ?? hotspotId;
const mediaTitle = (entryId: string, mediaId: string) =>
  catalog.find((c) => c.id === entryId)?.media.find((m) => m.id === mediaId)?.title ?? mediaId;

export type Mode = 'attract' | 'explore';

// GDPR consent captured with every lead. Bump the version when the wording
// changes so each stored record proves exactly what the visitor agreed to.
export const CONSENT_VERSION = '2026-08-1';
export const CONSENT_TEXT =
  'I agree that my details may be shared with this exhibitor to follow up about their products.';

export interface Lead {
  id: string;
  name: string;
  email: string;
  interest: string;
  createdAt: string;
  variantViewed: string;
  hotspotsViewed: string[];
  consentGiven: boolean;
  consentText: string;
  consentVersion: string;
  videosViewed: string[];
}

interface KioskState {
  mode: Mode;
  activeEntryId: string;
  activeHotspotId: string | null;
  switcherOpen: boolean;
  autoSpin: boolean;
  overviewOpen: boolean;
  mediaOpen: boolean;
  activeMediaId: string | null;
  leadOpen: boolean;
  leadDone: boolean;
  leadError: boolean;
  leadName: string;
  leadEmail: string;
  leadInterest: string;
  leadConsent: boolean;
  leadsViewOpen: boolean;
  sessionHotspotsViewed: string[];
  sessionMediaViewed: string[];
  lastLoadMs: number | null;
  leads: Lead[];

  wake: () => void;
  sleep: () => void;
  poke: () => void;
  selectEntry: (id: string) => void;
  selectHotspot: (id: string | null) => void;
  setSwitcherOpen: (open: boolean) => void;
  toggleAutoSpin: () => void;
  openOverview: () => void;
  closeOverview: () => void;
  openMedia: () => void;
  closeMedia: () => void;
  selectMedia: (id: string) => void;
  openLead: () => void;
  closeLead: () => void;
  setLeadField: (field: 'leadName' | 'leadEmail' | 'leadInterest', value: string) => void;
  setLeadConsent: (v: boolean) => void;
  submitLead: () => void;
  toggleLeadsView: () => void;
  clearLeads: () => void;
  setLoadMs: (ms: number) => void;
}

const firstEntryId = catalog[0].id;

export const useKioskStore = create<KioskState>()(
  persist(
    (set, get) => ({
      mode: 'attract',
      activeEntryId: firstEntryId,
      activeHotspotId: null,
      switcherOpen: false,
      autoSpin: false,
      overviewOpen: false,
      mediaOpen: false,
      activeMediaId: null,
      leadOpen: false,
      leadDone: false,
      leadError: false,
      leadName: '',
      leadEmail: '',
      leadInterest: '',
      leadConsent: false,
      leadsViewOpen: false,
      sessionHotspotsViewed: [],
      sessionMediaViewed: [],
      lastLoadMs: null,
      leads: [],

      // Entering explore auto-opens the product overview once per session, so a
      // visitor who never taps a hotspot still gets an intro.
      wake: () => {
        analytics.startSession(get().activeEntryId);
        set({ mode: 'explore', switcherOpen: true, overviewOpen: true });
      },

      sleep: () => {
        analytics.endSession();
        set({
          mode: 'attract',
          activeHotspotId: null,
          switcherOpen: false,
          autoSpin: false,
          overviewOpen: false,
          mediaOpen: false,
          activeMediaId: null,
          leadOpen: false,
          leadDone: false,
          leadError: false,
          leadName: '',
          leadEmail: '',
          leadInterest: '',
          leadConsent: false,
          sessionHotspotsViewed: [],
          sessionMediaViewed: [],
        });
      },

      poke: () => {
        if (get().mode === 'explore' && !get().switcherOpen) set({ switcherOpen: true });
      },

      // Hotspot ids are shared across catalog entries (both variants show the
      // same physical features), so switching the model variant deliberately
      // keeps sessionHotspotsViewed accumulating rather than resetting it —
      // that history is what makes the lead's "what did they explore" context
      // meaningful to a follow-up sales rep.
      selectEntry: (id) => {
        analytics.viewProduct(id);
        set({ activeEntryId: id, activeHotspotId: null });
      },

      selectHotspot: (id) => {
        const s = get();
        const willOpen = s.activeHotspotId === id ? null : id;
        if (willOpen) analytics.openHotspot(hotspotTitle(s.activeEntryId, willOpen));
        else analytics.closeHotspot();
        set({
          activeHotspotId: willOpen,
          sessionHotspotsViewed:
            id && !s.sessionHotspotsViewed.includes(id)
              ? [...s.sessionHotspotsViewed, id]
              : s.sessionHotspotsViewed,
        });
      },

      setSwitcherOpen: (open) => set({ switcherOpen: open }),

      toggleAutoSpin: () => set((s) => ({ autoSpin: !s.autoSpin })),

      openOverview: () => set({ overviewOpen: true }),
      closeOverview: () => set({ overviewOpen: false }),

      openMedia: () => set({ mediaOpen: true, activeMediaId: null }),
      closeMedia: () => set({ mediaOpen: false, activeMediaId: null }),
      selectMedia: (id) => {
        analytics.playVideo(mediaTitle(get().activeEntryId, id));
        set((s) => ({
          activeMediaId: id,
          sessionMediaViewed: s.sessionMediaViewed.includes(id)
            ? s.sessionMediaViewed
            : [...s.sessionMediaViewed, id],
        }));
      },

      openLead: () => set({ leadOpen: true, leadDone: false, leadError: false }),
      closeLead: () =>
        set({
          leadOpen: false,
          leadDone: false,
          leadError: false,
          leadName: '',
          leadEmail: '',
          leadInterest: '',
          leadConsent: false,
        }),

      setLeadField: (field, value) => set({ [field]: value } as Partial<KioskState>),
      setLeadConsent: (v) => set({ leadConsent: v }),

      submitLead: () => {
        const s = get();
        // Consent is a hard gate: no lead PII is stored without an explicit,
        // recorded opt-in (GDPR lawful basis). Name + email are also required.
        if (!s.leadName.trim() || !s.leadEmail.trim() || !s.leadConsent) {
          set({ leadError: true });
          return;
        }
        const entry = catalog.find((c) => c.id === s.activeEntryId);
        const hotspotTitles = s.sessionHotspotsViewed
          .map((id) => entry?.hotspots.find((h) => h.id === id)?.title)
          .filter((t): t is string => !!t);
        const videoTitles = s.sessionMediaViewed
          .map((id) => entry?.media.find((m) => m.id === id)?.title)
          .filter((t): t is string => !!t);
        const lead: Lead = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: s.leadName.trim(),
          email: s.leadEmail.trim(),
          interest: s.leadInterest,
          createdAt: new Date().toISOString(),
          variantViewed: entry?.label ?? s.activeEntryId,
          hotspotsViewed: hotspotTitles,
          consentGiven: true,
          consentText: CONSENT_TEXT,
          consentVersion: CONSENT_VERSION,
          videosViewed: videoTitles,
        };
        analytics.captureLead({
          name: lead.name,
          email: lead.email,
          interest: lead.interest,
          explored: [...hotspotTitles, ...videoTitles],
        });
        set((prev) => ({ leads: [...prev.leads, lead], leadDone: true, leadError: false }));
      },

      toggleLeadsView: () => set((s) => ({ leadsViewOpen: !s.leadsViewOpen })),

      clearLeads: () => set({ leads: [] }),

      setLoadMs: (ms) => set({ lastLoadMs: ms }),
    }),
    {
      name: 'exhibly-kiosk',
      partialize: (s) => ({ leads: s.leads }),
    },
  ),
);
