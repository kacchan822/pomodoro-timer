# 要件定義: 依存パッケージのセキュリティアップデート

## 概要

Dependabot が起票した 3 件の PR (#1 vitest, #2 vite 一式, #3 vite) が本来解消しようとしていた、ビルド／開発ツールチェーンの既知脆弱性を解消する。直接更新するのは devDependency の `vite`・`vitest`・`@vitejs/plugin-vue` の 3 つ。加えて、脆弱性の根本原因である `esbuild`（vite 5 の推移的依存）は、vite 8 系への更新に伴い依存ツリーから除外される（vite 8 は rolldown ベースで esbuild を optional peerDependency とするため）。いずれも開発ツールチェーンに閉じており、本番バンドル (`dist`) の実行時依存には影響しない。

Docker (node:24-alpine) 上での検証により、以下が判明している。

- 脆弱性は 4 件報告され、根本原因は `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99, moderate) と、それに連鎖する `vite`・`vite-node`・`vitest` の脆弱性である。
- `vite` 自体にも high 1 件 (GHSA-fx2h-pf6j-xcff) と moderate 2 件、`vitest` に critical 1 件 (GHSA-5xrq-8626-4rwp) が存在する。
- PR #1 (vitest のみ 4 系へ) は単体でインストール・テスト・ビルドが通るが、vite/esbuild 由来の脆弱性は残る。
- PR #3 (vite 8 だが plugin-vue 5 据え置き) は `npm ci` が ERESOLVE で失敗し、インストール不能。
- PR #2 (vite 8 + @vitejs/plugin-vue 6 + vitest 5) はインストール・テスト (117 件全通過)・ビルドが成功し、`npm audit` で脆弱性 0 になる。

## 要件

### 要件 1: 既知脆弱性の解消

**ユーザーストーリー:** 開発者として、依存パッケージの既知脆弱性をなくしたい。安全なツールチェーンで開発・ビルドできるようにするためである。

#### 受け入れ基準

1. WHEN 依存更新後に Docker (node:24-alpine) コンテナ内で `npm audit` を実行する THEN moderate 以上の脆弱性が 0 件であること
2. WHEN 更新を行う THEN 脆弱な `esbuild` (<=0.24.2) が依存ツリーに存在しないこと（vite 8 が esbuild を optional peerDependency とし、実インストールされないため）
3. WHEN 更新を行う THEN `vite` および `vitest` が直接の脆弱性を持たないバージョンに更新されること

### 要件 2: ビルドとテストの健全性維持

**ユーザーストーリー:** 開発者として、バージョンアップ後も既存のテストとビルドがすべて通ってほしい。アップデートによる機能退行がないことを保証するためである。

#### 受け入れ基準

> 以下のコマンドはすべて Docker (node:24-alpine) コンテナ内で実行する（ホストでの `node` / `npm` 直接実行は行わない）。

1. WHEN 更新後にコンテナ内で `npm ci` を実行する THEN 依存解決エラー (ERESOLVE) なくインストールが完了すること
2. WHEN 更新後にコンテナ内で `npm run test` を実行する THEN 既存の 117 件のテストがすべて成功すること
3. WHEN 更新後にコンテナ内で `npm run build` を実行する THEN `vue-tsc` の型チェックと `vite build` が成功し `dist` が生成されること
4. WHEN 更新後にコンテナ内で `npm run test:build` (ビルドスモークテスト) を実行する THEN 成功すること

### 要件 3: 依存バージョンの整合性

**ユーザーストーリー:** 開発者として、更新後の依存関係が相互に互換であってほしい。将来のインストール失敗や不整合を避けるためである。

#### 受け入れ基準

1. WHEN `vite` をメジャーアップする THEN `@vitejs/plugin-vue` を、その vite バージョンを peer に含むメジャーへ同時に更新すること
2. WHEN `vite` をメジャーアップする THEN `vitest` を、その vite バージョンを peer に含むメジャーへ同時に更新すること
3. WHEN 更新を行う THEN `package.json` と `package-lock.json` の両方が整合した状態でコミットされること

### 要件 4: 検証環境の一貫性

**ユーザーストーリー:** 開発者として、検証はプロジェクト規定どおり Docker 上で行いたい。ホスト環境差異による誤判定を避けるためである。

#### 受け入れ基準

1. WHEN 依存更新の検証を行う THEN node:24-alpine コンテナ（プロジェクトの Dockerfile と同じ Node バージョン）上で `npm ci` / `test` / `build` / `audit` を実行すること
2. WHEN 検証・作業を行う THEN ホスト上で `node` / `npm` / `npx` を直接実行しないこと（すべてコンテナ内で完結させる）
3. IF ホスト側に `node_modules` が存在する THEN 検証結果に影響させないこと（コンテナ内で依存を解決する）
