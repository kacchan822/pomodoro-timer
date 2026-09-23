# 実装計画: ポモドーロタイマー SPA

## Overview

Vite + Vue 3 + TypeScript + Pinia + CSS Modules で構成するポモドーロタイマー SPA を段階的に実装する。
純粋ロジック関数 → Pinia ストア → コンポーネント → 副作用サービスの順で積み上げ、各ステップで動作を確認できるようにする。
プロパティベーステスト (fast-check) はロジック関数の実装直後に配置し、早期にバグを検出する。

---

## Tasks

- [x] 1. プロジェクト骨格の構築
  - Vite + Vue 3 + TypeScript プロジェクトを `npm create vite@latest` で初期化する（`vue-ts` テンプレート）
  - `pinia`, `vitest`, `@testing-library/vue`, `@vue/test-utils`, `jsdom`, `fast-check` を `npm install` で追加する
  - `vite.config.ts` に `server.host: true`, `port: 5173` と Vitest の `test.environment: 'jsdom'` を設定する
  - `Dockerfile` と `docker-compose.yml` をデザインドキュメントの仕様どおりに作成する
  - `src/` 配下に `lib/`, `stores/`, `components/`, `__tests__/lib/`, `__tests__/stores/`, `__tests__/components/` ディレクトリを作成する
  - `public/_redirects` に `/* /index.html 200` を記述して SPA ルーティングを設定する
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. データモデルと型定義
  - [x] 2.1 コア型定義ファイルの作成
    - `src/types.ts` に `Phase`, `Settings`, `DEFAULT_SETTINGS`, `TimerState`, `Statistics`, `ValidationResult` を定義する
    - `Settings` の各フィールドに JSDoc でバリデーション範囲をコメントする
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 4.2, 6.1_

