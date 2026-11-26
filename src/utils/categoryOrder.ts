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

const LEGACY_CATEGORY_ALIASES: Record<string, OrderedCategory> = {
  "medicaments d'anesthesie": "Médicaments d'anesthésie",
  "anesthesie": "Médicaments d'anesthésie",
  "anesthesiques": "Médicaments d'anesthésie",
  "vaso-actifs": "Vaso-actifs",
  "vasoactifs": "Vaso-actifs",
  "vaso actifs": "Vaso-actifs",
  "anti hta": "Anti HTA",
  "anti-hta": "Anti HTA",
  "anti-hypertenseurs": "Anti HTA",
  "antihypertenseurs": "Anti HTA",
  "broncho actifs": "Broncho actifs",
  "broncho-actifs": "Broncho actifs",
  "bronchodilatateurs": "Broncho actifs",
  "mineraux": "Minéraux",
  "solutes": "Solutés",
  "anti hemorragiques": "Anti hémorragiques",
  "anti-hemorragiques": "Anti hémorragiques",
  "antihemorragiques": "Anti hémorragiques",
  "antibiotiques": "Antibiotiques",
  "anti-inflammatoires": "Anti-inflammatoires",
  "anti inflammatoires": "Anti-inflammatoires",
  "antiinflammatoires": "Anti-inflammatoires",
  "abord veineux et rachidien": "Abord veineux et rachidien",
  "abord veineux": "Abord veineux et rachidien",
  "abord rachidien": "Abord veineux et rachidien",
  "airway": "Airway",
  "materiel chirurgicales tranchant/invasive": "Matériel chirurgicales tranchant/invasive",
  "materiel chirurgical tranchant/invasive": "Matériel chirurgicales tranchant/invasive",
  "materiel chirurgical": "Matériel chirurgicales tranchant/invasive",
  "fils de suture fongibles": "Fils de suture fongibles",
  "fils de suture": "Fils de suture fongibles",
  "fils de suture et fongibles": "Fils de suture fongibles",
  "fongibles": "Fils de suture fongibles",
  "sutures": "Fils de suture fongibles",
  "sondage urinaire": "Sondage urinaire",
  "sondage gastrique": "Sondage gastrique",
};

/**
 * Normalizes category strings (removing accents, case differences)
 * and maps known historical aliases to the official 15 categories,
 * while preserving user-created custom category names verbatim.
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

  // Normalized string for exact alias matching
  const clean = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s+/g, ' ');

  if (LEGACY_CATEGORY_ALIASES[clean]) {
    return LEGACY_CATEGORY_ALIASES[clean];
  }

  // Exact accent-insensitive match against canonical categories
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
