# Firebase Hosting デプロイ手順

## 前提条件

1. Firebase CLIがインストールされていること
2. Firebaseプロジェクトにアクセス権限があること

## セットアップ手順

### 1. Firebase CLIのインストール（未インストールの場合）

```bash
npm install -g firebase-tools
```

### 2. Firebaseにログイン

```bash
firebase login
```

ブラウザが開き、Googleアカウントでログインします。

### 3. プロジェクトの確認

```bash
firebase projects:list
```

`quanlygoiychitieu` プロジェクトが表示されることを確認します。

## デプロイ手順

### 方法1: npmスクリプトを使用（推奨）

```bash
# ビルドとデプロイを一度に実行
npm run deploy
```

### 方法2: 手動で実行

```bash
# 1. プロジェクトをビルド
npm run build

# 2. Firebase Hostingにデプロイ
firebase deploy --only hosting
```

### 方法3: ビルド済みファイルをデプロイ

既にビルド済みの場合は：

```bash
npm run deploy:hosting
```

## デプロイ後の確認

デプロイが完了すると、以下のようなURLが表示されます：

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/quanlygoiychitieu/overview
Hosting URL: https://quanlygoiychitieu.web.app
```

または

```
Hosting URL: https://quanlygoiychitieu.firebaseapp.com
```

## トラブルシューティング

### エラー: "Firebase CLI not found"

Firebase CLIがインストールされていません。以下を実行：

```bash
npm install -g firebase-tools
```

### エラー: "Permission denied"

Firebaseプロジェクトへのアクセス権限がありません。Firebase Consoleで確認してください。

### エラー: "Build failed"

ビルドエラーが発生しています。以下を確認：

```bash
npm run build
```

エラーメッセージを確認して修正してください。

### カスタムドメインの設定

Firebase Console > Hosting > カスタムドメイン から設定できます。

## 環境変数の設定

本番環境では、環境変数が正しく設定されていることを確認してください。

`.env.production` ファイルを作成するか、Firebase Hostingの環境変数設定を使用してください。

## 注意事項

- `dist` フォルダがビルド出力先として設定されています
- SPA（Single Page Application）のため、すべてのルートは `index.html` にリダイレクトされます
- 静的アセット（JS、CSS、画像など）は1年間キャッシュされます
- HTMLとJSONファイルはキャッシュされません

