/**
 * コンポーネント CSS コントラスト検査テスト
 *
 * 目的: 「文字色が背景色に溶け込む」デザイン退行を機械的に検出する。
 *   - テキスト/ボタン系ルールの color と、その有効背景色のコントラストが
 *     WCAG AA を満たすことを検証する。
 *   - ボタン系ルールで color が明示されず、暗い背景に継承色で溶けるリスクを検出する
 *     （TimerControls のスタート/一時停止ボタンが見えなくなった退行の再発防止）。
 *
 * 制約: jsdom は実描画を行わないため、CSS を静的解析して色を解決する。
 *   currentColor / var() / 疑似クラス(:hover 等) は基本状態の色解決の対象外とし、
 *   「色を明示しているルール」に対して検査する。未明示は別途リスクとして検出する。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { contrastRatio, parseColor, WCAG_AA_LARGE, WCAG_AA_NORMAL } from '../../lib/contrast';

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(__dirname, '../../components');
const appVue = join(__dirname, '../../App.vue');

/** 1 つの CSS ルール（セレクタとその宣言）。 */
interface CssRule {
  selector: string;
  declarations: Record<string, string>;
}

/** <style> ブロック内の CSS を素朴にパースしてルール配列にする。 */
function parseCssRules(css: string): CssRule[] {
  // コメントを除去
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssRule[] = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(noComments)) !== null) {
    const selector = m[1].trim();
    const body = m[2];
    const declarations: Record<string, string> = {};
    for (const decl of body.split(';')) {
      const idx = decl.indexOf(':');
      if (idx === -1) continue;
      const prop = decl.slice(0, idx).trim();
      const value = decl.slice(idx + 1).trim();
      if (prop) declarations[prop] = value;
    }
    rules.push({ selector, declarations });
  }
  return rules;
}

/** .vue ファイルから <style> ブロックの中身を全て結合して返す。 */
function extractStyle(vuePath: string): string {
  const src = readFileSync(vuePath, 'utf-8');
  const blocks = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((b) => b[1]);
  return blocks.join('\n');
}

/** グローバル背景色（body の background-color）を App.vue から取得する。 */
function getGlobalBackground(): string {
  const rules = parseCssRules(extractStyle(appVue));
  for (const r of rules) {
    if (/\bbody\b/.test(r.selector) && r.declarations['background-color']) {
      return r.declarations['background-color'];
    }
  }
  return '#1a1a2e'; // フォールバック（既知のテーマ背景）
}

const GLOBAL_BG = getGlobalBackground();

/** 基本状態のセレクタか（:hover 等の疑似クラスや :not を含まない）。 */
function isBaseSelector(selector: string): boolean {
  return !/[:]/.test(selector);
}

/** 検査対象コンポーネント。 */
const componentFiles = [
  'TimerDisplay.vue',
  'TimerControls.vue',
  'StatisticsPanel.vue',
  'SettingsForm.vue',
  'PhaseIndicator.vue',
  'NotificationToggle.vue',
];

describe('グローバル背景の取得', () => {
  it('App.vue の body 背景色をパースできる', () => {
    expect(parseColor(GLOBAL_BG)).not.toBeNull();
  });
});

describe.each(componentFiles)('コントラスト検査: %s', (file) => {
  const rules = parseCssRules(extractStyle(join(componentsDir, file)));
  const baseRules = rules.filter((r) => isBaseSelector(r.selector));

  it('color を明示するルールは有効背景に対して WCAG AA を満たす', () => {
    const failures: string[] = [];

    for (const rule of baseRules) {
      const color = rule.declarations['color'];
      if (!color) continue;
      const fg = parseColor(color);
      if (!fg) continue; // currentColor / var() は基本状態では評価しない

      // 有効背景: 自ルールの background-color（transparent は継承扱い）、
      // 無ければグローバル背景に遡る。
      const ownBg = rule.declarations['background-color'];
      const bgStr =
        ownBg && ownBg !== 'transparent' && parseColor(ownBg) ? ownBg : GLOBAL_BG;
      const bg = parseColor(bgStr);
      if (!bg) continue;

      const ratio = contrastRatio(fg, bg);
      // ボタン/見出し等は大きめ文字が多いが、安全側で通常テキスト基準(4.5)を用いる。
      // 明確に大サイズと分かるものだけ緩める余地はあるが、まずは厳しめで退行を防ぐ。
      if (ratio < WCAG_AA_NORMAL) {
        failures.push(
          `  .${rule.selector} : color ${color} on ${bgStr} = ${ratio.toFixed(2)}:1 (要 >= ${WCAG_AA_NORMAL})`,
        );
      }
    }

    expect(
      failures,
      `${file} でコントラスト不足のルールがあります:\n${failures.join('\n')}`,
    ).toEqual([]);
  });
});

describe('ボタンの color 明示チェック（溶け込み退行の再発防止）', () => {
  // 「テキストを表示するボタン系ルール」は color を明示し、暗背景に埋もれないこと。
  // TimerControls のボタンが color 未指定で見えなくなった退行を対象にする。
  it('TimerControls のボタン基本ルールは明示 color を持ち、暗背景で溶けない', () => {
    const rules = parseCssRules(extractStyle(join(componentsDir, 'TimerControls.vue')));
    // ボタンの基本クラス（.btn 等、疑似クラスなし）を対象にする。
    const btnBaseRules = rules.filter(
      (r) => isBaseSelector(r.selector) && /btn/i.test(r.selector),
    );
    expect(btnBaseRules.length).toBeGreaterThan(0);

    const problems: string[] = [];
    for (const rule of btnBaseRules) {
      const color = rule.declarations['color'];
      if (!color) continue; // 個別クラスで色を持たなくても、基底 .btn が持てば良い

      const fg = parseColor(color);
      if (!fg) {
        // currentColor など解決不能な色をボタン基本状態で使うのは溶け込みリスク。
        problems.push(`  .${rule.selector}: color=${color} は基本状態で解決不能`);
        continue;
      }
      const bg = parseColor(GLOBAL_BG)!;
      const ratio = contrastRatio(fg, bg);
      if (ratio < WCAG_AA_LARGE) {
        problems.push(
          `  .${rule.selector}: color ${color} on ${GLOBAL_BG} = ${ratio.toFixed(2)}:1 (要 >= ${WCAG_AA_LARGE})`,
        );
      }
    }

    // 基底 .btn が明示 color を持つこと（未指定＝継承依存で溶けるため）。
    const baseBtn = btnBaseRules.find((r) => /(^|\.)btn$/.test(r.selector.trim()));
    expect(baseBtn, '.btn 基底ルールが見つかりません').toBeTruthy();
    expect(
      baseBtn!.declarations['color'],
      '.btn は明示 color を持つ必要があります（未指定だと暗背景に溶けます）',
    ).toBeTruthy();

    expect(problems, `ボタンの溶け込みリスク:\n${problems.join('\n')}`).toEqual([]);
  });
});
