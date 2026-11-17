// ============================================
// Corridor screen (/slide): the slides it can show and their default settings.
// Used by the server (to check settings), the admin panel and the screen itself.
// ============================================

export const SLIDE_TYPES = [
  { key: 'welcome', name: 'Welcome', text: 'School photo, name and tagline', seconds: 12 },
  { key: 'notices', name: 'Notices', text: 'Latest notices from the school office', seconds: 15 },
  { key: 'leaderboard', name: 'House leaderboard', text: 'Live house points and ranks — best with a countdown', seconds: 20 },
  { key: 'results', name: 'Latest results', text: 'Winners of the latest competition, by category', seconds: 20 },
  { key: 'houses', name: 'Four Houses', text: 'The four houses with their crests and mottos', seconds: 12 },
  { key: 'distribution', name: 'Points share', text: 'How the points are spread between the houses', seconds: 12 },
  { key: 'conduct', name: 'Bonus & penalty', text: 'Points given for discipline and conduct', seconds: 12 },
  { key: 'upcoming', name: 'Upcoming competitions', text: 'What is coming up next', seconds: 12 },
  { key: 'gallery', name: 'Campus life', text: 'Photos from the gallery', seconds: 15 },
];

export const SLIDE_KEYS = SLIDE_TYPES.map((s) => s.key);

export const TRANSITIONS = [
  { key: 'mixed', name: 'Mixed — a different effect each time' },
  { key: 'fade', name: 'Smooth fade' },
  { key: 'slide', name: 'Slide across' },
  { key: 'zoom', name: 'Zoom' },
  { key: 'curtain', name: 'Curtain wipe' },
];

export const COUNTDOWN_CHOICES = [0, 1, 2, 3, 5, 10, 15, 20, 30, 45, 60];

export const DEFAULT_COUNTDOWN_LABEL = 'Live points update in';

export const DEFAULT_SLIDESHOW = {
  transition: 'mixed',
  show_clock: true,
  show_ticker: true,
  slides: SLIDE_TYPES.map((t) => ({
    key: t.key,
    enabled: true,
    seconds: t.seconds,
    countdown: 0,
    countdown_label: '',
  })),
};

const clampInt = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * Any stored or submitted settings → complete, safe settings. Unknown slides are dropped,
 * missing ones are added (switched off) at the end, numbers are kept within range.
 */
export function normalizeSlideshow(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const seen = new Set();
  const slides = [];
  for (const s of Array.isArray(src.slides) ? src.slides : []) {
    const type = SLIDE_TYPES.find((t) => t.key === s?.key);
    if (!type || seen.has(type.key)) continue;
    seen.add(type.key);
    slides.push({
      key: type.key,
      enabled: s.enabled !== false,
      seconds: clampInt(s.seconds, 5, 600, type.seconds),
      countdown: COUNTDOWN_CHOICES.includes(Number(s.countdown)) ? Number(s.countdown) : 0,
      countdown_label: typeof s.countdown_label === 'string' ? s.countdown_label.trim().slice(0, 60) : '',
    });
  }
  for (const t of SLIDE_TYPES) {
    if (!seen.has(t.key)) {
      const d = DEFAULT_SLIDESHOW.slides.find((x) => x.key === t.key);
      slides.push({ ...d, enabled: !Array.isArray(src.slides) });
    }
  }
  return {
    transition: TRANSITIONS.some((t) => t.key === src.transition) ? src.transition : DEFAULT_SLIDESHOW.transition,
    show_clock: src.show_clock !== false,
    show_ticker: src.show_ticker !== false,
    slides,
  };
}
