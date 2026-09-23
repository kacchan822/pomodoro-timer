// Feature: pomodoro-timer, Property 11: 統計インクリメントの加法不変条件
//
// 要件 2.1: Session が完了したとき、完了セッション数を 1 加算する。
// 要件 6.3: Session が完了したとき、当日の完了セッション数を 1 加算し Storage に保存する。
//
// 不変条件:
//   - incrementToday() を N 回呼ぶと todayCount は初期値からちょうど N 増える。
//   - 各呼び出し後、localStorage の pomodoro-statistics に同じ値が今日の日付で保存される。
//   - Session フェーズで tick() を（残り 0 の状態から）N 回完了させると、
//     completedSessions と統計 todayCount がともにちょうど N 増える。

import * as fc from 'fast-check';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStatisticsStore } from '../../stores/statisticsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTimerStore } from '../../stores/timerStore';
import { getTodayString } from '../../lib/date';
import type { Statistics } from '../../types';

/** 合法な Settings を生成するアービトラリ */
const validSettingsArb = fc.record({
  sessionMinutes: fc.integer({ min: 1, max: 60 }),
  shortBreakMinutes: fc.integer({ min: 1, max: 30 }),
  longBreakMinutes: fc.integer({ min: 1, max: 60 }),
  sessionsPerCycle: fc.integer({ min: 1, max: 8 }),
  notificationsEnabled: fc.boolean(),
});

describe('useStatisticsStore — Property 11: 統計インクリメントの加法不変条件', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('incrementToday() を N 回呼ぶと todayCount は初期値からちょうど N 増える', () => {
    // Validates: Requirements 6.3
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }), // 初期の保存済みカウント
        fc.integer({ min: 1, max: 50 }), // インクリメント回数
        (initialCount, n) => {
          localStorage.clear();
          setActivePinia(createPinia());

          // 今日の日付で保存済みカウントを用意する
          const seeded: Statistics = { date: getTodayString(), todayCount: initialCount };
          localStorage.setItem('pomodoro-statistics', JSON.stringify(seeded));

          const store = useStatisticsStore();
          expect(store.todayCount).toBe(initialCount);

          for (let i = 0; i < n; i++) {
            store.incrementToday();
          }

          // メモリ上の値がちょうど N 増えている
          expect(store.todayCount).toBe(initialCount + n);

          // localStorage にも同じ値が今日の日付で保存されている
          const raw = localStorage.getItem('pomodoro-statistics');
          expect(raw).not.toBeNull();
          const persisted = JSON.parse(raw as string) as Statistics;
          expect(persisted.todayCount).toBe(initialCount + n);
          expect(persisted.date).toBe(getTodayString());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Session を N 回完了させると completedSessions と todayCount がともに N 増える', () => {
    // Validates: Requirements 2.1, 6.3
    fc.assert(
      fc.property(
        validSettingsArb,
        fc.integer({ min: 1, max: 30 }), // 完了させる session 数
        (settings, n) => {
          localStorage.clear();
          setActivePinia(createPinia());

          const settingsStore = useSettingsStore();
          settingsStore.saveSettingsAction({ ...settings, notificationsEnabled: false });

          const statisticsStore = useStatisticsStore();
          const timerStore = useTimerStore();

          const startCompleted = timerStore.completedSessions;
          const startCount = statisticsStore.todayCount;

          for (let i = 0; i < n; i++) {
            // session フェーズに強制し、残り 0 から tick して 1 セッション完了させる
            timerStore.phase = 'session';
            timerStore.secondsRemaining = 0;
            timerStore.tick();
          }

          expect(timerStore.completedSessions).toBe(startCompleted + n);
          expect(statisticsStore.todayCount).toBe(startCount + n);
        },
      ),
      { numRuns: 100 },
    );
  });
});
