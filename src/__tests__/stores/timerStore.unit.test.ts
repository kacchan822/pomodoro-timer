/**
 * useTimerStore ユニットテスト
 *
 * start / pause / reset / tick の振る舞いを検証する
 * Requirements: 1.2, 1.3, 1.4, 1.5, 2.1
 */

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTimerStore } from '../../stores/timerStore';
import { useStatisticsStore } from '../../stores/statisticsStore';
import { useSettingsStore } from '../../stores/settingsStore';

// notifyPhaseEnd をモック化して副作用を切り離す（要件 5.1 / 5.2 はここでは検証しない）
vi.mock('../../services/NotificationService', () => ({
  notifyPhaseEnd: vi.fn(),
}));

import { notifyPhaseEnd } from '../../services/NotificationService';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

describe('useTimerStore', () => {
  beforeEach(() => {
    // 各テストで独立した Pinia インスタンスを使用する
    setActivePinia(createPinia());

    // localStorage をクリアしてストアの初期化を一貫させる
    localStorage.clear();

    // 偽タイマーを有効化する
    vi.useFakeTimers();

    // notifyPhaseEnd モックの呼び出し履歴をリセット
    vi.mocked(notifyPhaseEnd).mockClear();
  });

  afterEach(() => {
    // 本物のタイマーに戻す
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // start()
  // ---------------------------------------------------------------------------

  describe('start()', () => {
    it('start() を呼ぶと isRunning が true になる（要件 1.2）', () => {
      const store = useTimerStore();
      expect(store.isRunning).toBe(false);

      store.start();

      expect(store.isRunning).toBe(true);
    });

    it('start() を複数回呼んでも isRunning は true のまま（二重起動しない）', () => {
      const store = useTimerStore();
      store.start();
      store.start(); // 2 回目は無視されるべき

      expect(store.isRunning).toBe(true);
    });

    it('start() 後に setInterval が 1 秒ごとに tick を発火する', () => {
      const store = useTimerStore();
      const initialSeconds = store.secondsRemaining;

      store.start();
      // 1 秒進める
      vi.advanceTimersByTime(1000);

      expect(store.secondsRemaining).toBe(initialSeconds - 1);
    });
  });

  // ---------------------------------------------------------------------------
  // pause()
  // ---------------------------------------------------------------------------

  describe('pause()', () => {
    it('pause() を呼ぶと isRunning が false になる（要件 1.3）', () => {
      const store = useTimerStore();
      store.start();
      expect(store.isRunning).toBe(true);

      store.pause();

      expect(store.isRunning).toBe(false);
    });

    it('pause() 後は secondsRemaining が保持される（要件 1.3）', () => {
      const store = useTimerStore();
      store.start();

      // 3 秒進める
      vi.advanceTimersByTime(3000);
      const secondsAfterTick = store.secondsRemaining;

      store.pause();

      // pause 後に時間を進めても変化しないこと
      vi.advanceTimersByTime(5000);

      expect(store.secondsRemaining).toBe(secondsAfterTick);
      expect(store.isRunning).toBe(false);
    });

    it('pause() 後に start() で再開すると残り時間から継続する（要件 1.3）', () => {
      const store = useTimerStore();
      store.start();
      vi.advanceTimersByTime(3000);
      const secondsAtPause = store.secondsRemaining;

      store.pause();
      store.start();
      vi.advanceTimersByTime(1000);

      expect(store.secondsRemaining).toBe(secondsAtPause - 1);
    });
  });

  // ---------------------------------------------------------------------------
  // reset()
  // ---------------------------------------------------------------------------

  describe('reset()', () => {
    it('reset() を呼ぶと secondsRemaining が現在フェーズの設定秒数に戻る（要件 1.4）', () => {
      const store = useTimerStore();
      const settingsStore = useSettingsStore();

      // タイマーを進めて残り時間を減らす
      store.start();
      vi.advanceTimersByTime(10000); // 10 秒進める
      expect(store.secondsRemaining).toBeLessThan(settingsStore.settings.sessionMinutes * 60);

      store.reset();

      // session フェーズなので sessionMinutes * 60 に戻るはず
      expect(store.secondsRemaining).toBe(settingsStore.settings.sessionMinutes * 60);
    });

    it('reset() を呼ぶと isRunning が false になる（要件 1.4）', () => {
      const store = useTimerStore();
      store.start();
      expect(store.isRunning).toBe(true);

      store.reset();

      expect(store.isRunning).toBe(false);
    });

    it('reset() 後は setInterval が停止しており secondsRemaining が変化しない（要件 1.4）', () => {
      const store = useTimerStore();
      store.start();
      store.reset();

      const secondsAfterReset = store.secondsRemaining;
      vi.advanceTimersByTime(5000);

      expect(store.secondsRemaining).toBe(secondsAfterReset);
    });

    it('shortBreak フェーズで reset() すると shortBreakMinutes * 60 に戻る（要件 1.4）', () => {
      const store = useTimerStore();
      const settingsStore = useSettingsStore();

      // フェーズを shortBreak に強制的に変更する
      // tick() はゼロを検知してフェーズ終了処理を実行する
      store.secondsRemaining = 0;
      store.tick(); // secondsRemaining === 0 → フェーズが session → shortBreak に遷移

      expect(store.phase).toBe('shortBreak');

      store.reset();

      expect(store.secondsRemaining).toBe(settingsStore.settings.shortBreakMinutes * 60);
    });
  });

  // ---------------------------------------------------------------------------
  // tick() — タイムアップ時のフェーズ遷移・統計加算・通知
  // ---------------------------------------------------------------------------

  describe('tick() — タイムアップ時', () => {
    it('セッション完了時にフェーズが shortBreak に遷移する（要件 1.5, 2.3）', () => {
      const store = useTimerStore();

      // tick() は secondsRemaining === 0 のときにフェーズ終了処理を実行する
      // デフォルトの completedSessions = 0 で tick() すると +1 されて 1 になり、
      // 1 % 4 !== 0 なので shortBreak に遷移する
      store.secondsRemaining = 0;
      store.tick();

      expect(store.phase).toBe('shortBreak');
      expect(store.isRunning).toBe(false);
    });

    it('セッション完了時（サイクル完了）に longBreak に遷移する（要件 1.5, 2.2）', () => {
      const store = useTimerStore();
      const settingsStore = useSettingsStore();

      // completedSessions を sessionsPerCycle - 1 にセットする
      // → tick() 内で +1 されて sessionsPerCycle になり longBreak に遷移する
      store.completedSessions = settingsStore.settings.sessionsPerCycle - 1;
      store.secondsRemaining = 0;
      store.tick();

      expect(store.phase).toBe('longBreak');
      expect(store.isRunning).toBe(false);
    });

    it('shortBreak 完了時にフェーズが session に遷移する（要件 1.5, 2.4）', () => {
      const store = useTimerStore();

      // まず session → shortBreak に遷移させる
      store.secondsRemaining = 0;
      store.tick();
      expect(store.phase).toBe('shortBreak');

      // shortBreak でタイムアップ → session に戻る
      store.secondsRemaining = 0;
      store.tick();

      expect(store.phase).toBe('session');
      expect(store.isRunning).toBe(false);
    });

    it('セッション完了時に completedSessions が 1 増える（要件 2.1）', () => {
      const store = useTimerStore();
      const initialCount = store.completedSessions;

      store.secondsRemaining = 0;
      store.tick();

      expect(store.completedSessions).toBe(initialCount + 1);
    });

    it('ブレーク完了時は completedSessions が増えない（要件 2.1）', () => {
      const store = useTimerStore();

      // shortBreak フェーズに遷移させる
      store.secondsRemaining = 0;
      store.tick();
      const countAfterSession = store.completedSessions;

      // shortBreak 完了
      store.secondsRemaining = 0;
      store.tick();

      // ブレーク完了でカウントは変わらない
      expect(store.completedSessions).toBe(countAfterSession);
    });

    it('セッション完了時に statisticsStore.todayCount が 1 増える（要件 2.1, 6.3）', () => {
      const store = useTimerStore();
      const statsStore = useStatisticsStore();
      const initialTodayCount = statsStore.todayCount;

      store.secondsRemaining = 0;
      store.tick();

      expect(statsStore.todayCount).toBe(initialTodayCount + 1);
    });

    it('ブレーク完了時は statisticsStore.todayCount が増えない', () => {
      const store = useTimerStore();
      const statsStore = useStatisticsStore();

      // shortBreak に遷移
      store.secondsRemaining = 0;
      store.tick();
      const countAfterSession = statsStore.todayCount;

      // shortBreak 完了
      store.secondsRemaining = 0;
      store.tick();

      expect(statsStore.todayCount).toBe(countAfterSession);
    });

    it('通知が有効な場合、セッション完了時に notifyPhaseEnd が呼ばれる（要件 5.1, 5.2）', () => {
      const store = useTimerStore();
      const settingsStore = useSettingsStore();

      // 通知が有効であることを確認（デフォルトは true）
      expect(settingsStore.settings.notificationsEnabled).toBe(true);

      store.secondsRemaining = 0;
      store.tick();

      expect(notifyPhaseEnd).toHaveBeenCalledOnce();
      // session 完了後（completedSessions が 1 → 4 の倍数でない）なので shortBreak が次フェーズ
      expect(notifyPhaseEnd).toHaveBeenCalledWith('shortBreak');
    });

    it('通知が無効の場合、notifyPhaseEnd が呼ばれない（要件 5.5）', () => {
      const store = useTimerStore();
      const settingsStore = useSettingsStore();

      // 通知を無効化する
      settingsStore.saveSettingsAction({
        ...settingsStore.settings,
        notificationsEnabled: false,
      });

      store.secondsRemaining = 1;
      store.tick();

      expect(notifyPhaseEnd).not.toHaveBeenCalled();
    });

    it('タイムアップ後は isRunning が false になり、ユーザー操作を待つ（要件 1.5）', () => {
      const store = useTimerStore();

      store.start();
      // secondsRemaining を 0 にセットして tick() でフェーズ終了処理を起動する
      store.secondsRemaining = 0;
      store.tick();

      expect(store.isRunning).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // applySettings()
  // ---------------------------------------------------------------------------

  describe('applySettings()', () => {
    it('applySettings() 後は新しい設定時間で secondsRemaining が更新される（要件 3.6）', () => {
      const store = useTimerStore();

      store.applySettings({
        sessionMinutes: 50,
        shortBreakMinutes: 10,
        longBreakMinutes: 20,
        sessionsPerCycle: 4,
        notificationsEnabled: true,
      });

      // session フェーズなので 50 * 60 = 3000 秒になるはず
      expect(store.secondsRemaining).toBe(50 * 60);
      expect(store.isRunning).toBe(false);
    });
  });
});
