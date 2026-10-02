import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../app/data/DataProvider';
import { calculateProgress, localDay } from '../../domain/analytics/progress';
export function useProgressAnalytics() {
  const data = useData();
  const [today, setToday] = useState(localDay);
  useEffect(() => { const timer = window.setInterval(() => setToday(localDay()), 30_000); return () => window.clearInterval(timer); }, []);
  const { vocabulary, grammar, progress, quizResults, sessions } = data;
  return useMemo(() => calculateProgress({ vocabulary, grammar, progress, quizResults, sessions }, today), [vocabulary, grammar, progress, quizResults, sessions, today]);
}
