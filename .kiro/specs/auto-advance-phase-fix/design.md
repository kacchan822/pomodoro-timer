# Auto-Advance Phase Fix Bugfix Design

## Overview

ポモドーロタイマーは、作業→休憩・休憩→作業のフェーズ切り替えのたびにカウントダウンが停止し、ユーザーが手動で「スタート」を押さないと次フェーズのカウントダウンが始まらない。これは既存スペック（要件 1.5 / 要件 2）が規定する「残り時間が 0 になったら自動的に次フェーズへ遷移し、そのまま継続する」という完全自動連続の仕様に反する。

根本原因は `src/stores/timerStore.ts` の `tick()` 関数末尾で、フェーズ遷移処理の後に `clearTimer()` を呼んで `setInterval` を破棄し、`isRunning` を `false` にしていることにある。`phase` と `secondsRemaining` は次フェーズ用に更新されるが、動作中のインターバルが停止されるためカウントダウンが継続しない。

修正方針は最小限で、`tick()` のフェーズ終了処理から `clearTimer()` と `isRunning.value = false` の 2 行を削除するだけである。これにより `start()` で開始された `setInterval` はそのまま生き続け、次フェーズのカウントダウンが 1 秒後の次ティックから自動継続する。デクリメント経路（`secondsRemaining > 0`）と、他のアクション（`pause` / `reset` / `applySettings`）は一切変更しない。

## Glossary

- **Bug_Condition (C)**: バグを引き起こす条件。タイマー動作中（`isRunning === true`）に残り時間が 0 に到達した状態（`secondsRemaining === 0`）で `tick()` が呼ばれ、フェーズ遷移が発生するケース。
- **Property (P)**: バグ条件に該当する入力での望ましい挙動。フェーズ遷移後も動作中のインターバルを維持し `isRunning` を `true` のまま保ち、次フェーズのカウントダウンが自動継続すること。
- **Preservation**: バグ条件に該当しない入力（カウントダウン中、pause / reset / applySettings など）で変更してはならない既存挙動。
- **tick (F)**: 修正前の `tick()` 関数。フェーズ遷移後に `clearTimer()` / `isRunning=false` を実行する。
- **tick' (F')**: 修正後の `tick()` 関数。フェーズ遷移後に `clearTimer()` / `isRunning=false` を実行しない。
- **TimerState**: `tick` の観測対象となるストア状態。`{ isRunning, secondsRemaining, phase, completedSessions }` と、内部管理される `intervalId`。
- **getNextPhase**: `src/lib/timer.ts` の純粋関数。現フェーズ・完了セッション数・サイクル長から次フェーズを決定する（この修正では変更しない）。
- **intervalActive**: `setInterval` が破棄されずに生存しており、以後 1 秒ごとに `tick` が発火し続ける内部状態。

## Bug Details

### Bug Condition

このバグは、タイマーが動作中（`isRunning === true`）に残り時間が 0 に到達したとき（`secondsRemaining === 0`）に `tick()` が実行され、フェーズ遷移が起きる場面で顕在化する。`tick()` はフェーズ遷移・統計更新・通知を正しく行うが、末尾で `clearTimer()` を呼びインターバルを破棄し `isRunning` を `false` にするため、次フェーズのカウントダウンが継続しない。

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type TimerState  // { isRunning, secondsRemaining, phase }
  OUTPUT: boolean

  // タイマー動作中に残り時間が 0 へ到達しフェーズ遷移が発生する入力
  RETURN X.isRunning = true AND X.secondsRemaining = 0
