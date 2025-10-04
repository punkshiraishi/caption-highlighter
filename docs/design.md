# キャプション・ハイライター 技術設計書 (v0.1)

## 1. アーキテクチャ概要
- **構成**: Manifest V3 Chrome 拡張。コンテンツスクリプトで Google Meet の字幕 DOM を監視し、バックグラウンド Service Worker とメッセージング。オプションページは Vue 3 + TypeScript + Vite、UI コンポーネントは Storybook で検証。
- **主要モジュール**:
  - `content-script`: 字幕監視、ハイライト描画、ポップアップ制御。
  - `background`: 拡張全体の設定・辞書データの永続化、将来の API 連携ポイント。
  - `options-ui`: 辞書管理、マッチング設定、テーマ設定を提供する Vue アプリ。
  - `shared`: 辞書モデル、設定モデル、マッチングロジック、ストレージアダプター等の共通ユーティリティ。
- **データフロー**: オプション UI が辞書や設定を更新→バックグラウンドが `chrome.storage.local` に保存→コンテンツスクリプトは storage change イベントまたはメッセージで最新データを取得→字幕解析時に辞書を用いてハイライト・ポップアップを描画。

## 2. 実行時コンポーネント
- **コンテンツスクリプト** (`content-script/main.ts`)
  - `MeetCaptionObserver`: MutationObserver で Google Meet の字幕コンテナを検知し、発話単位の DOM ノードをストリームとして送出。
  - `Highlighter`: 字幕ノードに対し辞書エントリにマッチするテキスト範囲を検出し、カスタム span (`caption-highlighter__match`) に置換。
  - `TooltipController`: ハイライトされた要素へ hover/focus した際にポップアップを body 直下へ描画。位置補正ロジックを内包。
  - `CaptionPipeline`: 上記モジュールをオーケストレーションし、辞書・設定更新に応じて動的に再コンパイルしたマッチャーを利用。
- **バックグラウンド Service Worker** (`background/main.ts`)
  - `StorageService`: `chrome.storage.local` を抽象化。辞書・設定の保存/取得、キャッシュ刷新のブロードキャスト。
  - `MessageRouter`: オプション UI／コンテンツスクリプトからの要求（辞書取得、設定取得、CSV 解析）を受け取り処理。
  - 将来のサブスク API 呼び出しのため、`SubscriptionClient` のインターフェイスをプレースホルダとして定義。
- **オプションページ** (`options/main.ts`)
  - Vue 3 アプリ。Pinia ストアで辞書・設定を管理。
  - コンポーネント構成: `DictionaryTable`, `ImportDialog`, `MatchingSettingsForm`, `ThemeSettingsForm`, `StorageActions`。
  - `CsvImporter` ユーティリティで CSV ファイルの列解析とプレビュー。

## 3. データモデル
- `DictionaryEntry`
  ```ts
  type DictionaryEntry = {
    id: string;          // uuid
    term: string;        // ハイライト対象の語句
    definition: string;  // ポップアップに表示する意味
    createdAt: string;   // ISO8601
    updatedAt: string;
  };
  ```
- `DictionaryState`
  ```ts
  type DictionaryState = {
    entries: DictionaryEntry[];
  };
  ```
- `MatchingSettings`
  ```ts
  type MatchingSettings = {
    mode: 'exact' | 'partial' | 'regex';
    caseSensitive: boolean;
    debounceMs: number;         // MutationObserver への遅延適用（初期値: 50ms）
    maxHighlightsPerNode: number; // 性能保護（初期値: 20）
  };
  ```
- `ThemeSettings`
  ```ts
  type ThemeSettings = {
    highlightBg: string;     // WCAG AA 相当を満たすデフォルト
    highlightText: string;
    highlightBorder: string;
    popupBg: string;
    popupText: string;
  };
  ```
- `UserSettings`
  ```ts
  type UserSettings = {
    dictionary: DictionaryState;
    matching: MatchingSettings;
    theme: ThemeSettings;
  };
  ```

