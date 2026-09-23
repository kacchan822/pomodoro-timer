/**
 * NotificationService — Web Notifications API を使ってフェーズ終了通知を表示するサービス
 *
 * 要件 5.1〜5.4 に対応する:
 * - フェーズ終了時にサウンドアラートを再生する（5.1）
 * - 通知許可済みの場合、次フェーズ名を含む Notification を表示する（5.2）
 * - 初回起動時にブラウザの通知許可を要求する（5.3）
 * - 通知を拒否した場合はサウンドのみで通知し、再要求しない（5.4）
 */

import type { Phase } from '../types';
import { playPhaseEndSound } from './AudioService';

/** フェーズに対応する日本語ラベル */
const PHASE_LABELS: Record<Phase, string> = {
  session: '作業中',
  shortBreak: '短い休憩',
  longBreak: '長い休憩',
};

/**
 * ブラウザの通知許可を要求する。
 *
 * - すでに `'granted'` または `'denied'` の場合はそのまま返す（再要求しない）
 * - Notification API が存在しないブラウザでは `'denied'` を返す
 * - `requestPermission()` が失敗した場合も `'denied'` を返す（silent fail）
 *
 * 要件 5.3, 5.4
 */
export async function requestPermission(): Promise<NotificationPermission> {
  try {
    if (!('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission !== 'default') {
      return Notification.permission;
    }
    return await Notification.requestPermission();
  } catch {
    // 許可要求に失敗した場合は silent fail
    return 'denied';
  }
}

/**
 * フェーズ終了時に通知を行う。
 *
 * 1. `AudioService.playPhaseEndSound()` を常に呼び出す（要件 5.1）
 * 2. `Notification.permission === 'granted'` の場合のみ Notification を表示する（要件 5.2）
 * 3. `Notification.permission === 'denied'` の場合はサウンドのみ再生し、再要求しない（要件 5.4）
 * 4. Notification の生成に失敗した場合は silent fail とし、タイマー動作に影響しない
 *
 * @param nextPhase - 次のフェーズ（通知メッセージに使用する）
 */
export function notifyPhaseEnd(nextPhase: Phase): void {
  // サウンドアラートは常に再生する（要件 5.1）
  playPhaseEndSound();

  // 通知許可がない場合はサウンドのみ（要件 5.2, 5.4）
  if (!('Notification' in window)) {
    return;
  }
  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    const label = PHASE_LABELS[nextPhase];
    new Notification('ポモドーロタイマー', {
      body: `次のフェーズ: ${label}`,
      icon: '/favicon.ico',
    });
  } catch {
    // Notification の生成に失敗した場合は silent fail
  }
}