- [x] 3. 純粋ロジック関数の実装
  - [x] 3.1 `src/lib/timer.ts` の実装
    - `formatTime(totalSeconds: number): string` — 秒数を `MM:SS` 形式に変換する
    - `formatTitle(phase: Phase, totalSeconds: number): string` — タブタイトル用文字列を生成する
    - `getNextPhase(currentPhase, completedSessions, sessionsPerCycle): Phase` — フェーズ遷移ロジックを実装する
    - `getIndicatorStates(completedInCycle, sessionsPerCycle): boolean[]` — インジケーター状態配列を生成する
    - _Requirements: 1.1, 1.6, 2.2, 2.3, 2.4, 2.6_

  - [ ]* 3.2 `formatTime` のプロパティテストを書く（Property 1）
    - **Property 1: formatTime のラウンドトリップ整合性**
    - `fc.integer({ min: 0, max: 5999 })` で 100 イテレーション実行する
    - `MM:SS` パターン一致と `M*60+S === seconds` を検証する
    - **Validates: Requirements 1.1**

  - [ ]* 3.3 `getNextPhase` のプロパティテストを書く（Property 3）
    - **Property 3: フェーズ遷移ロジックの正確性**
    - `fc.integer({ min: 1, max: 100 })` と `fc.integer({ min: 1, max: 8 })` で組み合わせを生成する
    - セッション完了時とブレーク完了時の遷移条件を全網羅する
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ]* 3.4 `getIndicatorStates` のプロパティテストを書く（Property 8）
    - **Property 8: セッションインジケーター配列の不変条件**
    - 配列長が `sessionsPerCycle` と等しく、先頭 `completedInCycle` 個が `true`、残りが `false` であることを検証する
    - **Validates: Requirements 2.6**

  - [ ]* 3.5 `formatTitle` のプロパティテストを書く（Property 9）
    - **Property 9: タイトルフォーマットの構造不変条件**
    - `formatTitle` の出力が `formatTime` の出力を含むことを検証する
    - **Validates: Requirements 1.6**

  - [x] 3.6 `src/lib/validation.ts` の実装
    - `validateSettings(s: Settings): ValidationResult` を実装する
    - 各フィールドの境界値チェック（`sessionMinutes: 1–60`, `shortBreakMinutes: 1–30`, `longBreakMinutes: 1–60`, `sessionsPerCycle: 1–8`）を行う
    - エラーがある場合は `{ valid: false, errors: Record<keyof Settings, string> }` を返す
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [ ]* 3.7 `validateSettings` のプロパティテストを書く（Property 4）
    - **Property 4: 設定バリデーションの境界整合性**
    - 合法な範囲内の全組み合わせで `valid: true`、境界を 1 超えた値で `valid: false` を検証する
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7**

  - [x] 3.8 `src/lib/storage.ts` の実装
    - `serializeSettings(s: Settings): string` と `deserializeSettings(json: string): Settings` を実装する
    - `serializeStatistics(st: Statistics): string` と `deserializeStatistics(json: string): Statistics` を実装する
    - `loadSettings(): Settings` — `localStorage` から読み込み、失敗時は `DEFAULT_SETTINGS` を返す（`try/catch` 必須）
    - `saveSettings(s: Settings): void` — `localStorage` に書き込む（`try/catch` 必須）
    - `loadStatistics(): Statistics` — `localStorage` から読み込み、前日以前の日付なら `todayCount: 0` でリセットする
    - `saveStatistics(st: Statistics): void` — `localStorage` に書き込む（`try/catch` 必須）
    - _Requirements: 3.5, 4.1, 4.2, 4.3, 4.4, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 3.9 設定シリアライズのプロパティテストを書く（Property 5）
    - **Property 5: 設定のシリアライズ・デシリアライズ ラウンドトリップ**
    - 合法な `Settings` オブジェクトを生成し、`deserializeSettings(serializeSettings(s))` が元と深く等しいことを検証する
    - **Validates: Requirements 3.5, 4.3**

  - [ ]* 3.10 統計シリアライズのプロパティテストを書く（Property 6）
    - **Property 6: 統計のシリアライズ・デシリアライズ ラウンドトリップ**
    - `deserializeStatistics(serializeStatistics(st))` が元と等しいことを検証する
    - **Validates: Requirements 6.6**

  - [x] 3.11 `src/lib/date.ts` の実装
    - `isSameDay(a: string, b: string): boolean` — YYYY-MM-DD 文字列の日付一致判定を実装する
    - `getTodayString(): string` — ローカルタイムゾーンで今日の YYYY-MM-DD 文字列を返す
    - _Requirements: 6.1, 6.4, 6.5_

  - [ ]* 3.12 `isSameDay` のプロパティテストを書く（Property 7）
    - **Property 7: `isSameDay` の対称性**
    - `isSameDay(a, b) === isSameDay(b, a)`（対称律）と `isSameDay(a, a) === true`（反射律）を検証する
    - **Validates: Requirements 6.1, 6.5**

- [ ] 4. チェックポイント — 純粋ロジック層の確認
  - 全テストが通過することを確認する。問題があればユーザーに確認する。

