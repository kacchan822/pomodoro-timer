/**
 * Preservation プロパティテスト（修正前）
 *
 * Feature: auto-advance-phase-fix
 * Property 2: Preservation — 非バグ入力の挙動維持
 *
 * observation-first メソドロジーに従い、非バグ入力（isBugCondition(X) が false）で
 * 未修正コードの挙動を観測し、その挙動をプロパティとして固定する。
 *
 * Bug Condition: isBugCondition(X) = X.isRunning === true AND X.secondsRemaining === 0
 * 非バグ入力 = それ以外すべて（secondsRemaining > 0 の tick、pause / reset / applySettings など）。
 *
 * **EXPECTED OUTCOME**: このテストは未修正コードで PASS する（保持すべきベースライン挙動を確定する）。
 * 修正（tick() 末尾の clearTimer() / isRunning=false 削除）はバグ条件経路のみに影響するため、
 * これらの非バグ入力の挙動は修正後も不変であることが期待される。
 *
 * Vitest + fake timers、独立した Pinia インスタンス、notifyPhaseEnd モックの
 * 既存パターン（timerStore.unit.test.ts / timerStore.property.test.ts）を踏襲する。
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import * as fc from 'fast-check';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTimerStore } from '../../stores/timerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useStatisticsStore } from '../../stores/statisticsStore';
import type { Phase, Settings } from '../../types';

// notifyPhaseEnd をモック化して副作用を切り離す（既存パターン踏襲）
vi.mock('../../services/NotificationService', () => ({
  notifyPhaseEnd: vi.fn(),
}));

import { notifyPhaseEnd } from '../../services/NotificationService';

/**
 * 合法な Settings ジェネレーター（既存 property test と同一の範囲）
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

/**
 * 現在フェーズに対応する設定秒数を返すヘルパー
 */
function secondsForPhase(p: Phase, s: Settings): number {
  switch (p) {
    case 'session':
      return s.sessionMinutes * 60;
    case 'shortBreak':
      return s.shortBreakMinutes * 60;
    case 'longBreak':
      return s.longBreakMinutes * 60;
  }
}

/**
 * 各プロパティ実行ごとに独立した Pinia / fake timer 環境をセットアップし、
 * settings を適用したストア群を返す。
 */
function setupStores(settings: Settings) {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.useFakeTimers();
  vi.mocked(notifyPhaseEnd).mockClear();

  const timerStore = useTimerStore();
  const settingsStore = useSettingsStore();
  const statisticsStore = useStatisticsStore();
  settingsStore.saveSettingsAction(settings);

  return { timerStore, settingsStore, statisticsStore };
}

