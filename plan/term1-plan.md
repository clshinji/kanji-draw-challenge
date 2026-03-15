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

### Task 1-2: セーブデータのクラウド同期 ✅ 完了

- **構成**: AWS サーバレス（DynamoDB無料枠 + デバイスIDベース認証）
- **同期フロー**: 手動同期（アップロード/ダウンロード）
- **認証方式**: デバイスIDベース（UUID）。デバイス間移行は6桁引き継ぎコードで対応

#### フロントエンド

- `js/cloud-sync.js`（新規）: デバイスID管理(UUID)、同期API、引き継ぎコード、スタブモード
- 設定画面（`#screen-settings`）新設: 同期ボタン・デバイスID表示・引き継ぎコード生成/入力
- `API_BASE` を設定するだけで本番APIに切り替わる設計
- データ形式: `{ version, gameState, progress }` を1レコードとして保存

#### バックエンド（AWS CDK）

- **スタック**: `KanjiSyncStack`（1スタック構成）
- **API Gateway** (REST API): 4エンドポイント
  - `POST /api/save` — セーブデータのアップロード
  - `GET /api/save/{deviceId}` — セーブデータのダウンロード
  - `POST /api/transfer/generate` — 引き継ぎコード生成
  - `POST /api/transfer/redeem` — 引き継ぎコード消費
- **Lambda**: Node.js 20, ESM, 単一ハンドラ（SDK v3 ランタイム同梱）
- **DynamoDB**:
  - `KanjiSaves`（PK: `deviceId`）— セーブデータ保存、RETAIN
  - `KanjiTransfers`（PK: `code`, TTL: 24h）— 引き継ぎコード、DESTROY
- **スロットリング**: burst 10, rate 10
- **CORS**: `Access-Control-Allow-Origin: *`（ホスティング移行後に制限予定）

#### 対象ファイル

- `js/cloud-sync.js`
- `js/app.js`
- `index.html`
- `css/style.css`
- `infra/package.json`
- `infra/tsconfig.json`
- `infra/cdk.json`
- `infra/bin/kanji-sync.ts`
- `infra/lib/kanji-sync-stack.ts`
- `infra/lambda/index.mjs`

#### デプロイ

```bash
aws sso login --profile clshinji
cd infra
npm install
npx cdk bootstrap --profile clshinji   # 初回のみ
npx cdk deploy --profile clshinji --require-approval never
```

API URL: `https://lojuomjut1.execute-api.ap-northeast-1.amazonaws.com/prod`

#### Lambda更新手順

`infra/lambda/index.mjs` を変更した場合:

```bash
cd infra
npx cdk deploy --profile clshinji --require-approval never
```

CDK が Lambda コードの変更を検知し、自動で再デプロイされる。

#### セキュリティ対策

- API Gateway スロットリング（10 req/sec）
- Lambda でリクエストバリデーション（ペイロードサイズ上限 100KB、必須フィールド検証）
- DynamoDB: Lambda の IAM ロールで readWriteData 権限（該当テーブルのみ）
- CORS: 現在は `*`、ホスティング移行後に自ドメインのみに制限予定
- CloudWatch Logs でアクセスログを記録

#### Term 2以降で検討

- フロントエンドホスティング移行（GitHub Pages → S3 + CloudFront）で CORS 不要化
- 自動同期（定期バックグラウンド同期）
- 管理者通知（SNS/SES）

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
| 5 | Task 1-2（クラウド同期 バックエンド） | ✅ 完了 |

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