END FUNCTION
```

### Examples

- **作業→短い休憩**: `phase = 'session'`, `isRunning = true`, `secondsRemaining = 0`。期待: `phase = 'shortBreak'`, `isRunning = true` のまま、`shortBreakMinutes * 60` からカウントダウン継続。実際: `isRunning = false` となりインターバル停止、ユーザーの手動スタート待ち。
- **サイクル完了で長い休憩**: `phase = 'session'`, `completedSessions + 1` が `sessionsPerCycle` の倍数, `secondsRemaining = 0`。期待: `phase = 'longBreak'`, `isRunning = true` で継続。実際: 停止。
- **休憩→作業**: `phase = 'shortBreak'`, `isRunning = true`, `secondsRemaining = 0`。期待: `phase = 'session'`, `isRunning = true` で継続。実際: 停止。
- **エッジケース（カウントダウン中）**: `isRunning = true`, `secondsRemaining = 5`。バグ条件に該当しない。期待/実際ともに `secondsRemaining = 4` へデクリメントのみ（変更なし）。

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- **カウントダウン中のデクリメント**: `secondsRemaining > 0` のとき `tick()` は 1 秒デクリメントのみを行い、フェーズ・isRunning・completedSessions を変えない。
- **pause()**: `setInterval` を停止し `isRunning = false`、残り時間を保持する。
- **reset()**: タイマーを停止し `isRunning = false`、現在フェーズの設定時間で `secondsRemaining` を初期化する。
- **applySettings()**: タイマーを停止し `isRunning = false`、新しい設定時間で現在フェーズを初期化する。
- **セッション完了時の副作用**: `phase === 'session'` の完了時に `completedSessions` を加算し `statisticsStore.incrementToday()` を呼ぶ。
- **フェーズ終了通知**: 通知が有効なとき `notifyPhaseEnd(nextPhase)` を発火する。無効なら呼ばない。
- **次フェーズ計算**: `getNextPhase` によるサイクルロジック（shortBreak / longBreak / session の決定）は不変。
- **secondsRemaining のリセット値**: 遷移後の `secondsRemaining` は `getSecondsForPhase(nextPhase)` と一致する。

**Scope:**
バグ条件（`isRunning = true AND secondsRemaining = 0`）に該当しない全入力は、この修正の影響を受けてはならない。これには以下が含まれる:
- カウントダウン中の tick（`secondsRemaining > 0`）
- pause / reset / applySettings 経由の状態遷移
- 停止状態（`isRunning = false`）での操作

**Note:** バグ条件に該当する入力での正しい挙動は Correctness Properties セクションの Property 1 に定義する。本セクションは変更してはならない挙動に焦点を当てる。

## Hypothesized Root Cause

バグ記述とコード確認から、原因は 1 点に特定できる。

1. **フェーズ遷移後の不要なインターバル破棄（確定的な主原因）**: `tick()` のフェーズ終了処理末尾にある以下の 2 行が原因。
   ```
   // 自動遷移後はインターバルを停止し、ユーザーの操作を待つ
   clearTimer();
   isRunning.value = false;
   ```
   フェーズと残り時間は次フェーズ用に更新済みだが、`clearTimer()` が `setInterval` を破棄し `isRunning` を `false` にするため、以後 tick が発火せずカウントダウンが継続しない。この挙動は旧仕様（手動再スタート待ち）に基づく実装であり、現仕様（自動連続）と矛盾する。

2. **代替仮説（可能性低）**: `start()` の再入不可ガード（`if (isRunning.value) return;`）が原因という線も考え得るが、`start()` は遷移経路で呼ばれないため無関係。念のため探索テストで反証する。

3. **代替仮説（可能性低）**: `secondsRemaining` の再セット漏れ。コード上 `getSecondsForPhase(nextPhase)` で正しく再セットされており該当しない。探索テストで確認する。

主原因（1）が正しいことを前提に修正を計画し、探索テストで確定させる。

## Correctness Properties

Property 1: Bug Condition - フェーズ遷移後のカウントダウン自動継続

_For any_ 入力 X でバグ条件が成立する場合（`isBugCondition(X)` が true、すなわち `isRunning = true` かつ `secondsRemaining = 0`）、修正後の `tick'` は次フェーズへ遷移したうえで `isRunning = true` を維持し、動作中のインターバルを破棄せず、`secondsRemaining` を次フェーズの設定時間（`getSecondsForPhase(getNextPhase(...))`）に設定し、以後 1 秒ごとのティックでカウントダウンを自動継続する。

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - 非バグ入力の挙動維持

_For any_ 入力 X でバグ条件が成立しない場合（`isBugCondition(X)` が false）、修正後の `tick'` は修正前の `tick` と同一の結果を生成し、カウントダウン中のデクリメント挙動、pause / reset / applySettings、セッション完了時の統計更新、フェーズ終了通知、次フェーズ計算をすべて保持する。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

根本原因分析（主原因 1）が正しいと仮定した最小変更。

**File**: `src/stores/timerStore.ts`

**Function**: `tick()`

**Specific Changes**:
1. **インターバル破棄の削除**: フェーズ終了処理末尾の `clearTimer();` 呼び出しを削除する。`start()` で生成された `setInterval` を破棄せず維持することで、次フェーズのカウントダウンが次ティックから自動継続する。

2. **isRunning 維持**: `isRunning.value = false;` を削除する。フェーズ遷移後も `true` のまま保つ。

