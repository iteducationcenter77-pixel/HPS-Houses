// ============================================
// Competition categories, by class
// ============================================
// Used by the server (to check values), the admin panel (forms, filters) and the website.

export const CATEGORIES = [
  { name: 'Sub Junior', classes: 'Class II – IV', from: 2, to: 4 },
  { name: 'Junior', classes: 'Class V – VII', from: 5, to: 7 },
  { name: 'Senior', classes: 'Class VIII – X', from: 8, to: 10 },
];

/**
 * General: house competitions and anything not split by class. A General place can go to a whole
 * house (a team entry) or to a student of any class.
 */
export const GENERAL_CATEGORY = 'General';
export const GENERAL_LABEL = 'House competition · all classes';

export const CATEGORY_NAMES = [...CATEGORIES.map((c) => c.name), GENERAL_CATEGORY];

/** How a competition's results are entered: by class category, or General only. */
export const FORMATS = ['class', 'general'];

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

/** "2", "Class 2", "10-A", "Class X", "IX-B" → 2, 2, 10, 10, 9. Nursery/KG → null. */
export function classNumber(cls) {
  const text = String(cls ?? '').toUpperCase();
  const digits = text.match(/\d+/);
  if (digits) return Number(digits[0]);
  const roman = text.match(/\b(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/);
  return roman ? ROMAN[roman[1]] : null;
}

/** The category a class belongs to ('' for classes outside II–X). */
export function categoryOf(cls) {
  const n = classNumber(cls);
  return CATEGORIES.find((c) => n !== null && n >= c.from && n <= c.to)?.name || '';
}

/** Whether a student may take part in a competition of this category. */
export function inCategory(cls, category) {
  if (!category || category === GENERAL_CATEGORY) return true;
  return categoryOf(cls) === category;
}

/** "Junior (Class V – VII)" for labels. */
export function categoryLabel(category) {
  const c = CATEGORIES.find((x) => x.name === category);
  if (c) return `${c.name} (${c.classes})`;
  return category === GENERAL_CATEGORY ? `General (${GENERAL_LABEL})` : '';
}
