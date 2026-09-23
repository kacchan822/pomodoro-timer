import type { Settings, ValidationResult } from '../types';

/**
 * ユーザー設定を検証し、各フィールドの境界値チェックを行う。
 *
 * 合法な範囲:
 * - sessionMinutes:    1〜60
 * - shortBreakMinutes: 1〜30
 * - longBreakMinutes:  1〜60
 * - sessionsPerCycle:  1〜8
 * - notificationsEnabled: boolean（範囲チェック不要）
 *
 * @param s - 検証対象の設定オブジェクト
 * @returns 全フィールドが有効な場合は `{ valid: true }`、
 *          1 つ以上のフィールドが無効な場合は `{ valid: false, errors: { ... } }`
 */
export function validateSettings(s: Settings): ValidationResult {
  const errors: Partial<Record<keyof Settings, string>> = {};

  if (!Number.isInteger(s.sessionMinutes) || s.sessionMinutes < 1 || s.sessionMinutes > 60) {
    errors.sessionMinutes = '作業時間は 1〜60 分の範囲で入力してください。';
  }

  if (!Number.isInteger(s.shortBreakMinutes) || s.shortBreakMinutes < 1 || s.shortBreakMinutes > 30) {
    errors.shortBreakMinutes = '短い休憩は 1〜30 分の範囲で入力してください。';
  }

  if (!Number.isInteger(s.longBreakMinutes) || s.longBreakMinutes < 1 || s.longBreakMinutes > 60) {
    errors.longBreakMinutes = '長い休憩は 1〜60 分の範囲で入力してください。';
  }

  if (!Number.isInteger(s.sessionsPerCycle) || s.sessionsPerCycle < 1 || s.sessionsPerCycle > 8) {
    errors.sessionsPerCycle = 'サイクルあたりのセッション数は 1〜8 の範囲で入力してください。';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
