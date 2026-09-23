/**
 * AudioService — Web Audio API を使ってフェーズ終了音を再生するサービス
 *
 * ブラウザの autoplay policy により AudioContext が suspended 状態になることがある。
 * ユーザーの最初のインタラクション後に resume() を試みることで対応する。
 * 全ての操作は try/catch でラップし、失敗時は silent fail とする（要件 5.1）。
 */

/** シングルトンの AudioContext を保持する */
let audioContext: AudioContext | null = null;

/**
 * AudioContext を取得または生成する。
 * 生成・resume に失敗した場合は null を返す。
 */
function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
      // resume は非同期だが、ここでは fire-and-forget で呼ぶ
      audioContext.resume().catch(() => {
        // resume 失敗は無視（silent fail）
      });
    }
    return audioContext;
  } catch {
    // AudioContext の生成に失敗した場合（古いブラウザなど）
    return null;
  }
}

/**
 * フェーズ終了時にビープ音を再生する。
 *
 * OscillatorNode で短いビープ音を生成する:
 * - 440Hz の正弦波を 0.1 秒間再生
 * - GainNode でフェードアウトし、クリックノイズを防ぐ
 *
 * 失敗時は silent fail とする（要件 5.1）。
 */
export function playPhaseEndSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 440Hz の正弦波
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);

    // ゲインを 0.3 から 0 にフェードアウト（クリックノイズ防止）
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    // stop 後に自動的にノードがガベージコレクトされるよう onended で切断する
    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gainNode.disconnect();
      } catch {
        // disconnect 失敗は無視
      }
    };
  } catch {
    // 音声再生の失敗は silent fail とする（要件 5.1）
  }
}
