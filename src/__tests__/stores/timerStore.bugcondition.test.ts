/**
 * Bug Condition 探索テスト（修正前）
 *
 * Feature: auto-advance-phase-fix
 * Property 1: Bug Condition — フェーズ遷移後のカウントダウン自動継続
 *
 * このテストは期待挙動（Expected Behavior / Property 1）をエンコードする。
 *
 * Bug Condition: isBugCondition(X) = X.isRunning === true AND X.secondsRemaining === 0
 *
 * **CRITICAL**: このテストは未修正コードでは必ず FAIL する。失敗こそがバグの存在を
 * 証明する（=探索テストにおける SUCCESS ケース）。修正後（tick() 末尾の
 * clearTimer() / isRunning=false 削除）に PASS することでフィックスを検証する。
 *
 * Vitest + fake timers、独立した Pinia インスタンス、notifyPhaseEnd モックの
 * 既存パターン（timerStore.unit.test.ts / timerStore.property.test.ts）を踏襲する。
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import * as fc from 'fast-check';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTimerStore } from '../../stores/timerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getNextPhase } from '../../lib/timer';
import type { Phase } from '../../types';

// notifyPhaseEnd をモック化して副作用を切り離す（既存パターン踏襲）
vi.mock('../../services/NotificationService', () => ({
  notifyPhaseEnd: vi.fn(),
}));

import { notifyPhaseEnd } from '../../services/NotificationService';

/**
 * 合法な Settings ジェネレーター（既存 property test と同一の範囲）
 */
const validSettingsArb = fc.record({
  sessionMinutes: fc.integer({ min: 1, max: 60 }),
  shortBreakMinutes: fc.integer({ min: 1, max: 30 }),
  longBreakMinutes: fc.integer({ min: 1, max: 60 }),
  sessionsPerCycle: fc.integer({ min: 1, max: 8 }),
  notificationsEnabled: fc.boolean(),
});

/**
 * 現在フェーズに対応する設定秒数を返すヘルパー
 */
function secondsForPhase(
  p: Phase,
  s: { sessionMinutes: number; shortBreakMinutes: number; longBreakMinutes: number },
): number {
  switch (p) {
    case 'session':
      return s.sessionMinutes * 60;
    case 'shortBreak':
      return s.shortBreakMinutes * 60;
    case 'longBreak':
      return s.longBreakMinutes * 60;
  }
}

