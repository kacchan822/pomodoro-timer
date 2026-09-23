# 🍅 [Pomodoro Timer](https://pomodoro.kacchan822.dev/)

> **Note:**  
> 本プロジェクトは、**[Kiro University Challenge 2026](https://kiro.dev/2026/university/)** の課題として取り組んでいるものです。
> AIエージェント（Kiro）を用いた「仕様駆動開発（Spec-Driven Development）」の実践と学習を目的としています。

## 📖 概要
Vue 3 (Composition API) と TypeScript を用いた SPA 型のポモドーロタイマーアプリです。
学習への集中をサポートするためのタイマー機能を提供し、静的サイトとして Cloudflare Pages にデプロイすることを前提として設計されています。

## 🛠 技術スタック
- **Framework**: Vue 3 (`<script setup>` / Composition API)
- **Language**: TypeScript
- **State Management**: Pinia
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Hosting**: Cloudflare Pages

## ✨ 主な機能
- **タイマーモード**: 
  - 🍅 ポモドーロ（作業）: 25分
  - ☕️ ショートブレイク（小休憩）: 5分
  - 🛌 ロングブレイク（長休憩）: 15分
- **基本操作**: 開始 (Start)、一時停止 (Pause)、リセット (Reset)
- **通知**: タイマー終了時のアラーム音 / ブラウザ通知 (Web Notifications API)
- **UI/UX**: 
  - レスポンシブでシンプルなデザイン
  - ブラウザのタブタイトル（`document.title`）への残り時間リアルタイム表示
- **アクセシビリティ**: WCAG 2.1 AA 準拠を意識したマークアップ

## 🚀 開発環境のセットアップ

### 前提条件
- Node.js (v24 LTS 推奨)

### インストールと起動
```bash
# 1. パッケージのインストール
npm install

# 2. 開発用サーバーの起動
npm run dev
```

### ビルドとデプロイ
```bash
# 本番用ビルド（`dist` ディレクトリに生成されます）
npm run build
```
デプロイは Cloudflare Pages に GitHub リポジトリを連携させ、ビルドコマンドに `npm run build`、出力ディレクトリに `dist` を指定して行います。

## 📂 ドキュメント
仕様駆動開発のプロセスに基づく各種ドキュメントは `.kiro/specs/pomodoro-timer/` 配下に格納されています。

- `requirements.md` (要件定義)
- `design.md` (技術設計書)
- `tasks.md` (タスク分解と実装フェーズ)