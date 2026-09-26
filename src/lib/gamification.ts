import type { UserStats } from '@/lib/types';

const ACHIEVEMENTS = [
  { id: 'first_task', test: (s: UserStats) => s.tasksCompleted >= 1 },
  { id: 'tasks_10', test: (s: UserStats) => s.tasksCompleted >= 10 },
  { id: 'tasks_50', test: (s: UserStats) => s.tasksCompleted >= 50 },
  { id: 'tasks_100', test: (s: UserStats) => s.tasksCompleted >= 100 },
  { id: 'streak_3', test: (s: UserStats) => s.currentStreak >= 3 },
  { id: 'streak_7', test: (s: UserStats) => s.currentStreak >= 7 },
  { id: 'streak_30', test: (s: UserStats) => s.currentStreak >= 30 },
  { id: 'level_5', test: (s: UserStats) => s.level >= 5 },
  { id: 'level_10', test: (s: UserStats) => s.level >= 10 },
] as const;

function localDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function previousLocalDateKey(date: Date) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return localDateKey(previous);
}

function storedDateKey(value: UserStats['lastActivityDate']) {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value.toDate();
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

export function statsAfterTaskCompletion(oldStats: UserStats, xpAmount: number, now = new Date()) {
  const totalXP = Math.max(0, (oldStats.totalXP || 0) + xpAmount);
  const level = Math.floor(totalXP / 1000) + 1;
  const tasksCompleted = Math.max(0, (oldStats.tasksCompleted || 0) + 1);
  const today = localDateKey(now);
  const lastActivity = storedDateKey(oldStats.lastActivityDate);

  const currentStreak =
    lastActivity === today
      ? Math.max(1, oldStats.currentStreak || 1)
      : lastActivity === previousLocalDateKey(now)
        ? Math.max(1, oldStats.currentStreak || 0) + 1
        : 1;

  const next: UserStats = {
    ...oldStats,
    totalXP,
    level,
    tasksCompleted,
    currentStreak,
    longestStreak: Math.max(oldStats.longestStreak || 0, currentStreak),
    lastActivityDate: now.toISOString(),
  };

  next.achievementsUnlocked = Array.from(new Set([
    ...(oldStats.achievementsUnlocked || []),
    ...ACHIEVEMENTS.filter(achievement => achievement.test(next)).map(achievement => achievement.id),
  ]));

  return next;
}
