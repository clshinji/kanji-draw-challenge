# Term 1 開発計画: バグ修正 + UX改善

> 作成日: 2026-03-15
> スコープ: テストプレイ（2026.3.15）で挙がった要望（GitHub Issue #1）に基づく
> 方針: バグ修正 + UX改善に絞る。経済システム（コイン・素材・ショップ）はTerm 2以降

---

## Phase 0: バグ修正（最優先）

### Task 0-1: 「姉」の表示不具合を修正 ✅ 完了

- **原因**: hanzi-writer-data-jp / hanzi-writer-data 両CDNで「姉」が404
- **方針**: `_charDataLoader` にローカルフォールバック機構を追加。`js/kanji-fallback-data.js` に欠損漢字のストロークデータを格納
- **対象ファイル**:
  - `js/canvas-drawing.js`
  - `js/kanji-fallback-data.js`（新規）
  - `index.html`
- **実装詳細**:
  - ストロークデータは hanzi-writer-data-jp の GitHub リポジトリ（masterブランチ）から取得（npmパッケージには未収録だがリポジトリには存在）
  - `_charDataLoader` に3段階フォールバックを実装: ①日本語CDN → ②中国語CDN → ③ローカル `KANJI_FALLBACK_DATA`
  - 今後CDNに欠損する漢字が見つかった場合は `js/kanji-fallback-data.js` にエントリを追加するだけで対応可能

---

## Phase 1: UX改善（High優先度）

### Task 1-1: 漢字表示のローディングインジケータ ✅ 完了

- **問題**: CDNからのfetch待ち中に何も表示されない
- **方針**: `setKanji()` 内でローディングUI表示、HanziWriter描画完了で除去
- **演出**: マイクラ風ドット絵のローディングアニメーション（DotGothic16で「よみこみちゅう...」）
- **対象ファイル**:
  - `js/canvas-drawing.js`
  - `css/style.css`
- **実装詳細**:
  - `setKanji()` で `target.innerHTML` クリア直後にローディング要素を挿入
  - `charDataLoader` コールバックをラップし、`onLoad` / `onError` 両方でローディングを除去
  - ⛏️ アイコンの採掘アニメーション + ドットが順に跳ねるアニメーションで待機感を演出

### Task 1-2: セーブデータのクラウド同期 — フロントエンド ✅ 完了 / バックエンド 🔲 未着手

- **構成**: AWS サーバレス（DynamoDB無料枠 + デバイスIDベース認証）
- **同期フロー**: 手動同期（アップロード/ダウンロード）をまず実装。自動同期はTerm 2以降
- **認証方式変更**: Cognito User Pool → デバイスIDベース（UUID）。デバイス間移行は6桁引き継ぎコードで対応

#### フロントエンド実装済み内容

- `js/cloud-sync.js`（新規）: デバイスID管理(UUID)、同期API、引き継ぎコード、スタブモード
- 設定画面（`#screen-settings`）新設: 同期ボタン・デバイスID表示・引き継ぎコード生成/入力
- `API_BASE` を設定するだけで本番APIに切り替わる設計
- スタブモード（localStorage内で完結）で動作確認済み

#### 残タスク: バックエンド（AWS CDK）

- API Gateway + Lambda + DynamoDB でクラウド保存API構築
- 引き継ぎコードAPI（生成/消費）
- `API_BASE` にデプロイ先URLを設定してフロントエンドと接続

#### バックエンド

- API Gateway + Lambda (Node.js)
- DynamoDB: セーブデータストア
- Cognito User Pool: 認証トークン（JWT）発行
- SNS: 管理者通知

#### フロントエンド

- `js/cloud-sync.js`（新規）: 同期ロジック
- 設定画面（`#screen-settings`）新設: 同期ボタン・ステータス表示
- データ形式: `{ version, gameState, progress }` を1レコードとして保存

#### 対象ファイル

- `js/cloud-sync.js`（新規）
- `js/app.js`
- `index.html`
- `css/style.css`

#### AWSリソース（IaC: AWS CDK, TypeScript）

`infra/` に配置:

- `infra/lib/`: CDK スタック定義
  - バックエンドスタック: API Gateway, Lambda, DynamoDB, Cognito, SNS（管理者通知）
  - フロントエンドスタック: S3 + CloudFront（OAC）
