import { Settings, Statistics, DEFAULT_SETTINGS } from '../types';
import { isSameDay, getTodayString } from './date';

/** localStorage キー定数 */
const SETTINGS_KEY = 'pomodoro-settings';
const STATISTICS_KEY = 'pomodoro-statistics';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Settings オブジェクトを JSON 文字列にシリアライズする
 */
export function serializeSettings(s: Settings): string {
  return JSON.stringify(s);
}

/**
 * JSON 文字列を Settings オブジェクトにデシリアライズする
 */
export function deserializeSettings(json: string): Settings {
  return JSON.parse(json) as Settings;
}

/**
 * localStorage から Settings を読み込む。
 * ストレージが空またはアクセスに失敗した場合は DEFAULT_SETTINGS を返す。
 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw === null) {
      return { ...DEFAULT_SETTINGS };
    }
    return deserializeSettings(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Settings を localStorage に書き込む。
 * アクセスに失敗した場合は silent fail とする。
 */
export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, serializeSettings(s));
  } catch {
    // localStorage が使用できない環境では何もしない（silent fail）
  }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/**
 * Statistics オブジェクトを JSON 文字列にシリアライズする
 */
export function serializeStatistics(st: Statistics): string {
  return JSON.stringify(st);
}

/**
 * JSON 文字列を Statistics オブジェクトにデシリアライズする
 */
export function deserializeStatistics(json: string): Statistics {
  return JSON.parse(json) as Statistics;
}

/**
 * localStorage から Statistics を読み込む。
 * - ストレージが空の場合は今日の日付で todayCount: 0 を返す
 * - 保存済み日付が前日以前の場合は todayCount を 0 にリセットして返す
 * - アクセスに失敗した場合は今日の日付で todayCount: 0 を返す
 */
export function loadStatistics(): Statistics {
  const today = getTodayString();
  const defaultStats: Statistics = { date: today, todayCount: 0 };

  try {
    const raw = localStorage.getItem(STATISTICS_KEY);
    if (raw === null) {
      return { ...defaultStats };
    }

    const stored = deserializeStatistics(raw);

    if (!isSameDay(stored.date, today)) {
      // 前日以前のデータは当日付きの 0 でリセット
      return { ...defaultStats };
    }

    return stored;
  } catch {
    return { ...defaultStats };
  }
}

/**
 * Statistics を localStorage に書き込む。
 * アクセスに失敗した場合は silent fail とする。
 */
export function saveStatistics(st: Statistics): void {
  try {
    localStorage.setItem(STATISTICS_KEY, serializeStatistics(st));
  } catch {
    // localStorage が使用できない環境では何もしない（silent fail）
  }
}
