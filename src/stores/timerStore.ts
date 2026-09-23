import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import type { Phase, Settings } from '../types';
import { formatTime, formatTitle, getNextPhase } from '../lib/timer';
import { useSettingsStore } from './settingsStore';
import { useStatisticsStore } from './statisticsStore';
import { notifyPhaseEnd } from '../services/NotificationService';

/**
 * タイマーストア
 *
 * タイマーのカウントダウン、フェーズ遷移、統計更新、通知の呼び出しを管理する。
 *
 * - start()         : setInterval を開始し isRunning を true にする（要件 1.2）
 * - pause()         : clearInterval を呼び isRunning を false にする（要件 1.3）
 * - reset()         : 現在フェーズの設定時間で secondsRemaining を初期化する（要件 1.4）
 * - tick()          : 1 秒ごとに呼ばれ、0 到達時にフェーズ遷移・統計更新・通知を行う（要件 1.5, 2.1〜2.4）
 * - applySettings() : 設定保存後にタイマーをリセットして新しい時間を反映する（要件 3.6）
 */
export const useTimerStore = defineStore('timer', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** 現在のフェーズ（要件 2.5） */
  const phase = ref<Phase>('session');

  /** 現在のフェーズの残り時間（秒）（要件 1.1） */
  const secondsRemaining = ref<number>(0);

  /** タイマーが動作中かどうか（要件 1.2, 1.3） */
  const isRunning = ref<boolean>(false);

  /** アプリ起動後の累計完了セッション数（要件 2.1） */
  const completedSessions = ref<number>(0);

  /** setInterval のタイマー ID（内部管理用） */
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // ---------------------------------------------------------------------------
  // Getters (computed)
  // ---------------------------------------------------------------------------

  /** 残り時間を MM:SS 形式に変換したもの（要件 1.1） */
  const formattedTime = computed(() => formatTime(secondsRemaining.value));

  /** タブタイトル用文字列（要件 1.6） */
  const formattedTitle = computed(() => formatTitle(phase.value, secondsRemaining.value));

  /**
   * 現在サイクル内の完了セッション数（0 ベース）
   * `completedSessions % sessionsPerCycle` で算出する（要件 2.6）
   */
  const completedInCycle = computed(() => {
    const settingsStore = useSettingsStore();
    return completedSessions.value % settingsStore.settings.sessionsPerCycle;
  });

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * 現在の phase に対応する設定時間（秒）を返す。
   */
  function getSecondsForPhase(p: Phase): number {
    const settingsStore = useSettingsStore();
    const s = settingsStore.settings;
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
   * 進行中のインターバルを停止する。
   */
  function clearTimer(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * タイマーを開始する。
   * 既に動作中の場合は何もしない。
   * setInterval で 1 秒ごとに tick() を呼ぶ（要件 1.2）。
   */
  function start(): void {
    if (isRunning.value) return;

    // 残り時間が 0 の場合（初回またはリセット直後）は現在フェーズの初期時間をセット
    if (secondsRemaining.value === 0) {
      secondsRemaining.value = getSecondsForPhase(phase.value);
    }

    isRunning.value = true;
    intervalId = setInterval(() => {
      tick();
    }, 1000);
  }

  /**
   * タイマーを一時停止する。
   * setInterval を停止し、残り時間を保持する（要件 1.3）。
   */
  function pause(): void {
    clearTimer();
    isRunning.value = false;
  }

  /**
   * タイマーをリセットする。
   * インターバルを停止し、現在のフェーズの設定時間で secondsRemaining を初期化する（要件 1.4）。
   */
  function reset(): void {
    clearTimer();
    isRunning.value = false;
    secondsRemaining.value = getSecondsForPhase(phase.value);
  }

  /**
   * 1 秒ごとに呼ばれるティック処理。
   *
   * - secondsRemaining をデクリメントする
   * - 0 になった場合:
   *   1. completedSessions を加算（セッション完了時のみ）（要件 2.1）
   *   2. statisticsStore.incrementToday() を呼ぶ（セッション完了時のみ）（要件 6.3）
   *   3. 次のフェーズを計算して遷移する（要件 1.5, 2.2〜2.4）
   *   4. notifyPhaseEnd(nextPhase) を呼ぶ（要件 5.1, 5.2）
   *   5. 次のフェーズの初期時間にリセットする
   *   6. 動作中のインターバルを維持しカウントダウンを自動継続する
   */
  function tick(): void {
    if (secondsRemaining.value > 0) {
      secondsRemaining.value -= 1;
      return;
    }

    // secondsRemaining === 0: フェーズ終了処理
    const settingsStore = useSettingsStore();
    const statisticsStore = useStatisticsStore();

    // セッション完了時のみ completedSessions と統計を更新する（要件 2.1, 6.3）
    if (phase.value === 'session') {
      completedSessions.value += 1;
      statisticsStore.incrementToday();
    }

    // 次のフェーズを計算する（要件 2.2, 2.3, 2.4）
    const nextPhase = getNextPhase(
      phase.value,
      completedSessions.value,
      settingsStore.settings.sessionsPerCycle,
    );

    // フェーズ終了通知（要件 5.1, 5.2, 5.5）
    if (settingsStore.settings.notificationsEnabled) {
      notifyPhaseEnd(nextPhase);
    }

    // フェーズ遷移とタイマーリセット
    phase.value = nextPhase;
    secondsRemaining.value = getSecondsForPhase(nextPhase);

    // 自動遷移後も動作中のインターバルを維持し、カウントダウンを自動継続する（要件 2.1〜2.3）
  }

  /**
   * 設定保存後にタイマーをリセットして新しい時間を反映する（要件 3.6）。
   * タイマーを停止し、現在フェーズの新しい設定時間で初期化する。
   *
   * @param s - 適用する設定値
   */
  function applySettings(s: Settings): void {
    clearTimer();
    isRunning.value = false;

    // 新しい設定に基づいて現在フェーズの時間を再計算する
    let newSeconds: number;
    switch (phase.value) {
      case 'session':
        newSeconds = s.sessionMinutes * 60;
        break;
      case 'shortBreak':
        newSeconds = s.shortBreakMinutes * 60;
        break;
      case 'longBreak':
        newSeconds = s.longBreakMinutes * 60;
        break;
    }
    secondsRemaining.value = newSeconds;
  }

  // ---------------------------------------------------------------------------
  // Side effects
  // ---------------------------------------------------------------------------

  /**
   * formattedTitle の変化を監視して document.title を同期する（要件 1.6）。
   * immediate: true で初回レンダリング時にも適用する。
   */
  watch(
    formattedTitle,
    (title) => {
      if (typeof document !== 'undefined') {
        document.title = title;
      }
    },
    { immediate: true },
  );

  // 初期の secondsRemaining をセッション設定時間で初期化する
  // （store 生成時に settingsStore が利用可能になった後で設定する）
  secondsRemaining.value = getSecondsForPhase('session');

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------

  return {
    // state
    phase,
    secondsRemaining,
    isRunning,
    completedSessions,
    // getters
    formattedTime,
    formattedTitle,
    completedInCycle,
    // actions
    start,
    pause,
    reset,
    tick,
    applySettings,
  };
});