3. **コメント更新**: 「自動遷移後はインターバルを停止し、ユーザーの操作を待つ」というコメントを、自動継続の意図を説明する内容へ更新する。あわせて関数ドキュメントコメントの手順 6（「インターバルを停止する」）を「動作中のインターバルを維持しカウントダウンを自動継続する」へ修正する。

4. **非変更範囲の明示**: デクリメント経路（`if (secondsRemaining.value > 0) { ... return; }`）、`completedSessions` 加算、`statisticsStore.incrementToday()`、`getNextPhase` 呼び出し、`notifyPhaseEnd` 呼び出し、`secondsRemaining` の再セットは一切変更しない。

修正後の `tick()` フェーズ終了処理は、`completedSessions`/統計更新 → `getNextPhase` → 通知 → `phase`/`secondsRemaining` 更新までを行い、末尾でインターバルを破棄せず終了する（`return` のみ、または関数末尾）。

## Testing Strategy

### Validation Approach

テストは二段階で進める。まず未修正コードでバグを再現する探索テスト（反例）でカウンターイグザンプルを surface し根本原因を確定させる。次に修正後、バグ条件入力での正しさ（Fix Checking / Property 1）と非バグ入力での挙動維持（Preservation Checking / Property 2）を検証する。テストは Vitest + fake timers、Pinia の独立インスタンス、`notifyPhaseEnd` のモックという既存パターンを踏襲する。

### Exploratory Bug Condition Checking

**Goal**: 修正実装前に、バグを実証するカウンターイグザンプルを surface し、根本原因分析（主原因 1: 遷移後の `clearTimer()`/`isRunning=false`）を確認または反証する。反証された場合は再仮説を立てる。

**Test Plan**: 未修正の `tick()` に対し、`isRunning = true` かつ `secondsRemaining = 0` の状態で（`start()` 後に `secondsRemaining` を 0 にして 1 ティック進める、または `tick()` を直接呼ぶ）フェーズ遷移を起こし、遷移後に `isRunning` が期待に反して `false` になること、fake timer を 1000ms 進めても `secondsRemaining` がデクリメントされない（インターバルが破棄されている）ことを観測する。

**Test Cases**:
1. **作業→短い休憩の継続失敗**: session でタイムアップ後、`phase = 'shortBreak'` になるが `isRunning = false` になる（未修正コードで失敗＝バグ再現）。
2. **休憩→作業の継続失敗**: shortBreak でタイムアップ後、`phase = 'session'` になるが `isRunning = false` になる（未修正コードで失敗）。
3. **サイクル完了→長い休憩の継続失敗**: `completedSessions + 1` が `sessionsPerCycle` の倍数のときタイムアップし、`phase = 'longBreak'` になるが `isRunning = false` になる（未修正コードで失敗）。
4. **インターバル破棄の観測（エッジ）**: タイムアップ後に fake timer を 1000ms 進めても `secondsRemaining` が減らない＝インターバルが生きていない（未修正コードで失敗）。

**Expected Counterexamples**:
- 遷移後に `isRunning === false`、かつタイマー前進で `secondsRemaining` が不変。
- 想定原因: `tick()` 末尾の `clearTimer()` と `isRunning.value = false`。他の代替仮説（start ガード、secondsRemaining 再セット漏れ）はこれらのテストで反証される見込み。

### Fix Checking

