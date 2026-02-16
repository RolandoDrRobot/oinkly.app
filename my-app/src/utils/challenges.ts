/**
 * Challenges (Duolingo-style): definitions and progress from app data + optional streak.
 */
import { storage } from './storage';

const CHALLENGES_PROGRESS_KEY = 'challengesProgress';

export type ChallengeCategory = 'debt' | 'assets' | 'habit';

export interface ChallengeDef {
  id: string;
  category: ChallengeCategory;
  titleKey: string;
  descriptionKey: string;
  xp: number;
  /** Check completion from current app data */
  checkComplete: () => boolean;
}

export interface ChallengesProgress {
  lastOpenDate: string; // YYYY-MM-DD
  streak: number;
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
    if (!raw) return { lastOpenDate: '', streak: 0 };
    return JSON.parse(raw);
  } catch {
    return { lastOpenDate: '', streak: 0 };
  }
}

export function updateChallengesStreak(): ChallengesProgress {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const prev = getChallengesProgress();
  let streak = prev.streak;
  let lastOpenDate = prev.lastOpenDate;

  if (lastOpenDate === today) return prev; // already counted today

  if (lastOpenDate === yesterday) {
    streak += 1;
  } else if (lastOpenDate !== '') {
    streak = 1; // gap: reset streak
  } else {
    streak = 1;
  }
  lastOpenDate = today;
  const next: ChallengesProgress = { lastOpenDate, streak };
  localStorage.setItem(CHALLENGES_PROGRESS_KEY, JSON.stringify(next));
  return next;
}

function buildChallengeDefs(): ChallengeDef[] {
  return [
    // ——— Debt ———
    {
      id: 'add_first_debt',
      category: 'debt',
      titleKey: 'challenges.addFirstDebt.title',
      descriptionKey: 'challenges.addFirstDebt.description',
      xp: 10,
      checkComplete: () => storage.getDebts().length >= 1,
    },
    {
      id: 'add_commitment',
      category: 'debt',
      titleKey: 'challenges.addCommitment.title',
      descriptionKey: 'challenges.addCommitment.description',
      xp: 15,
      checkComplete: () =>
        storage.getDebts().some((d) => d.commitments && d.commitments.length > 0),
    },
    {
      id: 'complete_debt',
      category: 'debt',
      titleKey: 'challenges.completeDebt.title',
      descriptionKey: 'challenges.completeDebt.description',
      xp: 50,
      checkComplete: () =>
        storage.getDebts().some(
          (d) =>
            (d.totalLocal === 0 && d.totalDollars === 0) || d.closedAt != null
        ),
    },
    {
      id: 'log_call',
      category: 'debt',
      titleKey: 'challenges.logCall.title',
      descriptionKey: 'challenges.logCall.description',
      xp: 10,
      checkComplete: () =>
        storage.getDebts().some((d) => d.callHistory && d.callHistory.length > 0),
    },
    // ——— Assets ———
    {
      id: 'add_first_asset',
      category: 'assets',
      titleKey: 'challenges.addFirstAsset.title',
      descriptionKey: 'challenges.addFirstAsset.description',
      xp: 10,
      checkComplete: () => storage.getAssets().length >= 1,
    },
    {
      id: 'add_3_assets',
      category: 'assets',
      titleKey: 'challenges.add3Assets.title',
      descriptionKey: 'challenges.add3Assets.description',
      xp: 25,
      checkComplete: () => storage.getAssets().length >= 3,
    },
    {
      id: 'add_income',
      category: 'assets',
      titleKey: 'challenges.addIncome.title',
      descriptionKey: 'challenges.addIncome.description',
      xp: 10,
      checkComplete: () => storage.getIncomes().length >= 1,
    },
    {
      id: 'add_fixed_expense',
      category: 'assets',
      titleKey: 'challenges.addFixedExpense.title',
      descriptionKey: 'challenges.addFixedExpense.description',
      xp: 10,
      checkComplete: () => storage.getFixedExpenses().length >= 1,
    },
    // ——— Habits ———
    {
      id: 'open_app_today',
      category: 'habit',
      titleKey: 'challenges.openAppToday.title',
      descriptionKey: 'challenges.openAppToday.description',
      xp: 5,
      checkComplete: () => getChallengesProgress().lastOpenDate === todayStr(),
    },
    {
      id: 'streak_3',
      category: 'habit',
      titleKey: 'challenges.streak3.title',
      descriptionKey: 'challenges.streak3.description',
      xp: 20,
      checkComplete: () => getChallengesProgress().streak >= 3,
    },
  ];
}

const challengeDefs = buildChallengeDefs();

export function getChallenges(): Array<ChallengeDef & { completed: boolean }> {
  return challengeDefs.map((def) => ({
    ...def,
    completed: def.checkComplete(),
  }));
}

export function getTotalXP(): number {
  return getChallenges().filter((c) => c.completed).reduce((sum, c) => sum + c.xp, 0);
}

export function getCompletedCount(): number {
  return getChallenges().filter((c) => c.completed).length;
}
