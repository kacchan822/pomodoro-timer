/**
 * useTimerStore 統合テスト
 *
 * fake timer を用いて start() で開始した単一の setInterval が
 * フェーズ遷移を跨いで生存し続け、カウントダウンが自動連続することを検証する。
 * また自動継続中の手動操作（pause / reset / start 再開）との共存を検証する。
 *
 * バグ修正（auto-advance-phase-fix）の統合レベル検証。
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 *
 * 設計方針:
 * - secondsRemaining を手動で書き換えず、fake timer をフェーズ全体分進めて
 *   実際の自動継続経路（同一 setInterval の連続発火）を通す。
 * - applySettings で各フェーズを 1 分（= 60 秒）に縮め、進める時間を最小化する。
 */

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTimerStore } from '../../stores/timerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Settings } from '../../types';

// notifyPhaseEnd をモック化して副作用（実際の通知/音声）を切り離す
vi.mock('../../services/NotificationService', () => ({
  notifyPhaseEnd: vi.fn(),
}));

import { notifyPhaseEnd } from '../../services/NotificationService';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** 各フェーズを最小の 1 分（= 60 秒）に縮めた設定 */
const SMALL_SETTINGS: Settings = {
  sessionMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 1,
  sessionsPerCycle: 4,
  notificationsEnabled: true,
};

/**
 * 現在のフェーズが 1 回タイムアップして次フェーズへ自動遷移するところまで
 * fake timer を進める。
 *
 * secondsRemaining が s のとき、s 回の tick で 0 になり、
 * さらに 1 回の tick でフェーズ遷移が起きる（合計 s + 1 秒）。
 *
 * @param store useTimerStore インスタンス
 */
function advanceThroughPhase(store: ReturnType<typeof useTimerStore>): void {
  const seconds = store.secondsRemaining;
  // s 秒で 0 に到達し、+1 秒でフェーズ遷移が発火する
  vi.advanceTimersByTime((seconds + 1) * 1000);
}

// ---------------------------------------------------------------------------
// suite
// ---------------------------------------------------------------------------