**Goal**: バグ条件が成立する全入力について、修正後の関数が期待挙動（Property 1）を満たすことを検証する。

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  stateAfter := tick'(X)
  ASSERT stateAfter.isRunning = true
     AND stateAfter.phase = getNextPhase(X.phase, X.completedSessions', sessionsPerCycle)
     AND stateAfter.secondsRemaining = getSecondsForPhase(stateAfter.phase)
     AND intervalActive(stateAfter)   // 1000ms 進めるとカウントダウンが継続する
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しない全入力について、修正後の関数が修正前と同一の結果を生成することを検証する。

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT tick(X) = tick'(X)
END FOR
```

**Testing Approach**: Preservation Checking にはプロパティベーステスト（fast-check）を推奨する。
- 入力ドメイン全体を自動的に多数生成できる
- 手動ユニットテストが見落としがちなエッジケースを捕捉できる
- 非バグ入力すべてで挙動が不変であることを強く保証できる

修正は `tick()` からの 2 行削除に限定されるため、`secondsRemaining > 0` の経路は行レベルで不変である。プロパティテストではこの経路を中心に、pause / reset / applySettings の不変性も確認する。

**Test Plan**: 未修正コードで pause / reset / applySettings / カウントダウン中の挙動を観測し、その挙動をプロパティテストとして固定する。修正後も同一結果になることを確認する。

**Test Cases**:
1. **カウントダウン中デクリメントの保持**: 任意の `secondsRemaining > 0`（`isRunning` 任意）で `tick()` は 1 デクリメントのみ、phase / isRunning / completedSessions 不変。
2. **pause 保持**: 動作中に pause すると `isRunning = false`・残り時間保持を維持（未修正コードと同一）。
3. **reset 保持**: 任意フェーズ・任意設定で reset 後 `secondsRemaining = getSecondsForPhase(phase)`・`isRunning = false`（既存 property テストを維持）。
4. **applySettings 保持**: 保存後に停止し新設定時間で現フェーズ初期化。
5. **副作用保持**: セッション完了時の `completedSessions` 加算・統計更新・通知発火が修正前と同一。

### Unit Tests

- **バグ条件（Fix Checking）**: session/shortBreak/longBreak の各遷移で、タイムアップ後に `isRunning === true` を維持し、fake timer 前進で次フェーズのカウントダウンが継続することを検証する新規テスト。
- **既存副作用の継続**: 遷移時の `completedSessions` 加算、`statisticsStore.todayCount` 加算、`notifyPhaseEnd` 呼び出し（有効時）と非呼び出し（無効時）を検証する既存テストを維持する。
- **エッジ**: サイクル完了時の longBreak 遷移でも継続すること。

### Property-Based Tests

- **Property 1（Fix Checking）**: 合法な Settings とフェーズをランダム生成し、`isRunning = true` かつ `secondsRemaining = 0` から tick したとき、`isRunning = true` 維持・`phase = getNextPhase(...)`・`secondsRemaining = getSecondsForPhase(nextPhase)`・1000ms 前進で継続、を検証する。
- **Property 2（Preservation）**: 合法な Settings とフェーズ、`secondsRemaining > 0` の乱数をランダム生成し、tick 後に `secondsRemaining` が 1 減るのみで phase / isRunning / completedSessions が不変であることを検証する。既存の「reset 後 secondsRemaining = 設定値」プロパティテストも維持する。

### Integration Tests

- **完全自動連続フロー**: start → session タイムアップ → shortBreak 自動継続 → shortBreak タイムアップ → session 自動継続、を fake timer で通し、途中で手動スタートを介さず継続することを検証する。
- **サイクル遷移**: `sessionsPerCycle` 回のセッションを跨いで longBreak を含むサイクルが自動連続することを検証する。
- **手動操作との共存**: 自動継続中に pause / reset が正しく停止・初期化し、その後 start で再開できることを検証する。

## Impact on Existing Tests

修正により「タイムアップ後に `isRunning` が `false` になる」という**旧挙動を固定していた既存ユニットテストは失敗するため、更新が必要**である。これらは旧仕様に基づくアサーションであり、新仕様（自動継続）に合わせて修正する。

**File**: `src/__tests__/stores/timerStore.unit.test.ts`

更新が必要なアサーション:
- `tick() — タイムアップ時` の各テストにある `expect(store.isRunning).toBe(false)`（session→shortBreak、サイクル完了→longBreak、shortBreak→session の 3 箇所）を `true` へ更新する。
- 「タイムアップ後は isRunning が false になり、ユーザー操作を待つ（要件 1.5）」というテストは、新仕様と矛盾するため「タイムアップ後も isRunning が true のまま自動継続する」旨のテストへ意味ごと置き換える。
- `reset()` の `shortBreak フェーズで reset()...` テストは `store.secondsRemaining = 0; store.tick();` で遷移させたあと reset するため、遷移後に `isRunning` が true になる点に注意（reset がその後停止するので最終アサーションは不変）。既存の reset アサーションはそのまま通る想定。

影響を受けない既存テスト（変更不要）:
- `start()` / `pause()` / `reset()` / `applySettings()` の各テスト（バグ条件外のため挙動不変）。
- `completedSessions` 加算・統計更新・通知の呼び出し検証（副作用は不変）。
- `timerStore.property.test.ts` の reset プロパティテスト（reset 経路は不変）。

新規追加テスト:
- 上記 Unit Tests / Property-Based Tests / Integration Tests に挙げた Fix Checking と自動連続フローの検証。
