# Login Overhaul Design

**Date:** 2026-05-01  
**Status:** Approved  

## Problem

Current login system has 12 bugs/issues, the most critical being:
- Two separate login implementations (ES6 index.js, ES5 user.js) with diverging logic
- APP_SECRET hardcoded in plaintext in repository
- session_key returned to client (WeChat security violation)
- DELETE /api/users/:openid has zero authentication
- Property case mismatch: `userData.nickname` vs server's `nickName`
- Non-existent `handleChooseAvatarTap` function referenced in WXML
- Fake openid fallback: `wx_Date.now()` when login fails

## Goals

1. Unify login into a single shared module `utils/login.js`
2. Fix all security issues (APP_SECRET env var, token-based auth, no session_key leak)
3. Implement WeChat's new recommended auth UI: `open-type="chooseAvatar"` + `type="nickname"` input
4. Remove fake openid fallback, empty success callbacks, race conditions
5. Clean up dead code

## Architecture

### Shared Module: `utils/login.js`

```
login()              → wx.login → POST /api/auth/login → store token + user
getUserInfo()        → read from storage + globalData
isLoggedIn()         → check token existence
logout()             → clear local state + call POST /api/auth/logout
updateProfile(data)  → PUT /api/users/me with new nickName/avatarUrl
```

Both `pages/index/index` and `pages/user/user` import from this module.

### Login Flow

```
User taps login
  → wx.login() gets code
  → POST /api/auth/login { code }
  → Server: jscode2session → get openid
  → Server: DB lookup/insert → return { token, user }
  → Client: store token + userInfo in storage + globalData
  → If new user: prompt to set avatar + nickname
```

### Token Auth

Server generates a simple token (random hex) on login, stored alongside the user record. Subsequent authenticated requests include `Authorization: Bearer <token>`. Token invalidated on logout.

### API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | No | Exchange WeChat code for token |
| POST | `/api/auth/logout` | Yes | Invalidate token |
| GET | `/api/users/me` | Yes | Get current user profile |
| PUT | `/api/users/me` | Yes | Update nickName/avatarUrl |
| DELETE | `/api/users/me` | Yes | Delete account |

All existing `/api/users/:openid` routes are removed (no more openid-in-URL pattern).

### UI: `pages/user/user`

**Logged out:**
```
- Avatar (default placeholder)
- "微信一键登录" button → triggers login flow
- After login: chooseAvatar button + nickname input
```

**Logged in:**
```
- Avatar (tappable → chooseAvatar)
- Nickname (tappable → shows nickname input)
- Logout button
- Delete account (double confirm)
```

### `pages/index/index` Changes

Top bar shows avatar + nickName. Tapping navigates to user page via `switchTab`. No login logic in this page — it only reads `isLoggedIn` and `userInfo` from the shared module.

## Files Changed

| File | Action |
|------|--------|
| `utils/login.js` | **Create** — shared login module |
| `pages/user/user.js` | **Rewrite** — use login module, add chooseAvatar/nickname |
| `pages/user/user.wxml` | **Rewrite** — new UI |
| `pages/user/user.wxss` | **Rewrite** — new styles |
| `pages/index/index.js` | **Simplify** — remove login code, use login module |
| `pages/index/index.wxml` | **Minor** — read-only user display |
| `pages/index/index.wxss` | **Minor** — adjust styles |
| `index.js` (server) | **Rewrite** — new auth routes, remove old user routes, env vars |
| `.env.example` | **Create** — document required env vars |

## Files Removed

| File | Reason |
|------|--------|
| `utils/renderDb.js` | Dead code, never used |

### Environment Variables

| Var | Purpose |
|-----|---------|
| `WECHAT_APP_ID` | WeChat mini-program AppID |
| `WECHAT_APP_SECRET` | WeChat mini-program AppSecret |
| `DATABASE_URL` | PostgreSQL connection (already exists) |
| `TOKEN_SECRET` | Optional — salt for token generation (defaults to random) |

Token is a 32-character random hex string stored alongside the user record. Invalidated on logout by clearing it.

## Not Changed

- PostgreSQL schema (kept as-is)
- Word editor, PDF, German, Japanese modules
- Tab bar configuration
- Build/deploy configuration
