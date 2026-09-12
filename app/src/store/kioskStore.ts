import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { catalog } from '../data/catalog';
import * as analytics from '../analytics';
import { queueLead } from '../lib/leadClient';

const hotspotTitle = (entryId: string, hotspotId: string) =>
  catalog.find((c) => c.id === entryId)?.hotspots.find((h) => h.id === hotspotId)?.title ?? hotspotId;
const mediaTitle = (entryId: string, mediaId: string) =>
  catalog.find((c) => c.id === entryId)?.media.find((m) => m.id === mediaId)?.title ?? mediaId;
const productLabel = (entryId: string) =>
  catalog.find((c) => c.id === entryId)?.label ?? entryId;

// Session-scoped record of what the visitor explored *at the moment they
// explored it*. Storing the resolved title (not the id) plus the productId
// means switching products mid-session preserves the earlier product's
// exploration — resolving titles at capture-time against the last-active
// entry would silently drop hotspots/videos that don't exist on that entry.
type ExploredItem = { productId: string; title: string };

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
  sessionHotspots: ExploredItem[];
  sessionVideos: ExploredItem[];
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
      sessionHotspots: [],
      sessionVideos: [],
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
          sessionHotspots: [],
          sessionVideos: [],
        });
      },

      poke: () => {
        if (get().mode === 'explore' && !get().switcherOpen) set({ switcherOpen: true });
      },

      // Switching products keeps sessionHotspots/sessionVideos accumulating so
      // the lead reflects the whole visit, not just the last product touched.
      // Each item carries its productId so titles resolve correctly even when
      // products have disjoint hotspot/media sets.
      selectEntry: (id) => {
        analytics.viewProduct(id);
        set({ activeEntryId: id, activeHotspotId: null });
      },

      selectHotspot: (id) => {
        const s = get();
        const willOpen = s.activeHotspotId === id ? null : id;
        const title = willOpen ? hotspotTitle(s.activeEntryId, willOpen) : null;
        if (willOpen) analytics.openHotspot(title!);
        else analytics.closeHotspot();
        // Opening a hotspot dismisses the product overview so the two cards
        // never fight for screen space; closing the hotspot leaves the
        // overview closed (the user can re-open it from the dock).
        const alreadyLogged =
          !!title && s.sessionHotspots.some((h) => h.productId === s.activeEntryId && h.title === title);
        set({
          activeHotspotId: willOpen,
          overviewOpen: willOpen ? false : s.overviewOpen,
          sessionHotspots:
            title && !alreadyLogged
              ? [...s.sessionHotspots, { productId: s.activeEntryId, title }]
              : s.sessionHotspots,
        });
      },

      setSwitcherOpen: (open) => set({ switcherOpen: open }),

      toggleAutoSpin: () => set((s) => ({ autoSpin: !s.autoSpin })),

      openOverview: () => set({ overviewOpen: true }),
      closeOverview: () => set({ overviewOpen: false }),

      openMedia: () => set({ mediaOpen: true, activeMediaId: null }),
      closeMedia: () => set({ mediaOpen: false, activeMediaId: null }),
      // Tracking now lives on the <video> element itself (see MediaGallery):
      // `video_play` fires on real playback start, `video_complete` on ended.
      // Selecting a thumbnail is just intent, so it no longer emits.
      selectMedia: (id) => {
        set((s) => {
          const title = mediaTitle(s.activeEntryId, id);
          const already = s.sessionVideos.some((v) => v.productId === s.activeEntryId && v.title === title);
          return {
            activeMediaId: id,
            sessionVideos: already
              ? s.sessionVideos
              : [...s.sessionVideos, { productId: s.activeEntryId, title }],
          };
        });
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
        // Titles were resolved at exploration time (see selectHotspot /
        // selectMedia), so they survive product switches. Everything the
        // visitor touched is preserved regardless of which product is active
        // at submit time.
        const hotspotTitles = s.sessionHotspots.map((h) => h.title);
        const videoTitles = s.sessionVideos.map((v) => v.title);
        // "Also viewed" = every product the visitor engaged with other than
        // the currently-active (primary) one, in first-touched order.
        const primary = s.activeEntryId;
        const touchedIds: string[] = [];
        for (const it of [...s.sessionHotspots, ...s.sessionVideos]) {
          if (it.productId !== primary && !touchedIds.includes(it.productId)) touchedIds.push(it.productId);
        }
        const alsoViewed = touchedIds.map(productLabel);
        const lead: Lead = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: s.leadName.trim(),
          email: s.leadEmail.trim(),
          interest: s.leadInterest,
          createdAt: new Date().toISOString(),
          variantViewed: productLabel(primary),
          hotspotsViewed: hotspotTitles,
          consentGiven: true,
          consentText: CONSENT_TEXT,
          consentVersion: CONSENT_VERSION,
          videosViewed: videoTitles,
        };
        // Lead PII goes ONLY to the leads store/endpoint — never into the
        // anonymous analytics event stream. In live mode queueLead POSTs to
        // /api/leads (offline-queued); in demo mode it's a no-op and the lead
        // lives in the local `leads` array below.
        queueLead({
          name: lead.name,
          email: lead.email,
          interest: lead.interest || undefined,
          explored: [...hotspotTitles, ...videoTitles],
          alsoViewed,
          sessionId: analytics.currentSessionId() ?? undefined,
          productKey: primary,
          consentGiven: true,
          consentText: CONSENT_TEXT,
          consentVersion: CONSENT_VERSION,
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
