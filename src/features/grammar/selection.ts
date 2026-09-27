import type { Grammar, LearningProgress, Favorite, Category } from '../../domain/models';
import { isDue } from '../../domain/learning/vocabulary';
export function selectGrammar(items: Grammar[], progress: LearningProgress[], favorites: Favorite[], categories: Category[], params: URLSearchParams, now: number) {
 const q = (params.get('q') ?? '').trim().normalize('NFKC').toLowerCase();
 const state = (id: string) => progress.find(p => p.itemType === 'grammar' && p.itemId === id);
 return items.filter(item => {
  const p = state(item.id), status = params.get('status'), level = params.get('level'), category = params.get('category');
  return (!level || level === 'all' || item.jlptLevel === level) && (!category || category === 'all' || item.categoryIds.includes(category)) &&
   [item.pattern, item.formation, item.meaning, ...categories.filter(c => item.categoryIds.includes(c.id)).map(c => c.name)].join(' ').normalize('NFKC').toLowerCase().includes(q) &&
   (!status || status === 'all' || (status === 'favorite' ? favorites.some(f => f.target.type === 'grammar' && f.target.itemId === item.id) : status === 'review' ? isDue(p, now) : (p?.status ?? 'NEW') === (status === 'weak' ? 'WEAK' : status)));
 }).sort((a,b) => { const sort = params.get('sort');
  if (sort === 'pattern') return a.pattern.localeCompare(b.pattern, 'ja') || a.id.localeCompare(b.id);
  if (sort?.startsWith('mastery')) return ((state(a.id)?.masteryScore ?? -1) - (state(b.id)?.masteryScore ?? -1)) * (sort === 'mastery-desc' ? -1 : 1) || a.id.localeCompare(b.id);
  if (sort === 'review') return (state(a.id)?.nextReview ?? 'z').localeCompare(state(b.id)?.nextReview ?? 'z') || a.id.localeCompare(b.id);
  return b.createdAt.localeCompare(a.createdAt) || b.jlptLevel.localeCompare(a.jlptLevel) || a.id.localeCompare(b.id);
 });
}
