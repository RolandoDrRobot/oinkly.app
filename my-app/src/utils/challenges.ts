/**
 * Level & XP system: actions in the app grant XP; level is derived from total XP.
 * Progress (streak, totalXP) persisted in localStorage.
 */
const CHALLENGES_PROGRESS_KEY = 'challengesProgress';

export const XP_PER_LEVEL = 50;

/** XP granted per action (used when calling addXP) */
export const XP_ACTIONS = {
  addDebt: 10,
  addCommitment: 15,
  completeDebt: 50,
  logCall: 10,
  addAsset: 10,
  addIncome: 10,
  addFixedExpense: 10,
  openAppToday: 5,
} as const;

export interface ChallengesProgress {
  lastOpenDate: string; // YYYY-MM-DD
  streak: number;
  totalXP: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getChallengesProgress(): ChallengesProgress {
  try {
    const raw = localStorage.getItem(CHALLENGES_PROGRESS_KEY);
    if (!raw) return { lastOpenDate: '', streak: 0, totalXP: 0 };
    const parsed = JSON.parse(raw);
    return {
      lastOpenDate: parsed.lastOpenDate ?? '',
      streak: parsed.streak ?? 0,
      totalXP: typeof parsed.totalXP === 'number' ? parsed.totalXP : 0,
    };
  } catch {
    return { lastOpenDate: '', streak: 0, totalXP: 0 };
  }
}

function saveChallengesProgress(progress: ChallengesProgress): void {
  localStorage.setItem(CHALLENGES_PROGRESS_KEY, JSON.stringify(progress));
}

/** Add XP from an action. Call after the user successfully does something (e.g. save debt, log call). */
export function addXP(amount: number): ChallengesProgress {
  const progress = getChallengesProgress();
  const next: ChallengesProgress = {
    ...progress,
    totalXP: Math.max(0, progress.totalXP + amount),
  };
  saveChallengesProgress(next);
  return next;
}

export function updateChallengesStreak(): ChallengesProgress {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const prev = getChallengesProgress();
  let streak = prev.streak;
  let lastOpenDate = prev.lastOpenDate;

  if (lastOpenDate === today) return prev;

  if (lastOpenDate === yesterday) {
    streak += 1;
  } else if (lastOpenDate !== '') {
    streak = 1;
  } else {
    streak = 1;
  }
  lastOpenDate = today;
  const next: ChallengesProgress = { ...prev, lastOpenDate, streak };
  saveChallengesProgress(next);
  return next;
}

/** Grant "open app today" XP once per day when opening the challenges panel or app. */
export function grantOpenAppXPIfNeeded(): ChallengesProgress {
  const progress = getChallengesProgress();
  if (progress.lastOpenDate === todayStr()) return progress;
  updateChallengesStreak();
  addXP(XP_ACTIONS.openAppToday);
  return getChallengesProgress();
}

export function getTotalXP(): number {
  return getChallengesProgress().totalXP;
}

export function getLevel(totalXP: number): number {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

export function getXPInCurrentLevel(totalXP: number): number {
  return totalXP % XP_PER_LEVEL;
}

export function getProgressToNextLevel(totalXP: number): { current: number; needed: number; percent: number } {
  const current = getXPInCurrentLevel(totalXP);
  const needed = XP_PER_LEVEL;
  const percent = needed > 0 ? (current / needed) * 100 : 0;
  return { current, needed, percent };
}
