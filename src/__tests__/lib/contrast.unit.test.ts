/**
 * contrast.ts のユニットテスト
 *
 * WCAG コントラスト計算とカラーパースが正しく動くことを検証する。
 */

import { describe, it, expect } from 'vitest';
import {
  parseColor,
  contrastRatio,
  meetsWcagAA,
  relativeLuminance,
} from '../../lib/contrast';

describe('parseColor', () => {
  it('#rrggbb をパースできる', () => {
    expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#1a1a2e')).toEqual({ r: 26, g: 26, b: 46 });
  });

  it('#rgb（短縮形）をパースできる', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('rgb() / rgba() をパースできる', () => {
    expect(parseColor('rgb(79, 142, 247)')).toEqual({ r: 79, g: 142, b: 247 });
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('パースできない値は null を返す', () => {
    expect(parseColor('transparent')).toBeNull();
    expect(parseColor('currentColor')).toBeNull();
    expect(parseColor('var(--x)')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('白と黒のコントラスト比は 21:1', () => {
    const white = parseColor('#ffffff')!;
    const black = parseColor('#000000')!;
    expect(contrastRatio(white, black)).toBeCloseTo(21, 0);
  });

  it('同一色のコントラスト比は 1:1', () => {
    const c = parseColor('#1a1a2e')!;
    expect(contrastRatio(c, c)).toBeCloseTo(1, 5);
  });

  it('比の計算は順序に依存しない（対称）', () => {
    const a = parseColor('#4f8ef7')!;
    const b = parseColor('#1a1a2e')!;
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 5);
  });
});

describe('relativeLuminance', () => {
  it('白は 1.0、黒は 0.0', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });
});

describe('meetsWcagAA', () => {
  it('溶け込みケース（暗背景に暗文字）は不合格', () => {
    // 修正前の TimerControls のリセットボタン（#888）を暗背景（#1a1a2e）に置いた例。
    // 実際には両方暗いためコントラストが不足する。
    expect(meetsWcagAA('#333333', '#1a1a2e')).toBe(false);
  });

  it('明るい文字 × 暗い背景は合格', () => {
    expect(meetsWcagAA('#f0f0f0', '#1a1a2e')).toBe(true);
  });

  it('パース不能な色は不合格扱い', () => {
    expect(meetsWcagAA('currentColor', '#1a1a2e')).toBe(false);
  });
});