## 4. 主要フロー
- **辞書登録**
  1. ユーザーが options ページで CSV を選択。
  2. `CsvImporter` がヘッダー行を解析し、候補列名を抽出。
  3. `ImportDialog` でキー列と意味列を選択、プレビュー表示。
  4. 確定時に `ParseCsvToDictionary` が `DictionaryEntry[]` を生成（空行・欠損は除外）。
  5. 既存辞書とマージし、`StorageService` を通じて保存。
  6. `chrome.runtime.sendMessage` でコンテンツスクリプトへ辞書更新を通知。
- **字幕ハイライト**
  1. コンテンツスクリプトが `MeetCaptionObserver` で字幕 DOM (`[aria-live="assertive"]`, `[data-speak-item]` 等) を監視。
  2. 新しい発話ノードが出現すると `Highlighter` に通知。
  3. `MatcherFactory` が設定に応じた正規表現を生成し、テキストをスキャン。
  4. 該当部分を `span.caption-highlighter__match` にラップし、`data-term-id` で辞書エントリを関連付け。
  5. hover/focus 時に `TooltipController` がテーマに沿ったポップアップを表示。
- **設定同期**
  - Options UI がストレージを更新すると `chrome.storage.onChanged` とメッセージングでコンテンツスクリプトへ最新設定を push。
  - コンテンツスクリプトは設定を受信し、マッチャー・テーマを再適用。

## 5. ストレージ & 永続化
- `chrome.storage.local` に JSON として保存。
- Schema version (`storageVersion`) をメタデータとして保持。互換性変更時にマイグレーション関数を実装。
- 辞書エントリの ID は `crypto.randomUUID()` で生成。CSV からのインポート時に重複語句は上書き（最新行を優先）。

## 6. エラーハンドリング
- CSV 解析失敗時は UI に明示（パース失敗、列未選択、空ファイル）。
- コンテンツスクリプトで DOM 検知できない場合、バナーを表示してユーザーに字幕設定を確認させる。
- ハイライト時に MutationObserver の無限ループを防ぐため、自前の `data-processed` 属性を付与。
- Tooltip 描画時に viewport 超過を検知し、左右・上下を切り替える。

## 7. パフォーマンス対策
- MutationObserver のコールバックに debounce を適用。
- 1 ノード当たりの正規表現評価回数を抑制するため、用語リストから `TrieMatcher` を将来的に導入できるよう `Matcher` インターフェイスを定義。
- ハイライト済みノードは `WeakSet` で追跡し、再処理を回避。
- CSS アニメーションや派手な DOM 変更は避け、軽量な inline style を採用。

## 8. テスト戦略
- **ユニットテスト** (Vitest)
  - `matcher.spec.ts`: 大文字小文字設定、部分一致／完全一致／正規表現の検証。
  - `csv-importer.spec.ts`: CSV 解析、空行スキップ挙動。
- **Storybook**
  - `DictionaryTable`、`ImportPreview`、`MatchingSettingsForm`、`ThemeSettingsForm` の状態確認。
- **E2E (将来)**: Playwright で Google Meet のモックページに対するハイライト検証を検討。
- **追加計画**: Options UI コンポーネントの Vue Test Utils テストと `storage` 層のマイグレーションテストを今後整備。

## 9. ビルド & デプロイ
- `pnpm` を採用（高速 + lockfile）。
- スクリプト例:
  - `pnpm dev` : Vite dev server (options page)。
  - `pnpm build` : Vite build + `web-ext` でパッケージ化。
  - `pnpm test` : Vitest 実行。
  - `pnpm storybook` / `pnpm build-storybook` : Storybook 開発・ビルド。
- 出力は `dist` フォルダ。Chrome 拡張としてパッケージし、`chrome://extensions` に読み込み。

## 10. 拡張ポイント
- サブスク API 連携を想定し、`UserStatus` モデルと `SubscriptionClient` インターフェイスを予め定義。
- 辞書共有機能を見据え、`DictionarySource` 列挙で `local` / `remote` を準備。
- Google Meet DOM 変化に備え、セレクタを設定として持ち、将来リモート更新で配信可能にする。

## 11. 未解決事項
- ハイライト対象ルールの詳細 (部分一致をデフォルト、正規表現は beta 扱い)。
- Storybook を CI に組み込む方法（GitHub Actions 上のワークフロー定義）。
- ユーザーが大量辞書を登録した際のパフォーマンス測定基準。

