# 要件定義書 — ポモドーロタイマー SPA

## はじめに

本ドキュメントは、Cloudflare Pages 上でホストするシングルページアプリケーション (SPA) として実装するポモドーロタイマーの要件を定義する。

ポモドーロ・テクニックは、25 分の集中作業セッション（ポモドーロ）と短い休憩 (5 分) を繰り返し、4 セッションごとに長い休憩 (15〜30 分) を取ることで生産性を向上させる時間管理手法である。

本アプリは、ブラウザのみで動作し、外部バックエンドを必要とせず、Cloudflare Pages の静的ホスティング要件を満たす。

---

## 用語集

- **App**: ポモドーロタイマー SPA 全体を指す。
- **Timer**: カウントダウン動作を制御するタイマーモジュール。
- **Session**: 1 回のポモドーロ作業セッション（デフォルト 25 分）。
- **Short_Break**: セッション後の短い休憩（デフォルト 5 分）。
- **Long_Break**: 4 セッション完了後の長い休憩（デフォルト 15 分）。
- **Cycle**: Session × 4 + Short_Break × 3 + Long_Break × 1 の一連の流れ。
- **Settings**: ユーザーが変更可能な設定値（各フェーズの時間、1 サイクルあたりのセッション数、通知など）。
- **Notification**: ブラウザの Web Notifications API を使用したデスクトップ通知。
- **Sound_Alert**: フェーズ終了時に再生する効果音。
- **Storage**: ブラウザの localStorage を使用した永続ストレージ。
- **Statistics**: 完了セッション数などのユーザー統計情報。

---

## 要件

### 要件 1: タイマーのカウントダウン

**ユーザーストーリー:** 開発者として、設定した時間をカウントダウンするタイマーを使いたい。そうすることで、作業時間を正確に把握できる。

#### 受け入れ基準

1. THE Timer SHALL 現在のフェーズの残り時間を MM:SS 形式で表示する。
2. WHEN ユーザーがスタートボタンを押したとき、THE Timer SHALL 1 秒ごとに残り時間を 1 秒デクリメントする。
3. WHEN ユーザーが一時停止ボタンを押したとき、THE Timer SHALL カウントダウンを停止し、残り時間を保持する。
4. WHEN ユーザーがリセットボタンを押したとき、THE Timer SHALL 現在のフェーズの初期時間に残り時間を戻す。
5. WHEN 残り時間が 0 になったとき、THE Timer SHALL 自動的に次のフェーズへ遷移する。
6. WHILE タイマーが動作中のとき、THE App SHALL ブラウザのタブタイトルに残り時間とフェーズ名を表示する（例: `25:00 — 作業中`）。

---

### 要件 2: フェーズ管理（セッション・休憩の自動切り替え）

**ユーザーストーリー:** 開発者として、ポモドーロのフェーズが自動で切り替わってほしい。そうすることで、次に何をすべきか意識せずに集中できる。

#### 受け入れ基準

1. WHEN Session が完了したとき、THE App SHALL 完了セッション数を 1 加算する。
2. WHEN Session が完了し、かつ完了セッション数が Settings のサイクルあたりセッション数の倍数であるとき、THE App SHALL Long_Break フェーズに遷移する。
3. WHEN Session が完了し、かつ完了セッション数が Settings のサイクルあたりセッション数の倍数でないとき、THE App SHALL Short_Break フェーズに遷移する。
4. WHEN Short_Break または Long_Break が完了したとき、THE App SHALL Session フェーズに遷移する。
5. THE App SHALL 現在のフェーズ名（「作業中」「短い休憩」「長い休憩」）をタイマー画面に表示する。
6. THE App SHALL 現在のサイクル内で何番目のセッションかを示すインジケーター（例: ドット 4 個）を表示する。

---

### 要件 3: タイマー設定のカスタマイズ

**ユーザーストーリー:** 開発者として、各フェーズの時間と休憩パターンを変更したい。そうすることで、自分の作業スタイルに合わせてタイマーを調整できる。

#### 受け入れ基準

1. THE App SHALL 設定画面で Session 時間（1〜60 分の整数）を変更できるようにする。
2. THE App SHALL 設定画面で Short_Break 時間（1〜30 分の整数）を変更できるようにする。
3. THE App SHALL 設定画面で Long_Break 時間（1〜60 分の整数）を変更できるようにする。
4. THE App SHALL 設定画面で 1 サイクルあたりのセッション数（1〜8 の整数）を変更できるようにする。
5. WHEN ユーザーが設定を保存したとき、THE App SHALL 新しい設定値を Storage に保存する。
6. WHEN ユーザーが設定を保存したとき、THE Timer SHALL 現在のフェーズをリセットして新しい時間を反映する。
7. IF ユーザーが入力値として範囲外の数値を指定したとき、THEN THE App SHALL エラーメッセージを表示し、設定の保存を拒否する。