- [ ] 5. 副作用サービスの実装
  - [ ] 5.1 `src/services/AudioService.ts` の実装
    - `playPhaseEndSound(): void` — Web Audio API で `OscillatorNode` を使いビープ音を再生する
    - `AudioContext` の生成と `resume()` を `try/catch` でラップし、失敗時は silent fail とする
    - _Requirements: 5.1_

  - [ ] 5.2 `src/services/NotificationService.ts` の実装
    - `requestPermission(): Promise<NotificationPermission>` — ブラウザの通知許可を要求する
    - `notifyPhaseEnd(nextPhase: Phase): void` — 許可済みの場合のみ `Notification` を表示し、`AudioService.playPhaseEndSound()` を呼ぶ
    - `Notification.permission === 'denied'` の場合はサウンドのみ再生し、再要求しない
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Pinia ストアの実装
  - [ ] 6.1 `src/stores/settingsStore.ts` の実装
    - `useSettingsStore` を Setup Store スタイルで定義する
    - 起動時に `loadSettings()` を呼び、`settings` ref を初期化する
    - `saveSettingsAction(s: Settings): void` — `validateSettings` で検証後、`saveSettings` を呼び `settings` を更新する
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4_

  - [ ] 6.2 `src/stores/statisticsStore.ts` の実装
    - `useStatisticsStore` を Setup Store スタイルで定義する
    - 起動時に `loadStatistics()` を呼び、`todayCount` ref を初期化する（前日の場合は 0 でリセット）
    - `incrementToday(): void` — `todayCount` を加算し `saveStatistics` を呼ぶ
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 6.3 `src/stores/timerStore.ts` の実装
    - `useTimerStore` を Setup Store スタイルで定義する
    - `phase`, `secondsRemaining`, `isRunning`, `completedSessions` を ref で保持する
    - `formattedTime` と `formattedTitle` を computed で提供する
    - `start()` — `setInterval` を開始し `isRunning` を `true` にする
    - `pause()` — `clearInterval` を呼び `isRunning` を `false` にする
    - `reset()` — `clearInterval` を呼び、現在のフェーズの設定時間で `secondsRemaining` を初期化する
    - `tick()` — 1 秒ごとに呼ばれ、`secondsRemaining` をデクリメントし、0 になったら `getNextPhase` でフェーズ遷移・統計更新・通知呼び出しを行う
    - `applySettings(s: Settings): void` — 設定保存後にタイマーをリセットして新しい時間を反映する
    - `document.title` を `formattedTitle` で更新する
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 3.6, 5.1, 5.2, 5.5_

  - [ ]* 6.4 `useTimerStore` のユニットテストを書く
    - `start()` で `isRunning` が `true` になることを検証する
    - `pause()` で `isRunning` が `false` になり `secondsRemaining` が保持されることを検証する
    - `tick()` でタイムアップ時にフェーズ遷移・統計加算・通知サービス呼び出しが行われることを検証する
    - `reset()` で `secondsRemaining` が現在フェーズの設定秒数に戻ることを検証する（Property 2 の確認）
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1_

  - [ ]* 6.5 `useTimerStore.reset()` のプロパティテストを書く（Property 2）
    - **Property 2: リセット後の残り時間は設定値と一致する**
    - 合法な `Settings` と任意の `Phase` で `reset()` 後の `secondsRemaining` が `settings[phase + 'Minutes'] * 60` と等しいことを検証する
    - **Validates: Requirements 1.4**

  - [ ]* 6.6 ストレージ関連のユニットテストを書く
    - `loadSettings()` でストレージが空の場合に `DEFAULT_SETTINGS` を返すことを検証する
    - `loadSettings()` で保存済みデータがある場合にその値を返すことを検証する
    - `loadStatistics()` で前日以前の日付の場合に `todayCount: 0` でリセットされることを検証する
    - _Requirements: 4.1, 4.2, 6.4, 6.5_

- [ ] 7. チェックポイント — ストアとサービス層の確認
  - 全テストが通過することを確認する。問題があればユーザーに確認する。

- [ ] 8. UI コンポーネントの実装
  - [ ] 8.1 `src/components/TimerDisplay.vue` の実装
    - `TimerDisplayProps`（`phase`, `secondsRemaining`, `isRunning`）を `defineProps<T>()` で受け取る
    - 残り時間を `MM:SS` 形式で表示し、フェーズ名（日本語ラベル）を表示する
    - `aria-live="polite"` 領域を設け、フェーズ変更時のみ `aria-live="assertive"` に切り替える
    - CSS Modules でスタイルを適用する
    - _Requirements: 1.1, 2.5, 8.1_

  - [ ] 8.2 `src/components/TimerControls.vue` の実装
    - `TimerControlsProps`（`isRunning`）を受け取り、`start`, `pause`, `reset` イベントを `defineEmits<T>()` で定義する
    - 全ボタンに `type="button"` と適切な `aria-label` を付与する
    - `isRunning` に応じてスタート/一時停止ボタンを切り替える
    - _Requirements: 1.2, 1.3, 1.4, 8.2, 8.4_

  - [ ] 8.3 `src/components/PhaseIndicator.vue` の実装
    - `PhaseIndicatorProps`（`completedInCycle`, `sessionsPerCycle`）を受け取る
    - `getIndicatorStates` を呼び出してドット（◉/○）を描画する
    - _Requirements: 2.6_

  - [ ] 8.4 `src/components/StatisticsPanel.vue` の実装
    - `StatisticsPanelProps`（`todayCount`）を受け取り、当日の完了セッション数を表示する
    - _Requirements: 6.2_

  - [ ] 8.5 `src/components/NotificationToggle.vue` の実装
    - `notificationsEnabled` の切り替えトグルを実装する
    - 初回クリック時に `requestPermission()` を呼ぶ
    - _Requirements: 5.3, 5.5_

  - [ ] 8.6 `src/components/SettingsForm.vue` の実装
    - `SettingsFormProps`（`currentSettings`）を受け取り、`save` イベントで `Settings` ペイロードを emit する
    - 各入力フィールドの値を `validateSettings` でリアルタイム検証し、エラーメッセージをインライン表示する
    - バリデーションエラーがある場合は保存ボタンを `disabled` にする
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [ ]* 8.7 `TimerDisplay.vue` のコンポーネントテストを書く
    - `aria-live` 領域が DOM に存在することを `@testing-library/vue` で検証する
    - _Requirements: 8.1_

  - [ ]* 8.8 `TimerControls.vue` のコンポーネントテストを書く
    - 全ボタンに `aria-label` が付与されていることを検証する
    - `notifyPhaseEnd()` で permission denied 時に Notification が呼ばれず AudioService のみ呼ばれることを検証する
    - _Requirements: 8.2, 8.4, 5.4_

  - [ ]* 8.9 `SettingsForm.vue` のコンポーネントテストを書く
    - 範囲外の値を入力したときにエラーメッセージが表示され保存ボタンが無効化されることを検証する
    - _Requirements: 3.7_

