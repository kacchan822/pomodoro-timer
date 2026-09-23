#!/usr/bin/env node
/**
 * Cloudflare Pages ビルド検証スモークテスト
 *
 * 目的:
 *   `npm run build` が成功し、Cloudflare Pages にデプロイ可能な静的成果物が
 *   `dist/` に生成されることを検証する。
 *
 * 検証項目:
 *   1. `npm run build` が正常終了し `dist/` ディレクトリが生成される（Requirement 7.3）
 *   2. `dist/index.html` が存在する（Requirement 7.3, 7.4）
 *   3. `dist/_redirects` が存在する（public/_redirects がコピーされている）（Requirement 7.4）
 *   4. `dist/index.html` にインラインスクリプトが含まれない（CSP 要件）（Requirement 7.5）
 *
 * 使い方:
 *   node scripts/build-smoke-test.mjs
 *   （package.json の "test:build" スクリプト経由でも実行可能）
 *
 * 終了コード:
 *   0 — 全項目パス
 *   1 — いずれかの項目が失敗
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

/** 結果集計 */
const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  \u2714 ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.error(`  \u2718 ${name}`);
    console.error(`      ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * index.html にインラインスクリプト（<script> タグ内に直接記述されたコード）が
 * 含まれていないことを検証する。
 * 外部参照のみのスクリプト（<script ... src="..."></script>）は許可する。
 */
function assertNoInlineScripts(html) {
  // <script ...>...</script> の開始タグ・中身・終了タグを抽出
  const scriptBlockRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptBlockRe.exec(html)) !== null) {
    const attrs = match[1];
    const body = match[2].trim();
    const hasSrc = /\bsrc\s*=/.test(attrs);

    if (body.length > 0) {
      throw new Error(
        `インラインスクリプトが検出されました (CSP 違反):\n      ${body.slice(0, 120)}...`
      );
    }
    if (!hasSrc) {
      throw new Error(
        'src 属性を持たない <script> タグが検出されました (CSP 違反)'
      );
    }
  }

  // 自己完結型のインラインスクリプトタグ（例: <script>code</script> の変形）も
  // 上記正規表現でカバー済み。念のため src なし & 中身なしの空タグは許容。
}

console.log('Cloudflare Pages ビルド検証スモークテストを開始します...\n');

// --- 1. クリーンビルド ---
console.log('[1/2] クリーンビルドを実行します (npm run build)...');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

try {
  execSync('npm run build', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
} catch (err) {
  console.error('\nビルドが失敗しました。');
  process.exit(1);
}

console.log('\n[2/2] 成果物を検証します...\n');

// --- 2. 成果物検証 ---
check('dist/ ディレクトリが生成される (Req 7.3)', () => {
  assert(existsSync(distDir), 'dist/ ディレクトリが存在しません');
});

check('dist/index.html が存在する (Req 7.3, 7.4)', () => {
  assert(
    existsSync(join(distDir, 'index.html')),
    'dist/index.html が存在しません'
  );
});

check('dist/_redirects が存在する (Req 7.4)', () => {
  const redirectsPath = join(distDir, '_redirects');
  assert(existsSync(redirectsPath), 'dist/_redirects が存在しません');
  const content = readFileSync(redirectsPath, 'utf-8');
  assert(
    content.includes('/index.html'),
    '_redirects に SPA ルーティング設定が含まれていません'
  );
});

check('dist/index.html にインラインスクリプトが含まれない (Req 7.5)', () => {
  const html = readFileSync(join(distDir, 'index.html'), 'utf-8');
  assertNoInlineScripts(html);
});

// --- 結果表示 ---
const failed = results.filter((r) => !r.ok);
console.log('');
if (failed.length === 0) {
  console.log(`\u2714 全 ${results.length} 項目のスモークテストがパスしました。`);
  process.exit(0);
} else {
  console.error(
    `\u2718 ${failed.length}/${results.length} 項目が失敗しました。`
  );
  process.exit(1);
}
