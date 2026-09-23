// Feature: pomodoro-timer, Property 2: リセット後の残り時間は設定値と一致する

import * as fc from 'fast-check';
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTimerStore } from '../../stores/timerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Phase } from '../../types';

/**
 * 合法な Settings オブジェクトのジェネレーター
 * - sessionMinutes: 1〜60
 * - shortBreakMinutes: 1〜30
 * - longBreakMinutes: 1〜60
 * - sessionsPerCycle: 1〜8
 */
const validSettingsArb = fc.record({
  sessionMinutes: fc.integer({ min: 1, max: 60 }),
  shortBreakMinutes: fc.integer({ min: 1, max: 30 }),
  longBreakMinutes: fc.integer({ min: 1, max: 60 }),
  sessionsPerCycle: fc.integer({ min: 1, max: 8 }),
  notificationsEnabled: fc.boolean(),
});

const phaseArb = fc.constantFrom<Phase>('session', 'shortBreak', 'longBreak');

describe('useTimerStore — Property 2: リセット後の残り時間は設定値と一致する', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reset() 後の secondsRemaining は現在フェーズの設定分数 × 60 と等しい', () => {
    // Validates: Requirements 1.4
    fc.assert(
      fc.property(validSettingsArb, phaseArb, (settings, phase) => {
        const timerStore = useTimerStore();
        const settingsStore = useSettingsStore();

        // 設定を適用する
        settingsStore.saveSettingsAction(settings);

        // フェーズを直接セットする（store が ref を公開しているため直接代入可能）
        timerStore.phase = phase;

        // リセットを実行する
        timerStore.reset();

        // フェーズに対応する期待秒数を計算する
        const expectedSeconds = (() => {
          switch (phase) {
            case 'session':
              return settings.sessionMinutes * 60;
            case 'shortBreak':
              return settings.shortBreakMinutes * 60;
            case 'longBreak':
              return settings.longBreakMinutes * 60;
          }
        })();

        expect(timerStore.secondsRemaining).toBe(expectedSeconds);
      }),
      { numRuns: 100 },
    );
  });
});
