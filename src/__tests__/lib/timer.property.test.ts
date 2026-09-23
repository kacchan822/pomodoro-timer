// Feature: pomodoro-timer, Property 1: formatTime のラウンドトリップ整合性
// Feature: pomodoro-timer, Property 3: フェーズ遷移ロジックの正確性
// Feature: pomodoro-timer, Property 8: セッションインジケーター配列の不変条件
// Feature: pomodoro-timer, Property 9: タイトルフォーマットの構造不変条件

import * as fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { formatTime, formatTitle, getNextPhase, getIndicatorStates } from '../../lib/timer';
import type { Phase } from '../../types';

// ---------------------------------------------------------------------------
// Property 1: formatTime のラウンドトリップ整合性
// Validates: Requirements 1.1
// ---------------------------------------------------------------------------
describe('Property 1: formatTime round-trip consistency', () => {
  test('formatTime output matches /^\\d{2}:\\d{2}$/ and round-trips back to original seconds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5999 }), (seconds) => {
        const formatted = formatTime(seconds);
        // Must match MM:SS pattern
        expect(formatted).toMatch(/^\d{2}:\d{2}$/);
        // Round-trip: parse M*60+S === original seconds
        const [mm, ss] = formatted.split(':').map(Number);
        expect(mm * 60 + ss).toBe(seconds);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: フェーズ遷移ロジックの正確性
// Validates: Requirements 2.2, 2.3, 2.4
// ---------------------------------------------------------------------------
describe('Property 3: getNextPhase transition correctness', () => {
  test('session → longBreak when completedSessions is a multiple of sessionsPerCycle', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }), // sessionsPerCycle
        fc.integer({ min: 1, max: 100 }), // multiplier (completedSessions = multiplier * sessionsPerCycle)
        (sessionsPerCycle, multiplier) => {
          const completedSessions = multiplier * sessionsPerCycle;
          const next = getNextPhase('session', completedSessions, sessionsPerCycle);
          expect(next).toBe('longBreak');
        },
      ),
      { numRuns: 100 },
    );
  });

  test('session → shortBreak when completedSessions is NOT a multiple of sessionsPerCycle', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }), // sessionsPerCycle
        fc.integer({ min: 1, max: 100 }), // completedSessions
        (sessionsPerCycle, completedSessions) => {
          // Skip cases where it IS a multiple (those go to longBreak)
          fc.pre(completedSessions % sessionsPerCycle !== 0);
          const next = getNextPhase('session', completedSessions, sessionsPerCycle);
          expect(next).toBe('shortBreak');
        },
      ),
      { numRuns: 100 },
    );
  });

  test('shortBreak → session always', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 8 }),
        (completedSessions, sessionsPerCycle) => {
          const next = getNextPhase('shortBreak', completedSessions, sessionsPerCycle);
          expect(next).toBe('session');
        },
      ),
      { numRuns: 100 },
    );
  });

  test('longBreak → session always', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 8 }),
        (completedSessions, sessionsPerCycle) => {
          const next = getNextPhase('longBreak', completedSessions, sessionsPerCycle);
          expect(next).toBe('session');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: セッションインジケーター配列の不変条件
// Validates: Requirements 2.6
// ---------------------------------------------------------------------------
describe('Property 8: getIndicatorStates array invariants', () => {
  test('array length equals sessionsPerCycle, first completedInCycle entries are true, rest are false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }).chain((sessionsPerCycle) =>
          fc.tuple(
            fc.constant(sessionsPerCycle),
            fc.integer({ min: 0, max: sessionsPerCycle }),
          ),
        ),
        ([sessionsPerCycle, completedInCycle]) => {
          const states = getIndicatorStates(completedInCycle, sessionsPerCycle);
          // Length invariant
          expect(states).toHaveLength(sessionsPerCycle);
          // First completedInCycle entries are true
          for (let i = 0; i < completedInCycle; i++) {
            expect(states[i]).toBe(true);
          }
          // Remaining entries are false
          for (let i = completedInCycle; i < sessionsPerCycle; i++) {
            expect(states[i]).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: タイトルフォーマットの構造不変条件
// Validates: Requirements 1.6
// ---------------------------------------------------------------------------
describe('Property 9: formatTitle contains formatTime output', () => {
  const phases: Phase[] = ['session', 'shortBreak', 'longBreak'];

  test('formatTitle output always contains the formatTime output', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...phases),
        fc.integer({ min: 0, max: 5999 }),
        (phase, seconds) => {
          const timeStr = formatTime(seconds);
          const title = formatTitle(phase, seconds);
          expect(title).toContain(timeStr);
        },
      ),
      { numRuns: 100 },
    );
  });
});
