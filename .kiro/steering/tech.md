# 技術スタック

## コア技術

| 役割 | 技術 |
|------|------|
| フレームワーク | Vue 3（`<script setup lang="ts">` / Composition API） |
| 言語 | TypeScript |
| ビルドツール | Vite |
| 状態管理 | Pinia（Setup Store スタイル） |
| スタイリング | CSS Modules（バンドルサイズゼロ、スコープ付きスタイル） |
| ホスティング | Cloudflare Pages（静的） |

## テスト

| ツール | 用途 |
|--------|------|
| Vitest | テストランナー（Vite と共通設定） |
| @testing-library/vue | コンポーネントテスト |
| fast-check | プロパティベーステスト（PBT） |
| jsdom | ブラウザ環境エミュレーション |

## 開発環境

> **⚠️ 重要: Node.js はコンテナ内のみで実行する。ホスト（Windows）側で `npm` や `node` を直接実行してはいけない。**

- ホスト側には Docker Desktop（WSL2 バックエンド）のみが必要
- Node.js のバージョンはコンテナイメージ `node:24-alpine` で固定
- `npm install` / `npm run build` / `npm run test` など **全ての Node.js コマンドは `docker compose run --rm app <command>` 経由で実行する**
- Vite dev server をポート `5173` でホストへ公開
- WSL2 / NTFS 環境でのファイル監視のため `CHOKIDAR_USEPOLLING=true` を設定

## 主要コマンド

```bash
# 初回セットアップ（イメージビルド + 依存インストール）
docker compose up --build

# 開発サーバー起動
docker compose up

# 本番ビルド（dist/ に出力）
docker compose run --rm app npm run build

# テスト実行
docker compose run --rm app npm run test

# コンテナ停止・削除
docker compose down
```

## localStorage キー

| キー | 内容 |
|------|------|
| `pomodoro-settings` | JSON シリアライズされた `Settings` オブジェクト |
| `pomodoro-statistics` | JSON シリアライズされた `Statistics` オブジェクト |

## デプロイ

GitHub にプッシュ → Cloudflare Pages が `npm run build` を実行し `dist/` を配信。`_redirects` ファイルにより全ルートを `index.html` へフォールバック（SPA ルーティング）。