describe('useTimerStore — Property 1: Bug Condition（フェーズ遷移後のカウントダウン自動継続）', () => {
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
  // ケース (1): session → shortBreak 継続
  // ---------------------------------------------------------------------------
  it('(1) session タイムアップ後 shortBreak へ遷移し、カウントダウンが自動継続する', () => {
    // Validates: Requirements 2.1, 2.2
    const store = useTimerStore();
    const settingsStore = useSettingsStore();
    const s = settingsStore.settings;

    // isRunning=true かつ secondsRemaining=0 のバグ条件を作る
    store.start();
    store.secondsRemaining = 0;
    // 1 ティック進めて遷移を起こす（インターバル経由で tick() が発火）
    vi.advanceTimersByTime(1000);

    const expectedNextPhase = getNextPhase('session', 1, s.sessionsPerCycle);
    expect(store.phase).toBe(expectedNextPhase); // 'shortBreak'（デフォルト sessionsPerCycle=4）
    expect(store.phase).toBe('shortBreak');

    // Expected Behavior: 遷移後も isRunning が true を維持する
    expect(store.isRunning).toBe(true);
    // secondsRemaining は次フェーズの設定時間にセットされる
    expect(store.secondsRemaining).toBe(secondsForPhase('shortBreak', s));

    // インターバルが生存しており、さらに 1000ms 進めるとカウントダウンが継続する
    const before = store.secondsRemaining;
    vi.advanceTimersByTime(1000);
    expect(store.secondsRemaining).toBe(before - 1);
  });

  // ---------------------------------------------------------------------------
  // ケース (2): shortBreak → session 継続
  // ---------------------------------------------------------------------------
  it('(2) shortBreak タイムアップ後 session へ遷移し、カウントダウンが自動継続する', () => {
    // Validates: Requirements 2.1, 2.3
    const store = useTimerStore();
    const settingsStore = useSettingsStore();
    const s = settingsStore.settings;

    // shortBreak フェーズにセットして動作中にする
    store.phase = 'shortBreak';
    store.start();
    store.secondsRemaining = 0;
    vi.advanceTimersByTime(1000);

    expect(store.phase).toBe('session');
    expect(store.isRunning).toBe(true);
    expect(store.secondsRemaining).toBe(secondsForPhase('session', s));

    const before = store.secondsRemaining;
    vi.advanceTimersByTime(1000);
    expect(store.secondsRemaining).toBe(before - 1);
  });

  // ---------------------------------------------------------------------------
  // ケース (3): サイクル完了 → longBreak 継続
  // ---------------------------------------------------------------------------
  it('(3) サイクル完了時 longBreak へ遷移し、カウントダウンが自動継続する', () => {
    // Validates: Requirements 2.1, 2.2
    const store = useTimerStore();
    const settingsStore = useSettingsStore();
    const s = settingsStore.settings;

    // completedSessions を sessionsPerCycle - 1 にして、tick() で +1 され倍数になるようにする
    store.completedSessions = s.sessionsPerCycle - 1;
    store.start();
    store.secondsRemaining = 0;
    vi.advanceTimersByTime(1000);

    expect(store.phase).toBe('longBreak');
    expect(store.isRunning).toBe(true);
    expect(store.secondsRemaining).toBe(secondsForPhase('longBreak', s));

    const before = store.secondsRemaining;
    vi.advanceTimersByTime(1000);
    expect(store.secondsRemaining).toBe(before - 1);
  });

  // ---------------------------------------------------------------------------
  // ケース (4): タイムアップ後 1000ms 前進で secondsRemaining がデクリメント
  //             （インターバル生存の観測）
  // ---------------------------------------------------------------------------
  it('(4) タイムアップ後に fake timer を 1000ms 進めると secondsRemaining がデクリメントされる（インターバル生存）', () => {
    // Validates: Requirements 2.1
    const store = useTimerStore();
    const settingsStore = useSettingsStore();
    const s = settingsStore.settings;

    store.start();
    store.secondsRemaining = 0;
    // 遷移ティック
    vi.advanceTimersByTime(1000);

    const afterTransition = store.secondsRemaining;
    expect(afterTransition).toBe(secondsForPhase('shortBreak', s));

    // インターバルが破棄されていなければ、次の 1000ms で 1 減る
    vi.advanceTimersByTime(1000);
    expect(store.secondsRemaining).toBe(afterTransition - 1);
  });

  // ---------------------------------------------------------------------------
  // Property 1（Scoped PBT）: 合法な Settings をランダム生成し、
  // session/shortBreak の各遷移でバグ条件から tick したとき期待挙動を満たす
  // ---------------------------------------------------------------------------
  it('Property 1: バグ条件 (isRunning=true, secondsRemaining=0) からの遷移後も isRunning を維持し継続する', () => {
    // Validates: Requirements 2.1, 2.2, 2.3
    fc.assert(
      fc.property(
        validSettingsArb,
        fc.constantFrom<Phase>('session', 'shortBreak', 'longBreak'),
        (settings, startPhase) => {
          // 各実行で独立した Pinia / fake timer 状態を用意する
          setActivePinia(createPinia());
          vi.useFakeTimers();
          vi.mocked(notifyPhaseEnd).mockClear();

          try {
            const store = useTimerStore();
            const settingsStore = useSettingsStore();
            settingsStore.saveSettingsAction(settings);

            store.phase = startPhase;
            store.start();
            store.secondsRemaining = 0;

            // completedSessions は初期 0。session 完了時は +1 される
            const expectedCompleted =
              startPhase === 'session' ? store.completedSessions + 1 : store.completedSessions;
            const expectedNext = getNextPhase(
              startPhase,
              expectedCompleted,
              settings.sessionsPerCycle,
            );

            // 遷移ティック
            vi.advanceTimersByTime(1000);

            expect(store.phase).toBe(expectedNext);
            // Expected Behavior（Property 1）
            expect(store.isRunning).toBe(true);
            expect(store.secondsRemaining).toBe(secondsForPhase(expectedNext, settings));

            // インターバル生存: さらに 1000ms でカウントダウン継続
            const before = store.secondsRemaining;
            vi.advanceTimersByTime(1000);
            expect(store.secondsRemaining).toBe(before - 1);
          } finally {
            vi.useRealTimers();
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
