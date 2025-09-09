# TList App（中文）

一个基于 Expo Router 与 Firebase 的旅行清单应用，支持用户名/邮箱登录、Google 登录（Web）、本地持久化与 Firestore 云同步，并可根据行程信息生成推荐物品清单。

---

## 功能特性
- 登录/注册（邮箱或用户名 + 密码），Google 登录（Web）
- 忘记密码（支持通过用户名找回邮箱）
- 新建行程（目的地、日期、人数、目的）并生成可编辑的推荐清单
- 本地持久化（AsyncStorage）与云同步（Firestore users/{uid}/lists）
- 设置页鉴权拦截（未登录自动跳转登录页）

---

## 项目结构
```
app/
  _layout.tsx           # 根 Stack + Provider 注入（Auth/List/CloudSync）
  +not-found.tsx
  login.tsx             # 登录（邮箱/用户名、Google、找回/辅助）
  register.tsx          # 注册（条款勾选、用户名映射写入）
  newlist.tsx           # 新建行程表单 → 跳转 recommendedlist
  recommendedlist.tsx   # 生成/编辑分类清单，保存并同步
  terms.tsx             # 利用规约页面
  (tabs)/
    _layout.tsx         # Tabs：Home(index)、Settings
    index.tsx           # 首页：清单卡片、打开/编辑/删除
    settings.tsx        # 设置：本地偏好与云同步说明
  context/
    AuthContext.tsx     # 认证状态与方法
    ListContext.tsx     # 清单本地状态 + AsyncStorage
    CloudSync.tsx       # Firestore 同步（users/{uid}/lists）
  lib/
    firebase.ts         # 跨端 Firebase 初始化（.env）
    firebase.web.ts     # Web 专用初始化（硬编码）
```

---

## 技术栈
- Expo 53, Expo Router 5, React Native 0.79, React 19
- Firebase Auth + Firestore
- AsyncStorage（本地持久化）
- Ionicons、跨端图标适配（IconSymbol）

---

## 认证与数据
- 认证：
  - 邮箱/密码 与 Google（Web 弹窗，弹窗被拦截则回退 Redirect）
  - 用户名登录：通过 `usernames/{usernameLower}` 映射邮箱
  - 注册成功后更新 displayName，并写入映射 `{ email, ownerUid, createdAt }`
- 数据：
  - 本地：`ListContext` 通过 AsyncStorage 持久化
  - 云端：登录后自动同步至 `users/{uid}/lists/*`
  - 设置页：`users/{uid}/settings`

---

## 开发与运行
1) 安装依赖
```bash
npm install
```
2) 配置 Firebase（二选一）
- 方式 A：使用 `.env` 并在 `app/lib/firebase.ts` 读取（推荐）
- 方式 B：仅 Web 使用 `app/lib/firebase.web.ts` 的硬编码配置

3) 启动
```bash
npx expo start
```

---

## Firestore 规则示例
详见仓库根目录 `firestore.rules` 或使用以下片段：
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
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

---

## 注意事项
- 不要将真实密钥硬编码到仓库；使用 `.env`（EXPO_PUBLIC_*）
- Google 登录在 Web 使用 Popup，被拦截将回退 Redirect
- 若注册时报 `permission-denied`，请部署上面的 Firestore 规则
- 首次云同步：云端为空→上载本地；云端有数据→覆盖本地（简化策略）

---

MIT License © Contributors