---

### 要件 4: 設定の永続化

**ユーザーストーリー:** 開発者として、カスタマイズした設定がページを再読み込みしても保持されてほしい。そうすることで、毎回設定し直す手間を省ける。

#### 受け入れ基準

1. WHEN App が起動したとき、THE App SHALL Storage から Settings を読み込み、保存済みの値があればそれを初期値として使用する。
2. IF Storage に Settings が存在しないとき、THEN THE App SHALL デフォルト値（Session: 25 分、Short_Break: 5 分、Long_Break: 15 分、サイクルセッション数: 4）を使用する。
3. WHEN Settings が変更されたとき、THE App SHALL 変更後の Settings を JSON 形式で Storage に書き込む。
4. THE Storage SHALL Settings キーとして `pomodoro-settings` を使用する。

---

### 要件 5: フェーズ終了通知

**ユーザーストーリー:** 開発者として、フェーズが終了したときに通知を受け取りたい。そうすることで、タイマー画面を常に見ていなくても次のアクションを知ることができる。

#### 受け入れ基準

1. WHEN フェーズが終了したとき、THE App SHALL Sound_Alert を再生する。
2. WHERE Notification 許可が有効な場合、WHEN フェーズが終了したとき、THE App SHALL 次のフェーズ名を含む Notification を表示する。
3. WHEN App が初回起動したとき、THE App SHALL ブラウザの通知許可をユーザーに要求する。
4. IF ユーザーが通知を拒否したとき、THEN THE App SHALL Sound_Alert のみで通知し、再度の通知許可要求を行わない。
5. WHERE 通知機能が Settings で無効化されている場合、THE App SHALL Notification および Sound_Alert を再生しない。

---

### 要件 6: 統計の記録と表示

**ユーザーストーリー:** 開発者として、今日完了したポモドーロ数を確認したい。そうすることで、自分の作業量を把握できる。

#### 受け入れ基準

1. THE Statistics SHALL 今日の日付（ローカルタイムゾーン）における完了セッション数を記録する。
2. THE App SHALL 統計画面または統計パネルで今日の完了セッション数を表示する。
3. WHEN Session が完了したとき、THE Statistics SHALL 当日の完了セッション数を 1 加算し Storage に保存する。
4. WHEN App が起動したとき、THE App SHALL Storage から Statistics を読み込み、当日の日付が一致する場合は保存済みの値を使用する。
5. IF Storage の Statistics が前日以前の日付のとき、THEN THE App SHALL 当日のカウントを 0 にリセットする。
6. THE Storage SHALL Statistics キーとして `pomodoro-statistics` を使用する。

---

### 要件 7: Cloudflare Pages へのデプロイ適合性

**ユーザーストーリー:** 開発者として、アプリを Cloudflare Pages にデプロイしたい。そうすることで、サーバー管理不要でアプリを公開できる。

#### 受け入れ基準

1. THE App SHALL サーバーサイドレンダリングを使用せず、全てのロジックをブラウザ上で実行する。
2. THE App SHALL 外部バックエンド API に依存しない（Storage は localStorage のみ使用）。
3. THE App SHALL ビルド成果物として静的ファイル（HTML、CSS、JavaScript）のみを生成する。
4. THE App SHALL `_redirects` ファイルまたは同等の設定により、全てのルートを `index.html` にフォールバックする SPA ルーティングを設定する。
5. THE App SHALL Content Security Policy ヘッダーに適合するよう、インラインスクリプトを使用しない。

---

### 要件 8: アクセシビリティ

**ユーザーストーリー:** 開発者として、スクリーンリーダーやキーボードだけでもアプリを操作したい。そうすることで、より多くのユーザーが利用できる。

#### 受け入れ基準

1. THE App SHALL タイマーの残り時間を `aria-live` 領域で読み上げ可能な形式で提供する（フェーズ変更時に通知）。
2. THE App SHALL 全ての操作ボタン（スタート・一時停止・リセット）にキーボードフォーカスを当て、Enter または Space キーで操作できるようにする。
3. THE App SHALL WCAG 2.1 AA 基準のコントラスト比（4.5:1 以上）を通常テキストに対して確保する。
4. THE App SHALL 全ての画像・アイコンに代替テキスト（`alt` 属性または `aria-label`）を付与する。
