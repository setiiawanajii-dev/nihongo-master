import type { Category } from '../../domain/models';

// Categories have no stored kind. Derive their scope from actual content references.
export function categoriesForContent(categories: Category[], items: { categoryIds: string[] }[], otherItems: { categoryIds: string[] }[] = [], includeUnused = false) {
  const used = new Set(items.flatMap(item => item.categoryIds));
  const otherUsed = includeUnused ? new Set(otherItems.flatMap(item => item.categoryIds)) : new Set<string>();
  return categories.filter(category => used.has(category.id) || (includeUnused && !otherUsed.has(category.id)));
}
