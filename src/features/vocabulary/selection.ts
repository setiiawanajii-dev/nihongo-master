import type { Category, Favorite, LearningProgress, Vocabulary } from '../../domain/models';
import { isDue } from '../../domain/learning/vocabulary';

export function selectVocabulary(items: Vocabulary[], progress: LearningProgress[], favorites: Favorite[], categories: Category[], params: URLSearchParams, now = Date.now()) {
  const query = (params.get('q') ?? '').normalize('NFKC').trim().toLocaleLowerCase('id');
  const level = params.get('level') ?? 'all', category = params.get('category') ?? 'all', status = params.get('status') ?? 'all';
  const getProgress = (id: string) => progress.find(p => p.itemType === 'vocabulary' && p.itemId === id);
  const selected = items.filter(item => {
    const p = getProgress(item.id);
    const favorite = favorites.some(f => f.target.type === 'vocabulary' && f.target.itemId === item.id);
    return (level === 'all' || item.jlptLevel === level) && (category === 'all' || item.categoryIds.includes(category)) &&
      (status === 'all' || (status === 'favorite' && favorite) || (status === 'mastered' && p?.status === 'MASTERED') || (status === 'review' && isDue(p, now)) || (status === 'weak' && p?.status === 'WEAK') || (status === 'new' && (!p || p.reviewCount === 0))) &&
      [item.kanji, item.kana, item.romaji, item.meaning, ...categories.filter(c => item.categoryIds.includes(c.id)).map(c => c.name)].join(' ').normalize('NFKC').toLocaleLowerCase('id').includes(query);
  });
  const byKana = (a: Vocabulary, b: Vocabulary) => a.kana.localeCompare(b.kana, 'ja') || a.id.localeCompare(b.id);
  return selected.sort((a, b) => {
    const pa = getProgress(a.id), pb = getProgress(b.id);
    switch (params.get('sort')) {
      case 'kana': return byKana(a, b);
      case 'mastery-asc': return (pa?.masteryScore ?? -1) - (pb?.masteryScore ?? -1) || byKana(a, b);
      case 'mastery-desc': return (pb?.masteryScore ?? -1) - (pa?.masteryScore ?? -1) || byKana(a, b);
      case 'review': return (pa?.nextReview ? Date.parse(pa.nextReview) : Infinity) - (pb?.nextReview ? Date.parse(pb.nextReview) : Infinity) || (pb?.wrongCount ?? 0) - (pa?.wrongCount ?? 0) || byKana(a, b);
      default: return b.createdAt.localeCompare(a.createdAt) || b.jlptLevel.localeCompare(a.jlptLevel) || a.id.localeCompare(b.id);
    }
  });
}