- `infra/lambda/`: Lambda 関数のソースコード
- `cdk deploy` で全リソースを一括構築・更新

#### フロントエンドホスティング移行: GitHub Pages → S3 + CloudFront

- **理由**:
  - CDKで1スタックに統合管理できる
  - CloudFront のオリジングループで API Gateway と同一ドメイン配信 → CORS不要に
  - S3 は CloudFront OAC 経由のみアクセス（直接公開しない）
  - HTTPS強制、エッジキャッシュによる高速化
  - CloudFront 無料枠（1TB/月）で実質無料
- **デプロイ**: `cdk deploy` でフロントエンドの静的ファイルも S3 に自動アップロード

#### セキュリティ対策（最低限）

**API Gateway**:
- スロットリング設定（レート制限: 例 10 req/sec/IP）で過剰リクエストを防止
- CORS設定を自ドメインのみに制限
- リクエストバリデーション（ペイロードサイズ上限、必須フィールド検証）

**認証・認可**:
- Cognito User Pool で認証トークン（JWT）を発行
- ユーザーはアプリ内からセルフ登録（サインアップ）できる
- Lambda 側で JWT 検証し、自分のデータのみアクセス可能にする（userId ベースのアクセス制御）
- トークンの有効期限を適切に設定（アクセストークン: 1時間、リフレッシュトークン: 30日）

**管理者通知**:
- Cognito のトリガー（Post Confirmation Lambda）でユーザー登録時に管理者メールへ通知（SNS or SES）
- ユーザー情報変更時も同様に Lambda トリガーで管理者へメール通知
- 通知先メールアドレスは環境変数で設定（Lambda の環境変数 or SSM Parameter Store）

**DynamoDB**:
- Lambda の IAM ロールで最小権限（該当テーブルへの GetItem/PutItem のみ）
- パーティションキーに userId を使い、他ユーザーのデータを読み書きできない構造にする

**フロントエンド**:
- API キーやシークレットをフロントエンドのコードに埋め込まない
- Cognito SDK でトークン管理（localStorage に生トークンを直接保存しない）
- インポート時のデータバリデーション（JSONスキーマ検証で不正データの注入を防止）

**インフラ**:
- CloudWatch Logs でアクセスログを記録
- 異常なアクセスパターンの監視（無料枠内で可能な範囲）

---

## Phase 2: 演出の強化（Middle優先度）

### Task 2-1: カテゴリアンロック時の通知演出 ✅ 完了

- **問題**: XP到達でカテゴリがアンロックされた際に通知がない
- **方針**:
  - `game-state.js`: XP加算後に新規アンロック判定、返り値に `newUnlocks` 追加
  - `feedback.js`: `showCategoryUnlock()` 追加（バッジポップアップと同様のモーダル）
  - `app.js`: `_showPostFeedbackSequence` にアンロック通知を組込み
- **演出**: マスコットが「○○がつかえるようになったよ！」と伝える
- **対象ファイル**:
  - `js/game-state.js`
  - `js/feedback.js`
  - `js/app.js`
  - `index.html`
  - `css/style.css`

---

## 実装順序

| 順序 | タスク | 状態 |
|------|--------|------|
| 1 | Task 0-1（姉バグ修正） | ✅ 完了 |
| 2 | Task 1-1（ローディング） | ✅ 完了 |
| 3 | Task 2-1（カテゴリアンロック演出） | ✅ 完了 |
| 4 | Task 1-2（クラウド同期 フロントエンド） | ✅ 完了 |
| 5 | Task 1-2（クラウド同期 バックエンド） | 🔲 未着手 |

---

## Term 2以降に先送りする項目

- 経済システム（コイン・素材・報酬）
- ショップ機能
- クラフト・装備システム
- キャラクタカスタマイズ
- 庭機能の拡張（詳細画面・装飾）
- ボス漢字ステージ
- 他学年対応・マネタイズ

---

## 検証方法

- iPadのSafariで全機能をテストプレイ
- 「姉」の漢字が正常に表示・練習できることを確認
- ローディング中にドット絵アニメーションが表示されることを確認
- カテゴリアンロック時にポップアップが表示されることを確認
- クラウド同期: 2台のiPadでデータが同期できることを確認
