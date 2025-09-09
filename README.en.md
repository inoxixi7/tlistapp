# TList App (English)

A travel packing list app built with Expo Router and Firebase. It supports username/email login, Google auth (Web), local persistence, Firestore cloud sync, and generating recommended item lists from trip info.

---

## Features
- Login/Sign up (email or username + password), Google login (Web)
- Forgot password (resolve email from username)
- Create a trip (destination, dates, people, purpose) and generate an editable recommended list
- Local persistence (AsyncStorage) and cloud sync to Firestore (users/{uid}/lists)
- Settings screen is gated (redirects to login when unauthenticated)

---

## Project Structure
```
app/
  _layout.tsx           # Root Stack + Providers (Auth/List/CloudSync)
  +not-found.tsx
  login.tsx             # Login (email/username, Google, helpers)
  register.tsx          # Register (ToS checkbox, username mapping)
  newlist.tsx           # Create trip form → push to recommendedlist
  recommendedlist.tsx   # Generate/edit categorized list, save/sync
  terms.tsx             # Terms of Service
  (tabs)/
    _layout.tsx         # Tabs: Home(index), Settings
    index.tsx           # Home: list cards, open/edit/delete
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

## Tech Stack
- Expo 53, Expo Router 5, React Native 0.79, React 19
- Firebase Auth + Firestore
- AsyncStorage (local persistence)
- Ionicons, cross-platform icon mapping (IconSymbol)

---

## Auth & Data
- Auth:
  - Email/password and Google (Web popup with redirect fallback)
  - Username login via `usernames/{usernameLower}` mapping to email
  - After sign-up, update displayName and write mapping `{ email, ownerUid, createdAt }`
- Data:
  - Local: `ListContext` persists to AsyncStorage
  - Cloud: auto-sync to `users/{uid}/lists/*` when signed in
  - Settings: `users/{uid}/settings`

---

## Development & Run
1) Install
```bash
npm install
```
2) Configure Firebase (choose one)
- A: Use `.env` and read config in `app/lib/firebase.ts` (recommended)
- B: Web only: use the hardcoded config in `app/lib/firebase.web.ts`

3) Start
```bash
npx expo start
```

---

## Firestore Rules Example
See `firestore.rules` at repo root or use the snippet below:
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

## Notes
- Do not hardcode secrets; use `.env` (EXPO_PUBLIC_*).
- Google login uses Web popup; falls back to redirect if blocked.
- If you see `permission-denied` during registration, deploy the Firestore rules above.
- First sync: if cloud is empty, upload local; if cloud has data, overwrite local (simplified strategy).

---

MIT License © Contributors
