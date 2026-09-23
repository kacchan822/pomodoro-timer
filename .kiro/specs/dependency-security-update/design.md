# 設計: 依存パッケージのセキュリティアップデート

## 方針

Dependabot の 3 PR は `npm_and_yarn` グループの重複更新であり、そのままでは扱いにくい。3 PR が目指したゴール（脆弱性の解消）を、検証済みで一貫した 1 セットの更新として自前で適用する。

検証結果から、脆弱性を完全に解消しつつインストール・テスト・ビルドが成立する組み合わせは **PR #2 相当**（vite 8 系フルセット）だけである。したがってこれを採用する。

## 対象バージョン

| パッケージ | 現行 | 更新後 | 種別 | 備考 |
|-----------|------|--------|------|------|
| `vite` | `^5.0.0` | `^8.3.0` | devDependency | 脆弱性 (high/moderate) と esbuild 連鎖を解消 |
| `vitest` | `^1.2.0` | `^5.0.1` | devDependency | critical 脆弱性を解消。vite 8 と互換 |
| `@vitejs/plugin-vue` | `^5.0.0` | `^6.0.9` | devDependency | vite 8 を peer に含めるため必須で同時更新 |
| `esbuild` | 0.21.5（vite 5 の推移的依存） | 依存ツリーから消滅 | — | vite 8 は rolldown ベースで esbuild を optional peerDependency 化。脆弱な esbuild <=0.24.2 がツリーから除外される |

`vue`・`pinia`・`@testing-library/vue`・`@vue/test-utils`・`jsdom`・`fast-check`・`typescript`・`vue-tsc` は現状維持。これらは脆弱性報告がなく、vite 8 / vitest 5 との互換に問題がないことを検証済み。

## 却下した選択肢

- **PR #1 のみ (vitest 4 のみ)**: vite/esbuild 由来の脆弱性が残るため要件 1 を満たさない。
- **PR #3 (vite 8 + plugin-vue 5 据え置き)**: `@vitejs/plugin-vue@5` の peer が `vite@^5||^6` のため vite 8 と衝突し `npm ci` が ERESOLVE で失敗する。要件 2.1 を満たさない。
- **段階的アップ (vite 6 → 7 → 8)**: 中間バージョンでも脆弱性は解消されうるが、検証コストが増える割に利点がない。最新安定版へ一括更新する。

## 影響範囲

- 影響するのはビルド・テスト・開発サーバー（devDependency のみ）。本番バンドルの実行時依存には影響しない。
- `vite.config.ts` は変更不要（検証で `plugins: [vue()]`, `server`, `test` 設定はそのまま動作を確認済み）。
- vite 8 のビルド出力はチャンク名ハッシュ等が変わるが、成果物の内容・サイズはほぼ同等（84KB 前後）。

## 検証手順（Docker）

プロジェクトの Dockerfile と同じ `node:24-alpine` を使い、ホストの `node_modules` を持ち込まずにコンテナ内で完結させる。

1. `npm ci` — ERESOLVE なくインストールできること
2. `npm run test` — 117 件全通過
3. `npm run build` — `vue-tsc` + `vite build` 成功
4. `npm run test:build` — スモークテスト成功
5. `npm audit` — moderate 以上 0 件

## ロールバック

`package.json` / `package-lock.json` の変更を git で戻すだけで現行状態へ復帰できる。ソースコード自体は変更しない。
