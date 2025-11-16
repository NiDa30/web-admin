# Firebase Functions - Email Notification

## セットアップ

### 1. 依存関係のインストール

```bash
cd functions
npm install
```

### 2. Gmail認証情報の設定

Firebase FunctionsにGmail認証情報を設定します：

```bash
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"
```

**重要**: Gmailのアプリパスワードを使用してください（通常のパスワードではありません）。

#### Gmailアプリパスワードの取得方法：

1. Googleアカウント設定にアクセス
2. 「セキュリティ」→「2段階認証プロセス」を有効化
3. 「アプリパスワード」を生成
4. 生成された16文字のパスワードを`email.password`に設定

### 3. Functionsのデプロイ

```bash
firebase deploy --only functions
```

## 使用方法

パスワード変更時に自動的にメールが送信されます。

## 環境変数（代替方法）

Firebase Functionsの設定の代わりに、環境変数を使用することもできます：

```bash
export EMAIL_USER="your-email@gmail.com"
export EMAIL_PASSWORD="your-app-password"
```

