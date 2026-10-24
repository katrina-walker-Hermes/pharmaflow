/**
 * Strict clinical category ordering and alphabetical product sorting utilities.
 * 
 * Order requested by user:
 * 1. Médicaments d'anesthésie
 * 2. Vaso-actifs
 * 3. Anti HTA
 * 4. Broncho actifs
 * 5. Minéraux
 * 6. Solutés
 * 7. Anti hémorragiques
 * 8. Antibiotiques
 * 9. Anti-inflammatoires
 * 10. Abord veineux et rachidien
 * 11. Airway
 * 12. Matériel chirurgicales tranchant/invasive
 * 13. Fils de suture fongibles
 * 14. Sondage urinaire
 * 15. Sondage gastrique
 * 
 * Inside each category, products are sorted in strict alphabetical order.
 */

export const ORDERED_CATEGORIES = [
  "Médicaments d'anesthésie",
  "Vaso-actifs",
  "Anti HTA",
  "Broncho actifs",
  "Minéraux",
  "Solutés",
  "Anti hémorragiques",
  "Antibiotiques",
  "Anti-inflammatoires",
  "Abord veineux et rachidien",
  "Airway",
  "Matériel chirurgicales tranchant/invasive",
  "Fils de suture fongibles",
  "Sondage urinaire",
  "Sondage gastrique",
] as const;

export type OrderedCategory = typeof ORDERED_CATEGORIES[number];

/**
 * Normalizes category strings (removing accents, hyphens, case differences)
 * and maps historical or varied category aliases to the official 15 categories.
 */
export function normalizeCategoryName(categoryName?: string | null): string {
  if (!categoryName) return "Général";
  const trimmed = categoryName.trim();
  if (!trimmed) return "Général";

  // Quick exact match first
  const exactMatch = ORDERED_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Normalized string for fuzzy matching
  const clean = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, "'");

  // Rule 1: Médicaments d'anesthésie
  if (clean.includes('anesthesie')) {
    return "Médicaments d'anesthésie";
  }

  // Rule 2: Vaso-actifs
  if (clean.includes('vaso')) {
    return "Vaso-actifs";
  }

  // Rule 3: Anti HTA / Anti-hypertenseurs
  if (clean.includes('hta') || clean.includes('hyperten')) {
    return "Anti HTA";
  }

  // Rule 4: Broncho actifs
  if (clean.includes('broncho')) {
    return "Broncho actifs";
  }

  // Rule 5: Minéraux
  if (clean.includes('miner')) {
    return "Minéraux";
  }

  // Rule 6: Solutés
  if (clean.includes('solut')) {
    return "Solutés";
  }

  // Rule 7: Anti hémorragiques
  if (clean.includes('hemorrag')) {
    return "Anti hémorragiques";
  }

  // Rule 8: Antibiotiques
  if (clean.includes('antibio')) {
    return "Antibiotiques";
  }

  // Rule 9: Anti-inflammatoires
  if (clean.includes('inflam')) {
    return "Anti-inflammatoires";
  }

  // Rule 10: Abord veineux et rachidien
  if (clean.includes('veineux') || clean.includes('rachidien') || (clean.includes('abord') && !clean.includes('peri'))) {
    return "Abord veineux et rachidien";
  }

  // Rule 11: Airway
  if (clean.includes('airway')) {
    return "Airway";
  }

  // Rule 12: Matériel chirurgicales tranchant/invasive
  if (clean.includes('tranchant') || clean.includes('invasiv') || (clean.includes('materiel') && clean.includes('chirurg'))) {
    return "Matériel chirurgicales tranchant/invasive";
  }

  // Rule 13: Fils de suture fongibles (covers FILS DE SUTURE, FONGIBLES, etc.)
  if (clean.includes('suture') || clean.includes('fongible')) {
    return "Fils de suture fongibles";
  }

  // Rule 14: Sondage urinaire
  if (clean.includes('urinaire')) {
    return "Sondage urinaire";
  }

  // Rule 15: Sondage gastrique
  if (clean.includes('gastrique') && clean.includes('sond')) {
    return "Sondage gastrique";
  }

  // If already matches one of the canonical categories without accent
  for (const cat of ORDERED_CATEGORIES) {
    const catClean = cat
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (clean === catClean) return cat;
  }

  return trimmed;
}

/**
 * Returns the numerical index (0-based) of the category in the user-specified sequence.
 * Unknown / user-created custom categories are assigned rank 999 to appear at the end.
 */
export function getCategoryRank(categoryName?: string | null): number {
  const canonical = normalizeCategoryName(categoryName);
  const index = (ORDERED_CATEGORIES as readonly string[]).indexOf(canonical);
  return index >= 0 ? index : 999;
}

/**
 * Sorts category names according to the clinical 15-category order.
 * Categories outside the list are appended at the end, sorted alphabetically.
 */
export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const rankA = getCategoryRank(a);
    const rankB = getCategoryRank(b);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return (a || '').localeCompare(b || '', 'fr', { sensitivity: 'base' });
  });
}

/**
 * Sorts products inside a category in strict alphabetical order by product name.
 */
export function sortProductsAlphabetically<T extends { name?: string }>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const nameA = (a.name || '').trim();
    const nameB = (b.name || '').trim();
    return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base', numeric: true });
  });
}

/**
 * Sorts products by category order first, then alphabetically by product name inside each category.
 */
export function sortProductsByCategoryAndName<T extends { category?: string; name?: string }>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const rankA = getCategoryRank(a.category);
    const rankB = getCategoryRank(b.category);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const catA = (a.category || '').trim();
    const catB = (b.category || '').trim();
    if (catA.toLowerCase() !== catB.toLowerCase()) {
      return catA.localeCompare(catB, 'fr', { sensitivity: 'base' });
    }
    const nameA = (a.name || '').trim();
    const nameB = (b.name || '').trim();
    return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base', numeric: true });
  });
}
