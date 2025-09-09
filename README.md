# TList App

Language · 言語 · 语言

- 中文: README.zh-CN.md
- 日本語: README.ja.md
- English: README.en.md

---

This repository contains a travel packing list app built with Expo Router and Firebase. Select your preferred language above to read full documentation.

MIT License © Contributors
- 开发与运行 / 開発と実行 / Development & Run
- Firestore 规则示例 / ルール例 / Rules Example
- 注意事项 / 注意 / Notes

---

## 简介 · 概览 (ZH)
TList 是一个跨平台的旅行清单应用：
- 支持用户名或邮箱登录、Google 登录；
- 注册时写入唯一“用户名 → 邮箱”映射；
- 新建行程，生成推荐物品清单，分类勾选与编辑；
- 本地持久化，登录后自动与 Firestore 云同步。

## 概要 (JA)
TList は、旅行用チェックリストアプリです：
- ユーザー名/メールでのログイン、Google ログイン；
- 登録時にユーザー名→メールの一意マッピングを保存；
- 新規作成から推奨リストを生成、分類/チェック/編集；
- ローカル保存に加え、ログイン時は Firestore と自動同期。

## Overview (EN)
TList is a travel packing list app:
- Sign in with username or email, plus Google auth;
- On registration, it saves a unique username→email mapping;
- Create a trip to generate a recommended packing list; categorize, check, and edit items;
- Persists locally and auto-syncs with Firestore when signed in.

---

## 功能特性 / 機能 / Features
- 登录/注册（邮箱或用户名 + 密码），Google 登录（Web）
   - Login/Sign up (email or username + password), Google login (Web)
   - ログイン/新規登録（メールまたはユーザー名 + パスワード）、Google ログイン（Web）
- 忘记密码（支持用户名找回邮箱）
   - Forgot password (resolve email from username)
   - パスワード再設定（ユーザー名→メール解決）
- 新建清单（目的地、日期、人数、目的），推荐清单生成与编辑
   - Create list (destination, dates, people, purpose), generate and edit recommended list
   - 行程作成（目的地、日付、人数、目的）、推奨リスト生成・編集
- 本地持久化（AsyncStorage）与云同步（Firestore users/{uid}/lists）
   - Local persistence + cloud sync
   - ローカル保存 + クラウド同期
- 设置页鉴权拦截（未登录跳转登录页）
   - Settings gate: redirect to login when unauthenticated
   - 設定画面は未ログイン時ログインへ遷移

---

## 项目结构 / 構成 / Structure
```
app/
   _layout.tsx           # Root Stack + Providers (Auth/List/CloudSync)
   +not-found.tsx
   login.tsx             # Login (email/username, Google, helpers)
   register.tsx          # Register (ToS checkbox, username mapping)
   newlist.tsx           # Create trip form → push to recommendedlist
   recommendedlist.tsx   # Generate/edit categorized list, save/sync
   terms.tsx             # Terms of Service page
   (tabs)/
      _layout.tsx         # Tabs: Home(index), Settings
      index.tsx           # Home: list cards, edit/open/delete
      settings.tsx        # Settings: local prefs + cloud sync note
   context/
      AuthContext.tsx     # Auth state & methods
      ListContext.tsx     # Local lists state + AsyncStorage
      CloudSync.tsx       # Firestore sync (users/{uid}/lists)
   lib/
      firebase.ts         # Cross-platform Firebase init (env)
      firebase.web.ts     # Web-only Firebase init (hardcoded)
```

---

## 技术栈 / 技術スタック / Tech Stack
- Expo 53, Expo Router 5, React Native 0.79, React 19
- Firebase Auth + Firestore
- AsyncStorage（本地持久化）
- IconSymbol（跨端图标适配），Ionicons

---

## 认证与数据 / 認証とデータ / Auth & Data
- 认证
   - 邮箱/密码 与 Google（Web 弹窗，阻止时回退 redirect）；
   - 支持用户名登录：通过 `usernames/{usernameLower}` 映射到邮箱；
   - 注册成功后更新 displayName，并写入映射：`{ email, ownerUid, createdAt }`。
- 数据
   - 本地：`ListContext` 通过 AsyncStorage 持久化；
   - 云端：登录后自动同步到 `users/{uid}/lists/*`；
   - 设置页：`users/{uid}/settings`。

注意：仓库中提供了 `firestore.rules` 示例，部署后方可写入用户名映射与用户清单。

---

## 开发与运行 (ZH)
1) 安装依赖
```bash
npm install
```
2) 配置 Firebase（任选其一）
- 方式 A：使用 `.env`（推荐，跨端通用）并编辑 `app/lib/firebase.ts`
   - EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID, EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID (可选)
- 方式 B：仅 Web 开发使用 `app/lib/firebase.web.ts` 的硬编码配置

3) 启动开发服务器
```bash
npx expo start
```
可通过 Web/iOS/Android 预览（Google 登录完整支持 Web）。

## 開発と実行 (JA)
1) 依存関係のインストール
```bash
npm install
```
2) Firebase 設定（どちらか）
- A: `.env` で共通初期化（推奨）
- B: Web のみ `app/lib/firebase.web.ts` を使用

# TList App 语言索引
3) 実行
```bash
npx expo start
1) Install
npm install
```
2) Configure Firebase via `.env` or use `firebase.web.ts` for Web only
3) Start
npx expo start
```

---

## Firestore 规则示例 / ルール例 / Rules Example
将以下内容部署到 Firestore 规则（或参考本仓库根目录的 `firestore.rules`）：

```rules
rules_version = '2';
service cloud.firestore {
   match /databases/{database}/documents {
      // Per-user data under users/{uid}/...
      match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      // Public username -> account mapping. Claimed once and immutable.
      match /usernames/{username} {
         allow read: if true;
         allow create: if request.auth != null
            && !exists(/databases/$(database)/documents/usernames/$(username))
            && request.resource.data.ownerUid == request.auth.uid
            && request.resource.data.keys().hasOnly(['email', 'ownerUid', 'createdAt'])
            && request.resource.data.email is string
            && request.resource.data.ownerUid is string
            && (request.resource.data.createdAt is timestamp || !('createdAt' in request.resource.data));
         allow update, delete: if false;
      }
   }
}
```

要点 / ポイント / Notes:
- usernames 集合仅允许首次创建，且必须带上 `ownerUid` 与 `email`；禁止更新/删除，防止被接管。
- 用户数据仅允许 `request.auth.uid == uid` 访问。

---

## 注意事项 / 注意 / Notes
- Secrets：不要把真实密钥写入代码，使用 `.env`（EXPO_PUBLIC_*）。
- Google 登录：Web 使用 Popup，若被拦截自动回退到 Redirect。
- 权限错误：若注册时报错“permission-denied”，请部署上述 Firestore 规则。
- 日期格式：输入/显示优先 `YYYY-MM-DD`，解析做了兼容。
- 同步策略：首次登录若云端为空会上载本地；云端有数据会覆盖本地（简化版）。

---

MIT License © Contributors
