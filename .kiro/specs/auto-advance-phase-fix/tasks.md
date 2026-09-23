# Implementation Plan

## Overview

このプランは「フェーズ遷移後にカウントダウンが自動継続しない」バグを、bug condition メソドロジー（探索 → 保持 → 実装 → 検証）に沿って修正する。まず修正前にバグ条件の探索テスト（Property 1）と非バグ入力の Preservation テスト（Property 2）を書き、次に `src/stores/timerStore.ts` の `tick()` から不要なインターバル破棄を削除して修正し、最後に既存テスト更新・統合テスト・チェックポイントで検証する。

- **Bug Condition C(X)**: `X.isRunning === true AND X.secondsRemaining === 0`
- **Expected Behavior P(result)**: 遷移後も `isRunning === true` を維持し、カウントダウンが自動継続する
- **Preservation ¬C(X)**: 非バグ入力（`secondsRemaining > 0` や pause / reset / applySettings）の挙動は不変

## Tasks

- [x] 1. バグ条件の探索テストを書く（修正前）
  - **Property 1: Bug Condition** - フェーズ遷移後のカウントダウン自動継続
  - **CRITICAL**: このテストは未修正コードで必ず FAIL する。失敗こそがバグの存在を証明する
  - **DO NOT attempt to fix the test or the code when it fails** — この段階では観測のみ
  - **NOTE**: このテストは期待挙動（Expected Behavior）をエンコードする。修正後に PASS することでフィックスを検証する
  - **GOAL**: バグを実証するカウンターイグザンプルを surface し、根本原因（`tick()` 末尾の `clearTimer()` / `isRunning=false`）を確定または反証する
  - **Scoped PBT Approach**: 確定的なバグのため、プロパティを具体的な失敗ケースにスコープする（`isRunning=true` かつ `secondsRemaining=0` で session/shortBreak/longBreak の各遷移、合法な Settings をランダム生成）
  - Bug Condition: `isBugCondition(X) = X.isRunning === true AND X.secondsRemaining === 0`（design の Bug Condition より）
  - テスト対象: `useTimerStore().tick()` を `isRunning=true` かつ `secondsRemaining=0` で発火させ、遷移後の状態を観測する
  - アサーション（Expected Behavior / Property 1 に一致）: 遷移後も `isRunning === true` を維持、`phase === getNextPhase(...)`、`secondsRemaining === getSecondsForPhase(nextPhase)`、fake timer を 1000ms 進めるとカウントダウンが継続する（インターバルが生存）
  - Vitest + fake timers、独立した Pinia インスタンス、`notifyPhaseEnd` モックの既存パターンを踏襲する
  - テストケース: (1) session→shortBreak 継続、(2) shortBreak→session 継続、(3) サイクル完了→longBreak 継続、(4) タイムアップ後 1000ms 前進で `secondsRemaining` がデクリメントされる（インターバル生存の観測）
  - 未修正コードで実行する
  - **EXPECTED OUTCOME**: テストは FAIL する（これが正しい — バグの存在を証明する）
  - 発見したカウンターイグザンプルを記録して根本原因を理解する（例: 「session タイムアップ後 `isRunning===false` になり、1000ms 前進しても `secondsRemaining` が不変」）
  - 代替仮説（start ガード / secondsRemaining 再セット漏れ）がこのテストで反証されることを確認する
  - テストを書き、実行し、失敗を記録した時点でタスク完了とする
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Preservation プロパティテストを書く（修正前）
  - **Property 2: Preservation** - 非バグ入力の挙動維持
  - **IMPORTANT**: observation-first メソドロジーに従う
  - 非バグ入力（`isBugCondition(X)` が false）で未修正コードの挙動を観測してから、その挙動をプロパティとして固定する
  - Observe: `secondsRemaining > 0` で `tick()` を呼ぶと `secondsRemaining` が 1 減るのみで phase / isRunning / completedSessions は不変
  - Observe: 動作中に `pause()` すると `isRunning=false`、残り時間は保持される
  - Observe: `reset()` 後は `secondsRemaining = getSecondsForPhase(phase)`、`isRunning=false`
  - Observe: `applySettings(s)` 後は停止し、新設定時間で現フェーズが初期化される
  - Observe: セッション完了時に `completedSessions` 加算・`statisticsStore.incrementToday()`・`notifyPhaseEnd` 発火が起きる
  - fast-check で property-based test を書く（Preservation Requirements より）:
    - 合法な Settings とフェーズ、`secondsRemaining > 0` の乱数を生成し、`tick()` 後に `secondsRemaining` が 1 減るのみで phase / isRunning / completedSessions が不変であること
    - pause / reset / applySettings が未修正コードと同一結果になること
  - property-based testing は入力ドメイン全体を自動生成し、非バグ入力すべてで挙動不変を強く保証する
  - 未修正コードで実行する
  - **EXPECTED OUTCOME**: テストは PASS する（保持すべきベースライン挙動を確定する）
  - テストを書き、実行し、未修正コードで PASS することを確認した時点でタスク完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. フェーズ遷移後にカウントダウンが停止するバグの修正

  - [x] 3.1 tick() から不要なインターバル破棄を削除する
    - `src/stores/timerStore.ts` の `tick()` フェーズ終了処理末尾にある `clearTimer();` 呼び出しを削除する
    - 同じく `isRunning.value = false;` を削除し、遷移後も `true` のまま保つ
    - コメント「自動遷移後はインターバルを停止し、ユーザーの操作を待つ」を、自動継続の意図を説明する内容へ更新する
    - 関数ドキュメントコメントの手順 6（「インターバルを停止する」）を「動作中のインターバルを維持しカウントダウンを自動継続する」へ修正する
    - 非変更範囲を維持する: デクリメント経路（`secondsRemaining > 0`）、`completedSessions` 加算、`statisticsStore.incrementToday()`、`getNextPhase` 呼び出し、`notifyPhaseEnd` 呼び出し、`secondsRemaining` の再セット
    - _Bug_Condition: isBugCondition(X) where X.isRunning === true AND X.secondsRemaining === 0（design より）_
    - _Expected_Behavior: tick'(X) は isRunning=true 維持・phase=getNextPhase(...)・secondsRemaining=getSecondsForPhase(nextPhase)・intervalActive（design の Fix Checking pseudocode）_
    - _Preservation: design の Preservation Requirements（非バグ入力すべてで tick == tick'）_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 バグ条件の探索テストが PASS することを確認する
    - **Property 1: Expected Behavior** - フェーズ遷移後のカウントダウン自動継続
    - **IMPORTANT**: タスク 1 で書いた同じテストを再実行する。新しいテストは書かない
    - タスク 1 のテストは期待挙動をエンコードしている。PASS することで期待挙動が満たされたことを確認する
    - タスク 1 のバグ条件探索テストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（バグが修正されたことを確認）
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Preservation テストが引き続き PASS することを確認する
    - **Property 2: Preservation** - 非バグ入力の挙動維持
    - **IMPORTANT**: タスク 2 で書いた同じテストを再実行する。新しいテストは書かない
    - タスク 2 の preservation プロパティテストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（リグレッションがないことを確認）
    - 修正後もすべてのテストが PASS することを確認する
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. 既存テストを新仕様（自動継続）へ更新する
  - `src/__tests__/stores/timerStore.unit.test.ts` の旧挙動固定アサーションを更新する
  - `tick() — タイムアップ時` の 3 箇所（session→shortBreak、サイクル完了→longBreak、shortBreak→session）の `expect(store.isRunning).toBe(false)` を `toBe(true)` へ更新する
  - 「タイムアップ後は isRunning が false になり、ユーザー操作を待つ（要件 1.5）」というテストを、「タイムアップ後も isRunning が true のまま自動継続する」旨のテストへ意味ごと置き換える
  - `reset()` の「shortBreak フェーズで reset()...」テストは遷移後 `isRunning` が true になる点に注意（reset がその後停止するため最終アサーションは不変で通る想定）を確認する
  - 影響を受けないテストは変更しない: `start()` / `pause()` / `reset()` / `applySettings()`、副作用検証（completedSessions 加算・統計更新・通知）、`timerStore.property.test.ts` の reset プロパティテスト
  - 更新後、テストスイート全体を実行して PASS を確認する
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. 統合テストを追加する
  - fake timer で完全自動連続フローを検証する: start → session タイムアップ → shortBreak 自動継続 → shortBreak タイムアップ → session 自動継続（途中で手動スタートを介さない）
  - サイクル遷移を検証する: `sessionsPerCycle` 回のセッションを跨いで longBreak を含むサイクルが自動連続する
  - 手動操作との共存を検証する: 自動継続中に pause / reset が正しく停止・初期化し、その後 start で再開できる
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 6. チェックポイント — すべてのテストが PASS することを確認する
  - テストスイート全体（`vitest --run`）とビルド／型チェックを実行し、すべて PASS することを確認する
  - Property 1（Fix Checking）と Property 2（Preservation）の両方が PASS することを確認する
  - 疑問が生じた場合はユーザーに確認する