- [ ] 9. ページルーティングと App の組み立て
  - [ ] 9.1 `src/pages/TimerPage.vue` の実装
    - `PhaseIndicator`, `TimerDisplay`, `TimerControls`, `StatisticsPanel`, `NotificationToggle` を組み合わせてタイマー画面を構築する
    - `useTimerStore`, `useSettingsStore`, `useStatisticsStore` を接続する
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.5, 2.6, 5.3, 6.2_

  - [ ] 9.2 `src/pages/SettingsPage.vue` の実装
    - `SettingsForm` をラップし、`useSettingsStore.saveSettingsAction` を接続する
    - 設定保存後に `useTimerStore.applySettings` を呼んでタイマーをリセットする
    - localStorage アクセスエラー時に「設定が保存されません」バナーを 1 度だけ表示する
    - _Requirements: 3.5, 3.6, 3.7, 4.3_

  - [ ] 9.3 `src/App.vue` の実装
    - `TimerPage` と `SettingsPage` を切り替えるナビゲーションを実装する（vue-router 不使用、`ref<'timer' | 'settings'>` で切り替え）
    - `main.ts` で `createApp`, `createPinia` を組み立ててマウントする
    - _Requirements: 7.1_

- [ ] 10. Cloudflare Pages ビルド検証
  - [ ] 10.1 プロダクションビルドの確認
    - `npm run build` が成功し `dist/` を生成することを確認するスモークテストスクリプトを作成する
    - `dist/` に `index.html`, `_redirects` が存在することを検証する
    - `dist/` にインラインスクリプト（`<script>` タグ内の直接記述）が含まれないことを検証する（CSP 要件）
    - _Requirements: 7.3, 7.4, 7.5_

- [ ] 11. 最終チェックポイント — 全テストの確認
  - 全テストが通過することを確認する。問題があればユーザーに確認する。

---

## Notes

- `*` が付いたサブタスクはオプションであり、MVP 優先の場合はスキップ可能
- 各タスクは前のタスクを前提とした積み上げ式になっている
- プロパティテストは `fast-check` で最低 100 イテレーション実行する
- `localStorage` へのアクセスは全て `try/catch` でラップし、失敗時はデフォルト値にフォールバックする
- コンポーネントは `<script setup lang="ts">` + CSS Modules スタイルで統一する
- テストファイルは `src/__tests__/` 配下の対応するサブディレクトリに配置する

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "3.6", "3.8", "3.11"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.7", "3.9", "3.10", "3.12"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1", "6.2"] },
    { "id": 5, "tasks": ["6.3", "6.6"] },
    { "id": 6, "tasks": ["6.4", "6.5", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
    { "id": 7, "tasks": ["8.7", "8.8", "8.9", "9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3"] },
    { "id": 9, "tasks": ["10.1"] }
  ]
}
```
