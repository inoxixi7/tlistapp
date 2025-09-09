# tlistapp

## 配置 Firebase 与 Google 登录

1) 在项目根目录创建 `.env`（可复制 `.env.example` 并替换为你自己的值）：

- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_APP_ID
- EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID (可选)
- EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID
- EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID
- EXPO_PUBLIC_WEB_GOOGLE_CLIENT_ID

2) Firebase 控制台

- 启用 Authentication › Google 登录
- 允许的来源/重定向域名加入本地/部署地址（如 http://localhost:19006）
- Firestore 规则：仅允许用户访问 `users/{uid}/**`（示例，可按需加强）

3) app.json 中已含 `scheme: "my"` 与 Android intentFilters；如需自定义 scheme，请同步更新 Google OAuth 的重定向配置。

4) 运行

```bash
npm start
```

Web 上点击“Googleでログイン”使用 Firebase Popup；iOS/Android 上使用 expo-auth-session 发起 Google OAuth 并换取 Firebase 凭证。

安全提示：不要把真实密钥硬编码到源码里，放入 .env（EXPO_PUBLIC_*）即可，见 `app/lib/firebase.ts`。
# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
