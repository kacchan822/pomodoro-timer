/**
 * フェーズ型 — タイマーの現在フェーズを表す
 * - 'session'    : 作業セッション
 * - 'shortBreak' : 短い休憩
 * - 'longBreak'  : 長い休憩
 */
export type Phase = 'session' | 'shortBreak' | 'longBreak';

/**
 * ユーザー設定
 */
export interface Settings {
  /**
   * 作業セッションの時間（分）
   * @minimum 1
   * @maximum 60
   */
  sessionMinutes: number;

  /**
   * 短い休憩の時間（分）
   * @minimum 1
   * @maximum 30
   */
  shortBreakMinutes: number;

  /**
   * 長い休憩の時間（分）
   * @minimum 1
   * @maximum 60
   */
  longBreakMinutes: number;

  /**
   * 1 サイクルあたりのセッション数
   * @minimum 1
   * @maximum 8
   */
  sessionsPerCycle: number;

  /**
   * デスクトップ通知を有効にするかどうか
   */
  notificationsEnabled: boolean;
}

/**
 * デフォルト設定値
 * - 作業セッション: 25 分
 * - 短い休憩: 5 分
 * - 長い休憩: 15 分
 * - サイクルあたりセッション数: 4
 * - 通知: 有効
 */
export const DEFAULT_SETTINGS: Settings = {
  sessionMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsPerCycle: 4,
  notificationsEnabled: true,
};

/**
 * タイマー状態
 */
export interface TimerState {
  /** 現在のフェーズ */
  phase: Phase;
  /** 現在のフェーズの残り時間（秒） */
  secondsRemaining: number;
  /** タイマーが動作中かどうか */
  isRunning: boolean;
  /** アプリ起動後の累計完了セッション数 */
  completedSessions: number;
}

/**
 * 統計データ
 */
export interface Statistics {
  /** 記録日（"YYYY-MM-DD" 形式、ローカルタイムゾーン） */
  date: string;
  /** 当日の完了セッション数 */
  todayCount: number;
}

/**
 * 設定バリデーション結果
 * - 有効な場合: `{ valid: true }`
 * - 無効な場合: `{ valid: false, errors: Partial<Record<keyof Settings, string>> }`
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: Partial<Record<keyof Settings, string>> };
