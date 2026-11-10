// ============================================
// Small helpers shared by every page of the public site
// ============================================

import {
  ArrowRight, ArrowUpRight, Award, Baby, BookOpen, Building2, Calculator, Calendar, CircleCheck, ClipboardCheck,
  Clock, Compass, Download, Droplets, FileText, FlaskConical, GraduationCap, HeartPulse, Languages, Leaf,
  LifeBuoy, Lightbulb, Mail, MapPin, Megaphone, Menu, MessageCircle, Microscope, Monitor, Palette, Phone,
  Presentation, Quote, Send, Shield, Sparkles, Star, Target, Trophy, Users, X, Zap, ChevronLeft, ChevronRight,
  Cctv, Bell, ChevronUp, ChevronDown, Trash2, Plus, Upload, ExternalLink, Link, Image as ImageIcon, Check,
  ImagePlus, LayoutPanelTop, School, Newspaper, Info, RotateCcw,
} from 'lucide';

/** Escape text for safe use inside HTML. */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** Only site paths, web links, email and phone links — never javascript: and friends. */
export function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  if (/^\/(?!\/)/.test(url) || /^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  return '';
}

/** Google Drive share links → direct image links; everything else passes through safeUrl. */
export function imageUrl(value) {
  const url = safeUrl(value);
  if (!url) return '';
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  return drive ? `https://lh3.googleusercontent.com/d/${drive[1]}` : url;
}

/** Same as imageUrl, but leaves Google Drive document links (e.g. a PDF prospectus) alone. */
export const linkUrl = (value) => safeUrl(value);

export const telHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
export const waHref = (number, text = '') =>
  `https://wa.me/${String(number || '').replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const initials = (name) => String(name || '')
  .replace(/^(dr|mr|mrs|ms)\.?\s+/i, '')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Plain text with blank lines → paragraphs. */
export const paragraphs = (text) => esc(text).split(/\n{2,}/).filter((p) => p.trim())
  .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

export const pad2 = (n) => String(n).padStart(2, '0');

// ── Icons ──

const ICONS = {
  ArrowRight, ArrowUpRight, Award, Baby, BookOpen, Building2, Calculator, Calendar, CircleCheck, ClipboardCheck,
  Clock, Compass, Download, Droplets, FileText, FlaskConical, GraduationCap, HeartPulse, Languages, Leaf,
  LifeBuoy, Lightbulb, Mail, MapPin, Megaphone, Menu, MessageCircle, Microscope, Monitor, Palette, Phone,
  Presentation, Quote, Send, Shield, Sparkles, Star, Target, Trophy, Users, X, Zap, ChevronLeft, ChevronRight,
  Cctv, Bell, ChevronUp, ChevronDown, Trash2, Plus, Upload, ExternalLink, Link, Image: ImageIcon, Check,
  ImagePlus, LayoutPanelTop, School, Newspaper, Info, RotateCcw,
};

const attrs = (obj) => Object.entries(obj).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');

export function icon(name, cls = '') {
  const node = ICONS[name] || ICONS.Sparkles;
  const body = node.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('');
  return `<svg class="ic ${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Brand marks are not part of the icon set.
export const brandIcon = {
  facebook: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.8c0-.8.5-1.3 1.3-1.3H17V2.2C16.6 2.1 15.5 2 14.3 2 11.7 2 10 3.6 10 6.4v2.1H7v3.7h3V22h4v-9.8h3l.5-3.7H14z"/></svg>',
  instagram: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
};

/** Pick a fitting icon from a facility / programme title; admins can add new ones freely. */
export function iconFor(title) {
  const t = String(title || '').toLowerCase();
  const rules = [
    [/lab|science|experiment/, 'FlaskConical'],
    [/stem|innovation/, 'Lightbulb'],
    [/computer|it\b|digital|coding|it proficiency/, 'Monitor'],
    [/audio|visual|smart|projector|classroom/, 'Presentation'],
    [/art|craft|paint|creativ/, 'Palette'],
    [/english|language|spoken|communication/, 'Languages'],
    [/first aid|health|medical/, 'HeartPulse'],
    [/remedial|support|help/, 'LifeBuoy'],
    [/house|team/, 'Shield'],
    [/mentor|guid|counsel/, 'Compass'],
    [/library|book|read/, 'BookOpen'],
    [/award|ceremony|prize/, 'Award'],
    [/competit|olympiad|exam prep|success/, 'Trophy'],
    [/excellen|education|academic/, 'GraduationCap'],
    [/facilit|infrastructure|campus|building/, 'Building2'],
    [/math/, 'Calculator'],
    [/water|cafe|drink/, 'Droplets'],
    [/generator|power|backup/, 'Zap'],
    [/cctv|camera|surveil|safety|security/, 'Cctv'],
    [/cultur|event|festival/, 'Sparkles'],
    [/nursery|kg|kinder|early/, 'Baby'],
    [/assess|evaluat|test/, 'ClipboardCheck'],
    [/environment|green|nature/, 'Leaf'],
    [/goal|focus/, 'Target'],
  ];
  return (rules.find(([re]) => re.test(t)) || [null, 'Sparkles'])[1];
}

// ── Rendering bits ──

/** <img> with lazy loading; empty string when the address is unusable. */
export function img(src, alt = '', { cls = '', eager = false, sizes = '' } = {}) {
  const url = imageUrl(src);
  if (!url) return '';
  return `<img src="${esc(url)}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${sizes ? ` sizes="${sizes}"` : ''}>`;
}

/** Section title block used across the site. */
export function sectionHead({ kicker = '', title = '', text = '', align = 'left', light = false } = {}) {
  return `
    <header class="sec-head sec-head--${align}${light ? ' is-light' : ''}">
      ${kicker ? `<span class="kicker" data-reveal>${esc(kicker)}</span>` : ''}
      ${title ? `<h2 class="display" data-split>${esc(title)}</h2>` : ''}
      ${text ? `<p class="lede" data-reveal>${esc(text)}</p>` : ''}
    </header>`;
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