describe('useTimerStore — Property 2: Preservation（非バグ入力の挙動維持）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.useFakeTimers();
    vi.mocked(notifyPhaseEnd).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Preservation (1): カウントダウン中のデクリメント（要件 3.1 相当の非変更範囲）
  //   secondsRemaining > 0 では tick() は 1 デクリメントのみで
  //   phase / isRunning / completedSessions を変えない
  // ---------------------------------------------------------------------------
  it('secondsRemaining > 0 での tick() は 1 デクリメントのみで phase / isRunning / completedSessions が不変', () => {
    // Validates: Requirements 3.1
    fc.assert(
      fc.property(
        validSettingsArb,
        phaseArb,
        // 非バグ入力: secondsRemaining >= 1（0 を含まない）
        fc.integer({ min: 1, max: 3600 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 20 }),
        (settings, phase, seconds, running, completed) => {
          const { timerStore } = setupStores(settings);

          try {
            timerStore.phase = phase;
            timerStore.secondsRemaining = seconds;
            timerStore.isRunning = running;
            timerStore.completedSessions = completed;

            timerStore.tick();

            // 1 デクリメントのみ
            expect(timerStore.secondsRemaining).toBe(seconds - 1);
            // 不変: phase / isRunning / completedSessions
            expect(timerStore.phase).toBe(phase);
            expect(timerStore.isRunning).toBe(running);
            expect(timerStore.completedSessions).toBe(completed);
            // フェーズ遷移していないので通知は発火しない
            expect(notifyPhaseEnd).not.toHaveBeenCalled();
          } finally {
            vi.useRealTimers();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Preservation (2): pause() — isRunning=false、残り時間保持（要件 3.1）
  // ---------------------------------------------------------------------------
  it('動作中に pause() すると isRunning=false になり残り時間が保持される', () => {
    // Validates: Requirements 3.1
    fc.assert(
      fc.property(validSettingsArb, phaseArb, fc.integer({ min: 1, max: 30 }), (settings, phase, ticks) => {
        const { timerStore } = setupStores(settings);

        try {
          timerStore.phase = phase;
          timerStore.start();
          // start() は secondsRemaining===0 のとき現フェーズ時間をセットする
          const startSeconds = timerStore.secondsRemaining;
          // 設定時間を超えない範囲で進める
          const advance = Math.min(ticks, Math.max(0, startSeconds - 1));
          vi.advanceTimersByTime(advance * 1000);
          const secondsBeforePause = timerStore.secondsRemaining;

          timerStore.pause();

          expect(timerStore.isRunning).toBe(false);
          expect(timerStore.secondsRemaining).toBe(secondsBeforePause);

          // pause 後にタイマーを進めても残り時間は変化しない（インターバル停止）
          vi.advanceTimersByTime(5000);
          expect(timerStore.secondsRemaining).toBe(secondsBeforePause);
        } finally {
          vi.useRealTimers();
        }
      }),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Preservation (3): reset() — secondsRemaining=設定値、isRunning=false（要件 3.2）
  // ---------------------------------------------------------------------------
  it('reset() 後は secondsRemaining=getSecondsForPhase(phase)、isRunning=false になる', () => {
    // Validates: Requirements 3.2
    fc.assert(
      fc.property(validSettingsArb, phaseArb, (settings, phase) => {
        const { timerStore } = setupStores(settings);

        try {
          timerStore.phase = phase;
          timerStore.start();
          // 数秒進めて残り時間を減らす（設定時間内）
          const advance = Math.min(3, Math.max(0, timerStore.secondsRemaining - 1));
          vi.advanceTimersByTime(advance * 1000);

          timerStore.reset();

          expect(timerStore.secondsRemaining).toBe(secondsForPhase(phase, settings));
          expect(timerStore.isRunning).toBe(false);

          // reset 後はインターバルが停止している
          const afterReset = timerStore.secondsRemaining;
          vi.advanceTimersByTime(5000);
          expect(timerStore.secondsRemaining).toBe(afterReset);
        } finally {
          vi.useRealTimers();
        }
      }),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Preservation (4): applySettings() — 停止し新設定時間で現フェーズ初期化（要件 3.3）
  // ---------------------------------------------------------------------------
  it('applySettings(s) 後は isRunning=false になり、新しい設定時間で現フェーズが初期化される', () => {
    // Validates: Requirements 3.3
    fc.assert(
      fc.property(validSettingsArb, validSettingsArb, phaseArb, (initial, next, phase) => {
        const { timerStore } = setupStores(initial);

        try {
          timerStore.phase = phase;
          timerStore.start();
          expect(timerStore.isRunning).toBe(true);

          timerStore.applySettings(next);

          expect(timerStore.isRunning).toBe(false);
          expect(timerStore.secondsRemaining).toBe(secondsForPhase(phase, next));

          // 停止しているので進めても変化しない
          const afterApply = timerStore.secondsRemaining;
          vi.advanceTimersByTime(5000);
          expect(timerStore.secondsRemaining).toBe(afterApply);
        } finally {
          vi.useRealTimers();
        }
      }),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Preservation (5): セッション完了時の副作用（要件 3.4, 3.5, 3.6）
  //   completedSessions 加算・statisticsStore.incrementToday・notifyPhaseEnd 発火・
  //   getNextPhase による次フェーズ計算。
  //
  //   これらの副作用はバグ条件（isRunning=true, secondsRemaining=0）で発生するが、
  //   修正で削除される 2 行（clearTimer / isRunning=false）はこれらの副作用の
  //   「後」にあるため、副作用自体は不変である。ここでは副作用の値（統計・カウント・
  //   通知・次フェーズ）を観測して固定する。
  // ---------------------------------------------------------------------------
  it('タイムアップ時の副作用（completedSessions 加算・統計更新・通知・次フェーズ計算）が保持される', () => {
    // Validates: Requirements 3.4, 3.5, 3.6
    fc.assert(
      fc.property(validSettingsArb, phaseArb, fc.integer({ min: 0, max: 20 }), (settings, phase, completed) => {
        const { timerStore, statisticsStore } = setupStores(settings);

        try {
          timerStore.phase = phase;
          timerStore.completedSessions = completed;
          timerStore.secondsRemaining = 0;
          const todayBefore = statisticsStore.todayCount;

          // セッション完了時のみ completedSessions が +1 される
          const isSession = phase === 'session';
          const expectedCompleted = isSession ? completed + 1 : completed;
          const expectedNext = getNextPhaseLocal(phase, expectedCompleted, settings.sessionsPerCycle);

          timerStore.tick();

          // 要件 3.4: completedSessions 加算・統計更新（セッション完了時のみ）
          expect(timerStore.completedSessions).toBe(expectedCompleted);
          expect(statisticsStore.todayCount).toBe(isSession ? todayBefore + 1 : todayBefore);

          // 要件 3.6: getNextPhase による次フェーズ計算
          expect(timerStore.phase).toBe(expectedNext);
          expect(timerStore.secondsRemaining).toBe(secondsForPhase(expectedNext, settings));

          // 要件 3.5: 通知が有効なときのみ notifyPhaseEnd(nextPhase) 発火
          if (settings.notificationsEnabled) {
            expect(notifyPhaseEnd).toHaveBeenCalledOnce();
            expect(notifyPhaseEnd).toHaveBeenCalledWith(expectedNext);
          } else {
            expect(notifyPhaseEnd).not.toHaveBeenCalled();
          }
        } finally {
          vi.useRealTimers();
        }
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * getNextPhase をローカルに再実装したもの（テスト内での期待値計算専用）。
 * 本体（src/lib/timer.ts）の getNextPhase と同じロジックを用いる。
 */
function getNextPhaseLocal(
  currentPhase: Phase,
  completedSessions: number,
  sessionsPerCycle: number,
): Phase {
  if (currentPhase === 'shortBreak' || currentPhase === 'longBreak') {
    return 'session';
  }
  if (completedSessions % sessionsPerCycle === 0) {
    return 'longBreak';
  }
  return 'shortBreak';
}