## Task Dependency Graph

```
1. Bug Condition 探索テスト (Property 1, 修正前 → FAIL 期待)
        │
2. Preservation テスト (Property 2, 修正前 → PASS 期待)
        │
        ▼
3. 修正
  3.1 tick() の 2 行削除 + コメント/ドキュメント更新
        │
        ├──► 3.2 探索テスト再実行 (Property 1 → PASS 期待)
        │
        └──► 3.3 Preservation テスト再実行 (Property 2 → PASS 期待)
        │
        ▼
4. 既存テスト更新 (旧挙動アサーションを新仕様へ)
        │
        ▼
5. 統合テスト追加 (自動連続フロー / サイクル / 手動操作共存)
        │
        ▼
6. チェックポイント (全テスト + ビルド PASS)
```

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "dependsOn": [],
      "description": "修正前に探索テスト (Property 1) と Preservation テスト (Property 2) を書く。互いに独立で並行可能。"
    },
    {
      "wave": 2,
      "tasks": ["3.1"],
      "dependsOn": ["1", "2"],
      "description": "tick() から不要なインターバル破棄を削除して修正する。"
    },
    {
      "wave": 3,
      "tasks": ["3.2", "3.3"],
      "dependsOn": ["3.1"],
      "description": "タスク 1・2 の同一テストを再実行し、修正後の Fix Checking と Preservation を確認する。"
    },
    {
      "wave": 4,
      "tasks": ["4"],
      "dependsOn": ["3.1"],
      "description": "修正により失敗する旧挙動アサーションを新仕様へ更新する。"
    },
    {
      "wave": 5,
      "tasks": ["5"],
      "dependsOn": ["3.2", "3.3", "4"],
      "description": "自動連続フロー / サイクル / 手動操作共存の統合テストを追加する。"
    },
    {
      "wave": 6,
      "tasks": ["6"],
      "dependsOn": ["5"],
      "description": "全テストとビルド／型チェックの最終検証。"
    }
  ]
}
```

**依存関係の要点:**
- タスク 1・2 はタスク 3 の前に完了する必要がある（探索・preservation テストは修正前に書く）。両者は互いに独立で並行可能。
- タスク 3.1（修正）はタスク 1・2 の完了後に着手する。
- タスク 3.2・3.3 はタスク 3.1 に依存し、タスク 1・2 で書いた同一テストを再実行する。
- タスク 4（既存テスト更新）は修正（3.1）後、旧挙動アサーションが失敗するため必要になる。
- タスク 5（統合テスト）はタスク 3・4 の後に実施する。
- タスク 6 は全タスク完了後の最終検証。

## Notes

- **探索テスト（Property 1）は未修正コードで必ず FAIL する** — 失敗こそがバグの存在を証明する。この段階でテストやコードを修正しないこと。
- **Preservation テスト（Property 2）は未修正コードで PASS する** — 保持すべきベースライン挙動を確定するため。
- タスク 3.2・3.3 は新しいテストを書かず、タスク 1・2 の同一テストを再実行する。
- 修正は `src/stores/timerStore.ts` の `tick()` 末尾にある `clearTimer();` と `isRunning.value = false;` の削除が中心。デクリメント経路・`completedSessions` 加算・統計更新・通知・`secondsRemaining` 再セットなどの非変更範囲は維持する。
- テストは Vitest + fake timers、独立した Pinia インスタンス、`notifyPhaseEnd` モックの既存パターンを踏襲する。property-based test は fast-check を使用する。
- 疑問が生じた場合はユーザーに確認する。