describe('useTimerStore 統合テスト — 自動連続フロー', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.useFakeTimers();
    vi.mocked(notifyPhaseEnd).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. 完全自動連続フロー
  // -------------------------------------------------------------------------

  it('start → session タイムアップ → shortBreak → session と手動スタートなしで自動連続する（要件 2.1, 2.2, 2.3）', () => {
    const store = useTimerStore();
    const settingsStore = useSettingsStore();

    // 各フェーズを 1 分に縮める（applySettings は現在フェーズを再初期化して停止する）
    store.applySettings(SMALL_SETTINGS);
    expect(store.phase).toBe('session');
    expect(store.secondsRemaining).toBe(60);
    expect(store.isRunning).toBe(false);

    // 一度だけ start() を呼ぶ（以降は手動スタートを介さない）
    store.start();
    expect(store.isRunning).toBe(true);

    // session タイムアップ → shortBreak へ自動継続
    advanceThroughPhase(store);
    expect(store.phase).toBe('shortBreak');
    expect(store.isRunning).toBe(true);
    expect(store.secondsRemaining).toBe(settingsStore.settings.shortBreakMinutes * 60);
    expect(store.completedSessions).toBe(1);

    // shortBreak タイムアップ → session へ自動継続
    advanceThroughPhase(store);
    expect(store.phase).toBe('session');
    expect(store.isRunning).toBe(true);
    expect(store.secondsRemaining).toBe(settingsStore.settings.sessionMinutes * 60);
    // ブレーク完了ではセッション数は増えない
    expect(store.completedSessions).toBe(1);
  });

  it('同一インターバルが遷移直後もカウントダウンを継続する（インターバル生存）（要件 2.1）', () => {
    const store = useTimerStore();
    store.applySettings(SMALL_SETTINGS);
    store.start();

    // session → shortBreak の遷移直後
    advanceThroughPhase(store);
    expect(store.phase).toBe('shortBreak');
    const afterTransition = store.secondsRemaining;

    // 追加で 1 秒進めるとカウントダウンが継続してデクリメントされる
    vi.advanceTimersByTime(1000);
    expect(store.secondsRemaining).toBe(afterTransition - 1);
    expect(store.isRunning).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. サイクル遷移（longBreak を含む）
  // -------------------------------------------------------------------------

  it('sessionsPerCycle 回のセッションを跨いで longBreak を含むサイクルが自動連続する（要件 2.1, 2.2, 2.3）', () => {
    const store = useTimerStore();
    const settingsStore = useSettingsStore();

    store.applySettings(SMALL_SETTINGS);
    const perCycle = settingsStore.settings.sessionsPerCycle; // 4

    store.start();

    // sessionsPerCycle - 1 回は session → shortBreak → session を繰り返す
    for (let i = 1; i < perCycle; i++) {
      // session タイムアップ → shortBreak
      advanceThroughPhase(store);
      expect(store.phase).toBe('shortBreak');
      expect(store.isRunning).toBe(true);
      expect(store.completedSessions).toBe(i);

      // shortBreak タイムアップ → session
      advanceThroughPhase(store);
      expect(store.phase).toBe('session');
      expect(store.isRunning).toBe(true);
    }

    // perCycle 回目の session タイムアップ → longBreak（サイクル完了）
    advanceThroughPhase(store);
    expect(store.phase).toBe('longBreak');
    expect(store.isRunning).toBe(true);
    expect(store.completedSessions).toBe(perCycle);
    expect(store.secondsRemaining).toBe(settingsStore.settings.longBreakMinutes * 60);

    // longBreak タイムアップ → session（次サイクル開始）へ自動継続
    advanceThroughPhase(store);
    expect(store.phase).toBe('session');
    expect(store.isRunning).toBe(true);
    expect(store.secondsRemaining).toBe(settingsStore.settings.sessionMinutes * 60);
  });

  // -------------------------------------------------------------------------
  // 3. 手動操作との共存
  // -------------------------------------------------------------------------

  it('自動継続中に pause() すると停止し残り時間を保持、その後 start() で再開できる（要件 3.1）', () => {
    const store = useTimerStore();
    store.applySettings(SMALL_SETTINGS);
    store.start();

    // session → shortBreak へ自動遷移させ、shortBreak を少し進める
    advanceThroughPhase(store);
    expect(store.phase).toBe('shortBreak');
    vi.advanceTimersByTime(5000);
    const secondsAtPause = store.secondsRemaining;

    // pause() は停止し残り時間を保持する
    store.pause();
    expect(store.isRunning).toBe(false);

    // pause 後は時間を進めても変化しない
    vi.advanceTimersByTime(10000);
    expect(store.secondsRemaining).toBe(secondsAtPause);

    // start() で残り時間から再開できる
    store.start();
    expect(store.isRunning).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(store.secondsRemaining).toBe(secondsAtPause - 1);
  });

  it('自動継続中に reset() すると停止し現在フェーズの設定時間で初期化、その後 start() で再開できる（要件 3.2）', () => {
    const store = useTimerStore();
    const settingsStore = useSettingsStore();

    store.applySettings(SMALL_SETTINGS);
    store.start();

    // session → shortBreak へ自動遷移させ、shortBreak を少し進める
    advanceThroughPhase(store);
    expect(store.phase).toBe('shortBreak');
    vi.advanceTimersByTime(3000);
    expect(store.secondsRemaining).toBeLessThan(settingsStore.settings.shortBreakMinutes * 60);

    // reset() は停止し現在フェーズ（shortBreak）の設定時間で初期化する
    store.reset();
    expect(store.isRunning).toBe(false);
    expect(store.phase).toBe('shortBreak');
    expect(store.secondsRemaining).toBe(settingsStore.settings.shortBreakMinutes * 60);

    // reset 後は時間を進めても変化しない
    const secondsAfterReset = store.secondsRemaining;
    vi.advanceTimersByTime(5000);
    expect(store.secondsRemaining).toBe(secondsAfterReset);

    // start() で再開すると初期化された時間からカウントダウンする
    store.start();
    expect(store.isRunning).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(store.secondsRemaining).toBe(secondsAfterReset - 1);
  });

  it('自動継続中に applySettings() すると停止し新設定時間で初期化、その後 start() で再開できる（要件 3.3）', () => {
    const store = useTimerStore();
    store.applySettings(SMALL_SETTINGS);
    store.start();

    // session → shortBreak へ自動遷移
    advanceThroughPhase(store);
    expect(store.phase).toBe('shortBreak');

    // 動作中に設定を変更する（shortBreak を 2 分に）
    store.applySettings({
      sessionMinutes: 1,
      shortBreakMinutes: 2,
      longBreakMinutes: 1,
      sessionsPerCycle: 4,
      notificationsEnabled: true,
    });

    // 停止し、現在フェーズ（shortBreak）の新設定時間で初期化される
    expect(store.isRunning).toBe(false);
    expect(store.phase).toBe('shortBreak');
    expect(store.secondsRemaining).toBe(2 * 60);

    // 旧インターバルは破棄されているため時間を進めても変化しない
    vi.advanceTimersByTime(5000);
    expect(store.secondsRemaining).toBe(2 * 60);

    // start() で再開できる
    store.start();
    expect(store.isRunning).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(store.secondsRemaining).toBe(2 * 60 - 1);
  });
});
