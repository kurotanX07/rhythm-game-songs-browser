# 音ゲー広辞苑 (Rhythm Game Dictionary)

リズムゲームの楽曲情報を検索・閲覧できるWebアプリケーションです。様々な音楽ゲームの楽曲データベースを提供し、難易度、BPM、アーティスト情報などの詳細データを簡単に検索できます。

## 🎵 主な機能

- **楽曲検索**: タイトル、アーティスト、ゲームタイトルで楽曲を検索
- **詳細情報表示**: 各楽曲の難易度、BPM、レベル情報を表示
- **ゲーム別フィルタ**: 特定のリズムゲームの楽曲のみを表示
- **お気に入り機能**: 気に入った楽曲をお気に入りに登録
- **YouTube連携**: 楽曲のプレイ動画を視聴可能
- **レスポンシブデザイン**: PC・タブレット・スマートフォンに対応
- **管理者機能**: Excelファイルからの楽曲データ一括登録

## 🚀 起動方法

### 前提条件

- Node.js (v16以上)
- npm または yarn
- Git

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd rhythm-game-songs-browser
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm start
```

アプリケーションが起動すると、ブラウザで以下のURLにアクセスできます：
- **メインURL**: http://localhost:3000
- **代替URL**: http://127.0.0.1:3000

## 📱 利用方法

### 基本的な使い方

1. **ホーム画面**: アプリケーションの概要と対応ゲーム一覧を表示
2. **楽曲検索**: 「楽曲を探す」ボタンから楽曲ブラウザページへ移動
3. **フィルタリング**: ゲーム別、難易度別で楽曲を絞り込み
4. **詳細表示**: 楽曲をクリックして詳細情報とYouTube動画を表示

### 検索機能

- **フリーワード検索**: 楽曲タイトルやアーティスト名で検索
- **ゲーム別フィルタ**: 特定のリズムゲームの楽曲のみ表示
- **難易度フィルタ**: 特定の難易度レベルで絞り込み
- **並び替え**: タイトル、アーティスト、BPMで並び替え可能

### 管理者機能（要認証）

- **楽曲データ管理**: 新規楽曲の追加・編集・削除
- **Excelインポート**: Excelファイルから楽曲データを一括登録
- **ゲームタイトル管理**: 対応ゲームの追加・編集

## 🛠️ 開発・ビルド

### 利用可能なスクリプト

```bash
# 開発サーバー起動
npm start

# プロダクションビルド
npm run build

# テスト実行
npm test

# Firebase Emulator起動（開発用）
npm run emulators

# Firebase デプロイ
npm run deploy
```

### モバイルアプリ開発

このアプリケーションはCapacitorを使用してモバイルアプリとしても動作します：

```bash
# Androidアプリ開発
npm run cap:android

# iOSアプリ開発
npm run cap:ios

# Androidリリースビルド
npm run build:android:release
```

## 🏗️ 技術スタック

### フロントエンド
- **React 18**: UIライブラリ
- **TypeScript**: 型安全性
- **Material-UI (MUI)**: UIコンポーネント
- **React Router**: ルーティング
- **React Helmet**: SEO対応

### バックエンド・データベース
- **Firebase Firestore**: NoSQLデータベース
- **Firebase Authentication**: ユーザー認証
- **Firebase Hosting**: Webホスティング

### モバイル開発
- **Capacitor**: ハイブリッドアプリフレームワーク
- **Android/iOS**: ネイティブアプリ対応

### その他のライブラリ
- **Fuse.js**: 高速検索エンジン
- **react-youtube**: YouTube動画埋め込み
- **xlsx**: Excelファイル処理
- **dayjs**: 日付処理

## 📁 プロジェクト構造

```
src/
├── components/          # Reactコンポーネント
│   ├── admin/          # 管理者用コンポーネント
│   ├── common/         # 共通コンポーネント
│   ├── layout/         # レイアウトコンポーネント
│   └── user/           # ユーザー用コンポーネント
├── contexts/           # React Context
├── hooks/              # カスタムフック
├── pages/              # ページコンポーネント
├── services/           # API・サービス層
├── types/              # TypeScript型定義
└── utils/              # ユーティリティ関数
```

## 🔧 設定

### 環境変数

`.env`ファイルを作成し、以下の設定を行ってください：

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

## 🐛 トラブルシューティング

### よくある問題

1. **ポート3000が使用中**: 他のアプリケーションがポート3000を使用している場合
   ```bash
   # 別のポートで起動
   PORT=3001 npm start
   ```

2. **依存関係のエラー**: package-lock.jsonを削除して再インストール
   ```bash
   rm package-lock.json
   rm -rf node_modules
   npm install
   ```

3. **Firebase接続エラー**: `.env`ファイルの設定を確認

### ESLint警告について

現在、未使用の変数やインポートに関するESLint警告が表示されますが、アプリケーションの動作には影響ありません。これらは開発中の一時的な警告です。

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。

## 🤝 貢献

バグ報告や機能要望がある場合は、Issueを作成してください。

---

**開発者**: kurotanx07  
**アプリ名**: Rhythm Game Dictionary (音ゲー広辞苑)  
**バージョン**: 0.1.2
