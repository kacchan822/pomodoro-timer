/**
 * contrast.ts — WCAG コントラスト比の計算ユーティリティ
 *
 * 「文字色が背景色に溶け込む」問題を機械的に検出するための純粋関数群。
 * CSS の色文字列（#rgb / #rrggbb / rgb() / rgba()）をパースし、
 * WCAG 2.1 の相対輝度とコントラスト比を計算する。
 *
 * 注意:
 * - このユーティリティは色値どうしの比較のみを行う（レンダリングはしない）。
 * - jsdom は実際の描画を行わないため、実効的な色解決（currentColor / 継承 /
 *   CSS 変数）はテスト側であらかじめ解決した値を渡す前提とする。
 */

export interface Rgb {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

/**
 * CSS 色文字列を RGB に変換する。対応形式: #rgb, #rrggbb, rgb(), rgba()。
 * パースできない場合は null を返す。
 */
export function parseColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();

  // #rgb / #rrggbb
  const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  // rgb() / rgba()
  const rgbMatch = s.match(/^rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  return null;
}

/**
 * sRGB チャンネル値（0-255）を相対輝度計算用の線形値に変換する。
 * WCAG 2.1 の定義に従う。
 */
function channelToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/**
 * WCAG 2.1 相対輝度（0.0 - 1.0）。
 */
export function relativeLuminance(color: Rgb): number {
  const r = channelToLinear(color.r);
  const g = channelToLinear(color.g);
  const b = channelToLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * 2 色間の WCAG コントラスト比（1.0 - 21.0）。
 */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA のコントラスト閾値。 */
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3.0;

/**
 * 前景色と背景色が WCAG AA を満たすか判定する。
 * @param fg 前景（文字）色の CSS 文字列
 * @param bg 背景色の CSS 文字列
 * @param large 大きい文字（>=18pt もしくは >=14pt 太字）なら true
 */
export function meetsWcagAA(fg: string, bg: string, large = false): boolean {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return false;
  const ratio = contrastRatio(f, b);
  return ratio >= (large ? WCAG_AA_LARGE : WCAG_AA_NORMAL);
}
