# 実装計画: 依存パッケージのセキュリティアップデート

## Overview

Dependabot の PR #1/#2/#3 が本来解消したかった devDependency の既知脆弱性を、検証済みの一貫した 1 セット（vite 8 系フルセット）として適用する。
検証はすべて node:24-alpine コンテナ上で行い、ホストの `node_modules` を持ち込まない。アプリのソースコードは変更しない。依存関係の変更は `package.json` / `package-lock.json` に限られる（本 spec 文書 `.kiro/specs/...` も同じ変更一式に含まれるが、これはドキュメントであり依存関係には影響しない）。

対象: `vite ^5→^8.3.0` / `vitest ^1.2.0→^5.0.1` / `@vitejs/plugin-vue ^5→^6.0.9`（脆弱な `esbuild` は vite 8 が rolldown ベース化に伴い optional peer 化するため依存ツリーから消える）。

### 検証コマンドの実行ルール

`node` / `npm` / `npx` はホストで直接実行しない。すべて node:24-alpine コンテナ内で実行する。ホストの `node_modules` を持ち込まないよう、リポジトリを読み取り用にマウントし、コンテナ内 `/app` にコピーしてから作業する。雛形:

```powershell
docker run --rm -v c:\Users\user\sandbox\pomodoro-timer:/src:ro -w /app node:24-alpine `
  sh -c "cp -r /src/. /app/ && rm -rf node_modules && <実行したいコマンド>"
```

`/src` は `:ro`（読み取り専用）でマウントし、ホスト側を誤って書き換えないようにする。検証系（タスク 1・4・5）はこの雛形をそのまま使う。

`package-lock.json` を更新する場合（タスク 3）は生成した lock をホストへ書き戻す必要があるため、`:ro` の `/src` とは別に、書き込み対象のファイルだけを書き込み可能でマウントする。例:

```powershell
docker run --rm `
  -v c:\Users\user\sandbox\pomodoro-timer:/src:ro `
  -v c:\Users\user\sandbox\pomodoro-timer\package-lock.json:/out/package-lock.json `
  -w /app node:24-alpine `
  sh -c "cp -r /src/. /app/ && rm -rf node_modules && npm install && cp /app/package-lock.json /out/package-lock.json"
```

---

## Tasks

- [x] 1. 事前確認とブランチ準備
  - 作業用ブランチ `chore/deps-security-update` を作成する
  - 更新前の状態で Docker 上で `npm audit` を実行し、脆弱性 4 件（moderate 2 / high 1 / critical 1）をベースラインとして記録する
  - _Requirements: 4.1, 4.2_

- [x] 2. package.json のバージョン更新
  - `devDependencies` の `vite` を `^8.3.0` に更新する
  - `devDependencies` の `vitest` を `^5.0.1` に更新する
  - `devDependencies` の `@vitejs/plugin-vue` を `^6.0.9` に更新する
  - `vue` / `pinia` / その他テスト系依存は変更しないことを確認する
  - _Requirements: 1.2, 1.3, 3.1, 3.2_

- [x] 3. package-lock.json の再生成
  - Docker (node:24-alpine) コンテナ内で `npm install` を実行し、`package-lock.json` を新しい依存ツリーで再生成する
  - 生成された lock で、脆弱な `esbuild` (<=0.24.2) が依存ツリーに存在しないことを確認する
    - vite 8 は esbuild を optional な peerDependency とし実インストールしない（rolldown ベース化）ため、脆弱な esbuild は完全に消えている（実測: `node_modules/esbuild` は生成されない）
  - `package.json` と `package-lock.json` が整合していることを `npm ci` で確認する（成功）
  - _Requirements: 1.2, 2.1, 3.3_

- [x] 4. テストとビルドの検証（Docker）
  - [x] 4.1 テストスイートの実行
    - コンテナ内で `npm run test` を実行し、既存 117 件がすべて成功することを確認する
    - _Requirements: 2.2_

  - [x] 4.2 本番ビルドの実行
    - コンテナ内で `npm run build` を実行し、`vue-tsc` の型チェックと `vite build` が成功することを確認する
    - _Requirements: 2.3_

  - [x] 4.3 ビルドスモークテストの実行
    - コンテナ内で `npm run test:build` を実行し、成功することを確認する（全 4 項目パス）
    - _Requirements: 2.4_

- [x] 5. 脆弱性解消の確認
  - コンテナ内で `npm audit` を実行し、moderate 以上の脆弱性が 0 件であることを確認する（`found 0 vulnerabilities`）
  - ベースライン（4 件）→ 更新後（0 件）
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 6. 開発サーバーの起動確認（任意）
  - `docker compose up` で開発サーバーが起動し、ブラウザで既存機能（タイマー動作・設定・統計）が退行していないことを目視で確認する
  - _Requirements: 2.3_

- [x] 7. コミットと Dependabot PR の整理
  - [x] `package.json` と `package-lock.json` をコミットする（ブランチ `chore/deps-security-update`）
  - [x] PR を作成しマージする（本番バンドルへの影響なし、devDependency のみである旨を説明に記載）
  - [x] マージ後、重複する Dependabot PR #1 / #2 / #3 をクローズする（#3 は元々インストール不能な壊れた PR である旨を添える）
  - _Requirements: 3.3_
