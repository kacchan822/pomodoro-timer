// Feature: pomodoro-timer, Property 10: tick() のカウントダウン不変条件
//
// 要件 1.2: スタート後、Timer は 1 秒ごとに残り時間を 1 秒デクリメントする。
// 要件 1.5: 残り時間が 0 になったとき、自動的に次のフェーズへ遷移する。
//
// 不変条件:
//   - secondsRemaining > 0 のとき tick() を 1 回呼ぶと、値はちょうど 1 減る。
//   - tick() を何回呼んでも secondsRemaining は決して負にならない。
//   - 残り時間が 0 のときに tick() を呼ぶと、次フェーズの初期時間へリセットされる
//     （＝ フェーズ遷移が発生する）。

import * as fc from 'fast-check';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTimerStore } from '../../stores/timerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Phase } from '../../types';

/** 合法な Settings を生成するアービトラリ */
const validSettingsArb = fc.record({
  sessionMinutes: fc.integer({ min: 1, max: 60 }),
  shortBreakMinutes: fc.integer({ min: 1, max: 30 }),
  longBreakMinutes: fc.integer({ min: 1, max: 60 }),
  sessionsPerCycle: fc.integer({ min: 1, max: 8 }),
  notificationsEnabled: fc.boolean(),
});

const phaseArb = fc.constantFrom<Phase>('session', 'shortBreak', 'longBreak');

describe('useTimerStore — Property 10: tick() のカウントダウン不変条件', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // 通知の副作用（Notification API / Audio）を伴わない構成にするため
    // 通知は各プロパティ内の settings で無効化する。localStorage は jsdom が提供。
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('secondsRemaining > 0 のとき tick() を N 回呼ぶと、値はちょうど N 減る（負にならない）', () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(
        validSettingsArb,
        phaseArb,
        fc.integer({ min: 1, max: 120 }), // tick 回数
        (settings, phase, ticks) => {
          setActivePinia(createPinia());

          const settingsStore = useSettingsStore();
          settingsStore.saveSettingsAction({ ...settings, notificationsEnabled: false });

          const timerStore = useTimerStore();
          timerStore.phase = phase;
          timerStore.reset();

          const start = timerStore.secondsRemaining;
          // start は phase の分数 × 60 で、最低でも 60。ticks を start 未満に制限する。
          const safeTicks = Math.min(ticks, start - 1);
          if (safeTicks <= 0) return; // start が極小の場合はスキップ

          for (let i = 0; i < safeTicks; i++) {
            timerStore.tick();
          }

          // ちょうど safeTicks 秒デクリメントされている
          expect(timerStore.secondsRemaining).toBe(start - safeTicks);
          // 決して負にならない
          expect(timerStore.secondsRemaining).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('残り時間が 0 のとき tick() を呼ぶと次フェーズの初期時間へリセットされる（フェーズ遷移）', () => {
    // Validates: Requirements 1.5, 2.4
    fc.assert(
      fc.property(
        validSettingsArb,
        // 休憩フェーズは常に session へ遷移するので副作用（統計加算）が無く検証が単純
        fc.constantFrom<Phase>('shortBreak', 'longBreak'),
        (settings, phase) => {
          setActivePinia(createPinia());

          const settingsStore = useSettingsStore();
          settingsStore.saveSettingsAction({ ...settings, notificationsEnabled: false });

          const timerStore = useTimerStore();
          timerStore.phase = phase;
          timerStore.secondsRemaining = 0;

          timerStore.tick();

          // 休憩終了後は必ず session へ遷移する
          expect(timerStore.phase).toBe('session');
          // 次フェーズ（session）の初期秒数へリセットされている
          expect(timerStore.secondsRemaining).toBe(settings.sessionMinutes * 60);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('連続 tick() で secondsRemaining は常に 0 以上に保たれる（フェーズ跨ぎでも負にならない）', () => {
    // Validates: Requirements 1.2, 1.5
    fc.assert(
      fc.property(
        validSettingsArb,
        phaseArb,
        fc.integer({ min: 1, max: 500 }),
        (settings, phase, ticks) => {
          setActivePinia(createPinia());

          const settingsStore = useSettingsStore();
          settingsStore.saveSettingsAction({ ...settings, notificationsEnabled: false });

          const timerStore = useTimerStore();
          timerStore.phase = phase;
          timerStore.reset();

          for (let i = 0; i < ticks; i++) {
            timerStore.tick();
            expect(timerStore.secondsRemaining).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
