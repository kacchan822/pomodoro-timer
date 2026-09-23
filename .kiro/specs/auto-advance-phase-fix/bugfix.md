# Bugfix Requirements Document

## Introduction

ポモドーロタイマーでは、作業→休憩、休憩→作業のフェーズが切り替わるたびにカウントダウンが停止し、ユーザーが手動で「スタート」ボタンを押さないと次のフェーズのカウントダウンが始まらない。

既存スペック（`.kiro/specs/pomodoro-timer/requirements.md`）の要件1 受け入れ基準5「WHEN 残り時間が 0 になったとき、THE Timer SHALL 自動的に次のフェーズへ遷移する」および要件2（フェーズの自動切り替え全般）では自動遷移が規定されている。しかし実装ではフェーズ遷移後にタイマーが停止するため、仕様と食い違っており、これはバグである。

根本原因は `src/stores/timerStore.ts` の `tick()` 関数内、フェーズ終了処理の末尾で `clearTimer()` を呼び `isRunning` を `false` にしていることにある。この結果、`phase` は次フェーズへ遷移するが `setInterval` が停止され、カウントダウンが継続しない。

期待される動作（ユーザー確認済み）は、フェーズ終了通知後に次のフェーズへ自動遷移し、そのままカウントダウンも自動で開始する完全自動連続である。

## Bug Analysis

### Current Behavior (Defect)

タイマーが動作中（`isRunning === true`）に残り時間が 0 に到達し、フェーズが自動遷移した後、タイマーが停止してしまう。

1.1 WHEN タイマー動作中に残り時間が 0 になりフェーズが自動遷移したとき THEN the system は `setInterval` を停止し `isRunning` を `false` にしてカウントダウンを止める
1.2 WHEN 作業フェーズが終了して休憩フェーズへ遷移したとき THEN the system は次の休憩フェーズのカウントダウンを自動開始せず、ユーザーの手動スタートを待つ
1.3 WHEN 休憩フェーズが終了して作業フェーズへ遷移したとき THEN the system は次の作業フェーズのカウントダウンを自動開始せず、ユーザーの手動スタートを待つ

### Expected Behavior (Correct)

フェーズ終了通知後、次のフェーズへ自動遷移し、そのままカウントダウンも自動で継続する。

2.1 WHEN タイマー動作中に残り時間が 0 になりフェーズが自動遷移したとき THEN the system SHALL 動作中の `setInterval` を維持し `isRunning` を `true` のまま保つ
2.2 WHEN 作業フェーズが終了して休憩フェーズへ遷移したとき THEN the system SHALL 次の休憩フェーズのカウントダウンを自動的に継続開始する
2.3 WHEN 休憩フェーズが終了して作業フェーズへ遷移したとき THEN the system SHALL 次の作業フェーズのカウントダウンを自動的に継続開始する

### Unchanged Behavior (Regression Prevention)

以下の既存挙動は変更してはならない。

3.1 WHEN ユーザーが一時停止（pause）を行ったとき THEN the system SHALL CONTINUE TO `setInterval` を停止し残り時間を保持する
3.2 WHEN ユーザーがリセット（reset）を行ったとき THEN the system SHALL CONTINUE TO タイマーを停止し現在フェーズの設定時間で初期化する
3.3 WHEN ユーザーが設定を変更・保存（applySettings）したとき THEN the system SHALL CONTINUE TO タイマーを停止し新しい設定時間で現在フェーズを初期化する
3.4 WHEN 作業セッションが完了したとき THEN the system SHALL CONTINUE TO `completedSessions` を加算し統計（statisticsStore.incrementToday）を更新する
3.5 WHEN フェーズが遷移し通知が有効なとき THEN the system SHALL CONTINUE TO フェーズ終了通知（Sound_Alert / Notification）を発火する
3.6 WHEN 作業・短い休憩・長い休憩の次フェーズを計算するとき THEN the system SHALL CONTINUE TO `getNextPhase` によるサイクルロジックで正しい次フェーズを決定する

## Bug Condition and Property Specification

### Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type TimerState  // { isRunning, secondsRemaining, phase }
  OUTPUT: boolean

  // タイマー動作中に残り時間が 0 に到達しフェーズ遷移が起きる入力
  RETURN X.isRunning = true AND X.secondsRemaining = 0
END FUNCTION
```

### Property: Fix Checking

```pascal
// フェーズ遷移後もカウントダウンが自動継続すること
FOR ALL X WHERE isBugCondition(X) DO
  stateAfter ← tick'(X)
  ASSERT stateAfter.isRunning = true
     AND stateAfter.phase = getNextPhase(X.phase, ...)
     AND stateAfter.secondsRemaining = secondsForPhase(stateAfter.phase)
     AND intervalStillActive(stateAfter)
END FOR
```

### Property: Preservation Checking

```pascal
// バグ条件に該当しない入力（一時停止・リセット・設定変更・カウントダウン中など）は
// 修正後も元の実装と同一の挙動を維持すること
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT tick(X) = tick'(X)
END FOR
```

**Key Definitions:**
- **F (tick)**: 修正前の `tick()` 関数
- **F' (tick')**: 修正後の `tick()` 関数（フェーズ遷移後も `clearTimer()`/`isRunning=false` を実行しない）
