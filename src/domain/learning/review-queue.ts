import type { Grammar, LearningProgress, ReviewFilter, Vocabulary } from '../models';
import { effectiveReviewDate, reviewPriority } from './spaced-repetition';
export function selectReviewQueue(vocabulary: Vocabulary[], grammar: Grammar[], records: LearningProgress[], filter: ReviewFilter, now = Date.now()) {
 const query = (filter.query ?? '').trim().normalize('NFKC').toLowerCase();
 return records.flatMap(progress => {
  if (filter.mode !== 'mixed' && progress.itemType !== filter.mode) return [];
  const item = (progress.itemType === 'vocabulary' ? vocabulary : grammar).find(i => i.id === progress.itemId);
  const nextReview = effectiveReviewDate(progress);
  if (!item || !nextReview || Date.parse(nextReview) > now || (filter.level && filter.level !== 'all' && item.jlptLevel !== filter.level) || (filter.categoryId && !item.categoryIds.includes(filter.categoryId))) return [];
  const title = 'kanji' in item ? item.kanji : item.pattern;
  if (![title,item.meaning,...('kana' in item ? [item.kana,item.romaji] : [item.explanation])].join(' ').normalize('NFKC').toLowerCase().includes(query)) return [];
  return [{item,progress,title,nextReview,priority:reviewPriority(progress,now)}];
 }).sort((a,b) => b.priority-a.priority || a.nextReview.localeCompare(b.nextReview) || a.progress.id.localeCompare(b.progress.id));
}
