import type { ContentKind, FlashcardRating, Grammar, LearningProgress, QuizQuestion, ReviewSchedule, Vocabulary } from '../models';
const DAY = 86_400_000;
export const reviewGrades = [
 { value: 0, label: '😵 Wrong', description: 'Belum ingat' },
 { value: 1, label: '😐 Hard', description: 'Ingat dengan susah payah' },
 { value: 2, label: '🙂 Good', description: 'Ingat dengan baik' },
 { value: 3, label: '🔥 Easy', description: 'Sangat mudah' },
] as const;
export const requiredDimensions = (type: ContentKind): QuizQuestion['dimension'][] => type === 'vocabulary' ? ['recognition','meaning','kanji','usage'] : ['understanding','usage','sentence'];
export function nextInterval(schedule: ReviewSchedule | undefined, rating: FlashcardRating) {
 const previous = schedule?.intervalDays ?? 0;
 // A second failed relearning attempt gets a one-day break; success restarts the ladder.
 if (rating === 0) return schedule?.lastRating === 0 ? 1 : 10 / 1440;
 if (rating === 1) return previous < 1 ? 1 : Math.min(7, Math.max(3, Math.round(previous * 0.5)));
 if (rating === 2) return previous < 3 ? 3 : previous < 7 ? 7 : Math.min(180, Math.ceil(previous * 2));
 return previous < 7 ? 7 : previous < 14 ? 14 : previous < 30 ? 30 : Math.min(180, Math.ceil(previous * 2));
}
export function scheduleReview(progress: LearningProgress, previous: ReviewSchedule | undefined, rating: FlashcardRating, now: Date) {
 const intervalDays = nextInterval(previous, rating), nextReview = new Date(now.getTime() + intervalDays * DAY).toISOString();
 const schedule: ReviewSchedule = { id: progress.id, itemId: progress.itemId, itemType: progress.itemType, intervalDays, lastRating: rating, reviewCount: progress.reviewCount, lastReviewed: now.toISOString(), nextReview, createdAt: previous?.createdAt ?? progress.createdAt, updatedAt: now.toISOString() };
 return { intervalDays, nextReview, schedule };
}
export function advanceEvidence(progress: LearningProgress, previous: ReviewSchedule | undefined, rating: FlashcardRating, dimension: QuizQuestion['dimension'], now: Date, correct = rating >= 2) {
 const before = progress.dimensions[dimension], attempts = (before?.attempts ?? 0) + 1;
 const score = Math.round(((before?.score ?? 0) * (attempts - 1) + [0,40,75,100][rating]) / attempts);
 const dimensions = { ...progress.dimensions, [dimension]: { attempts, correct: (before?.correct ?? 0) + Number(correct), score, lastTestedAt: now.toISOString(), source: before?.source === 'quiz' || before?.source === 'mixed' ? 'mixed' as const : 'self-rated' as const } };
 const required = requiredDimensions(progress.itemType), masteryScore = Math.round(required.reduce((n,key) => n + (dimensions[key]?.score ?? 0),0) / required.length);
 const mastered = masteryScore >= 85 && required.every(key => (dimensions[key]?.score ?? 0) >= 80 && (dimensions[key]?.attempts ?? 0) >= 3);
 const updated: LearningProgress = { ...progress, dimensions, masteryScore, status: rating === 0 ? 'WEAK' : rating === 1 ? 'LEARNING' : mastered ? 'MASTERED' : 'REVIEW', reviewCount: progress.reviewCount + 1, correctCount: progress.correctCount + Number(correct), wrongCount: progress.wrongCount + Number(!correct), lastReviewed: now.toISOString(), updatedAt: now.toISOString() };
 const next = scheduleReview(updated,previous,rating,now); updated.nextReview = next.nextReview;
 return { progress: updated, ...next };
}
// Old quiz evidence had no schedule. Infer an initial date without awarding any new progress.
export function effectiveReviewDate(progress: LearningProgress) {
 if (progress.nextReview) return progress.nextReview;
 if (!progress.lastReviewed || progress.reviewCount === 0) return null;
 const accuracy = progress.correctCount / Math.max(1,progress.correctCount + progress.wrongCount);
 const interval = progress.status === 'WEAK' || progress.wrongCount > progress.correctCount ? 10 / 1440 : accuracy < .7 || (progress.masteryScore ?? 0) < 40 ? 1 : 3;
 return new Date(Date.parse(progress.lastReviewed) + interval * DAY).toISOString();
}
export function reviewPriority(progress: LearningProgress, now: number) {
 const due = Date.parse(effectiveReviewDate(progress) ?? new Date(now).toISOString());
 const errors = progress.wrongCount / Math.max(1,progress.correctCount + progress.wrongCount);
 const since = progress.lastReviewed ? Math.max(0,(now-Date.parse(progress.lastReviewed))/DAY) : 0;
 return errors * 40 + (100-(progress.masteryScore ?? 0)) * .4 + Math.min(15,Math.max(0,(now-due)/DAY)) + Math.min(10,since) + 5/(progress.reviewCount+1);
}
export function reviewFingerprint(p: LearningProgress) { return `${p.reviewCount}:${p.lastReviewed}:${p.nextReview}`; }
export function weakestDimension(progress: LearningProgress, item: Vocabulary | Grammar) {
 return requiredDimensions(progress.itemType).filter(d => d !== 'kanji' || ('kanji' in item && /[一-龯]/u.test(item.kanji))).sort((a,b) => (progress.dimensions[a]?.score ?? -1) - (progress.dimensions[b]?.score ?? -1) || (progress.dimensions[a]?.attempts ?? 0) - (progress.dimensions[b]?.attempts ?? 0))[0];
}
export function intervalLabel(days: number) { return days < 1 ? `${Math.round(days*1440)} menit` : `${days} hari`; }
