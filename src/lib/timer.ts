import type { Phase } from '../types';

/**
 * フェーズの日本語ラベルマップ
 */
const PHASE_LABELS: Record<Phase, string> = {
  session: '作業中',
  shortBreak: '短い休憩',
  longBreak: '長い休憩',
};

/**
 * 秒数を MM:SS 形式の文字列に変換する
 * @param totalSeconds 0 以上 5999 以下の整数
 * @returns "MM:SS" 形式の文字列（例: "25:00", "04:59"）
 */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * ブラウザタブタイトル用の文字列を生成する
 * @param phase 現在のフェーズ
 * @param totalSeconds 残り時間（秒）
 * @returns タイトル文字列（例: "25:00 — 作業中"）
 */
export function formatTitle(phase: Phase, totalSeconds: number): string {
  const time = formatTime(totalSeconds);
  const label = PHASE_LABELS[phase];
  return `${time} — ${label}`;
}

/**
 * 次のフェーズを計算する
 *
 * - currentPhase が 'shortBreak' または 'longBreak' の場合 → 'session'
 * - currentPhase が 'session' で completedSessions が sessionsPerCycle の倍数 → 'longBreak'
 * - currentPhase が 'session' でそれ以外 → 'shortBreak'
 *
 * @param currentPhase 現在のフェーズ
 * @param completedSessions 完了済みセッション数（直前のセッション完了後に加算済みの値）
 * @param sessionsPerCycle 1 サイクルあたりのセッション数（1〜8）
 * @returns 次のフェーズ
 */
export function getNextPhase(
  currentPhase: Phase,
  completedSessions: number,
  sessionsPerCycle: number,
): Phase {
  if (currentPhase === 'shortBreak' || currentPhase === 'longBreak') {
    return 'session';
  }
  // currentPhase === 'session'
  if (completedSessions % sessionsPerCycle === 0) {
    return 'longBreak';
  }
  return 'shortBreak';
}

/**
 * セッションインジケーターの状態配列を生成する
 *
 * 返す配列の長さは sessionsPerCycle であり、
 * 先頭 completedInCycle 個が true、残りが false となる。
 *
 * @param completedInCycle 現在サイクル内の完了セッション数（0 以上 sessionsPerCycle 以下）
 * @param sessionsPerCycle 1 サイクルあたりのセッション数（1〜8）
 * @returns boolean[] — true が完了済み、false が未完了
 */
export function getIndicatorStates(
  completedInCycle: number,
  sessionsPerCycle: number,
): boolean[] {
  return Array.from({ length: sessionsPerCycle }, (_, i) => i < completedInCycle);
}
