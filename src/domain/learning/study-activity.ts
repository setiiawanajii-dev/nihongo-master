import type { StudySession } from '../models';
// Attribute active time to the local date of each recorded answer, not session start.
export function activityDay(stamp: string, timezone: string) {
 const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(stamp));
 const get = (type: string) => parts.find(p => p.type === type)!.value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
export function appendActivity(session: StudySession | undefined, seconds: number, now: Date) {
 const dailyActivity = { ...(session?.dailyActivity ?? (session ? { [session.localDate]: session.activeDurationSeconds } : {})) };
 const day = activityDay(now.toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone);
 dailyActivity[day] = (dailyActivity[day] ?? 0) + seconds;
 return dailyActivity;
}
export function recoverActivity(session: StudySession, events: { stamp: string; seconds: number }[]) {
 const daily: Record<string, number> = {};
 let remaining = Math.max(0, session.activeDurationSeconds);
 for (const event of events) {
  if (!Number.isFinite(event.seconds) || event.seconds < 0) continue;
  let day: string;
  try { day = activityDay(event.stamp, session.timezone); } catch { continue; }
  const seconds = Math.min(remaining, event.seconds);
  daily[day] = (daily[day] ?? 0) + seconds;
  remaining -= seconds;
 }
 // Missing historical evidence stays on its original day; never invent extra time.
 if (remaining || !Object.keys(daily).length) daily[session.localDate] = (daily[session.localDate] ?? 0) + remaining;
 return daily;
}
