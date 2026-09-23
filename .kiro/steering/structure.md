# プロジェクト構成

```
pomodoro-timer/
├── src/
│   ├── lib/                    # 純粋関数（副作用なし・Vue/Pinia 依存なし）
│   │   ├── timer.ts            # getNextPhase, formatTime, formatTitle, getIndicatorStates
│   │   ├── validation.ts       # validateSettings
│   │   ├── storage.ts          # Settings・Statistics のシリアライズ／デシリアライズ
│   │   └── date.ts             # isSameDay, getTodayString
│   ├── stores/                 # Pinia Setup Store
│   │   ├── timerStore.ts       # useTimerStore — phase, secondsRemaining, isRunning, アクション群
│   │   ├── settingsStore.ts    # useSettingsStore — Settings の読み込み・保存
│   │   └── statisticsStore.ts  # useStatisticsStore — 当日の完了セッション数
│   ├── components/             # Vue SFC
│   │   ├── TimerDisplay.vue    # フェーズ名 + MM:SS 表示、aria-live 領域
│   │   ├── TimerControls.vue   # 開始・一時停止・リセットボタン
│   │   ├── PhaseIndicator.vue  # サイクル進捗ドットインジケーター
│   │   ├── SettingsForm.vue    # 設定編集フォーム（インラインバリデーション付き）
│   │   └── StatisticsPanel.vue # 当日の完了セッション数表示（読み取り専用）
│   ├── __tests__/
│   │   ├── lib/                # 純粋関数の PBT テスト（*.property.test.ts）
│   │   ├── stores/             # Pinia Store のユニットテスト（*.unit.test.ts）
│   │   └── components/         # コンポーネントテスト（*.test.ts）
│   └── App.vue                 # ルートコンポーネント — TimerPage / SettingsPage を切り替え
├── .kiro/
│   ├── steering/               # AI アシスタント向けステアリングルール（このファイルが置かれる場所）
│   └── specs/pomodoro-timer/   # 仕様駆動開発ドキュメント: requirements.md, design.md, tasks.md
├── dist/                       # 本番ビルド出力（git 管理対象外）
├── Dockerfile
├── docker-compose.yml
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## アーキテクチャの規約

- **`src/lib/`** — 純粋関数のみ。Vue のリアクティビティ・Pinia・副作用を含まない。タイマー計算・バリデーション・シリアライズ・日付ヘルパーなど全ビジネスロジックをここに集約し、単独でテスト可能にする。
- **`src/stores/`** — Pinia **Setup Store** スタイル（`defineStore` 内で `ref`・`computed`・関数を使用）。lib 関数と副作用サービス（Audio・Notifications・Storage）を組み合わせて状態を管理する。
- **`src/components/`** — Vue 3 `<script setup lang="ts">`。props は `defineProps<T>()`、emits は `defineEmits<T>()` で型付け。コンポーネントはできる限りプレゼンテーション層に留め、ロジックはストアのアクションに委譲する。
- **データフロー**: UI → ストアのアクション → lib の純粋関数 → 状態更新 → Vue リアクティビティ → UI 再レンダリング。副作用（音声・通知・localStorage）はストアのアクションから呼び出し、コンポーネントからは呼び出さない。

## 命名規則

- コンポーネント: PascalCase の `.vue` ファイル
- ストア: `use` プレフィックスの camelCase（`useTimerStore`）
- 純粋関数: camelCase（`formatTime`、`getNextPhase`）
- 型・インターフェース: PascalCase（`Phase`、`Settings`、`TimerState`）
- テストファイル: PBT は `*.property.test.ts`、ユニットテストは `*.unit.test.ts`、コンポーネントテストは `*.test.ts`

## テストの規約

- PBT テストは **fast-check** を使用し、最低 100 イテレーション実行（`{ numRuns: 100 }`）
- 各 PBT テストにはコメントタグを付与: `// Feature: pomodoro-timer, Property {N}: {説明}`
- Pinia ストアのテストでは `beforeEach` 内で `setActivePinia(createPinia())` を呼び出す
- コンポーネントテストではアクセシビリティ属性（`aria-live`・`aria-label`・`role`）の存在を確認する
