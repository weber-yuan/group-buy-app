# 團購平台 Group Buy App

基於 Next.js 開發的團購管理平台，支援建立團購、訂單管理、後台管理等功能。

## 技術架構

- **框架：** Next.js 16 App Router
- **資料庫：** Turso（雲端 SQLite，@libsql/client）
- **驗證：** JWT（httpOnly Cookie，7 天效期）
- **樣式：** Tailwind CSS 4 + 玻璃擬態設計
- **語言：** TypeScript（strict 模式）
- **部署：** Vercel（無伺服器）+ Vercel Blob（圖片儲存）

## 功能特色

- 使用者註冊 / 登入
- 個人資料管理（更改顯示名稱、密碼）
- 建立與管理團購（含圖片上傳、多規格選項）
- 公開團購頁面（以 slug 識別）
- 參加團購時自動帶入已登入使用者的顯示名稱
- 訂單管理（建立、查看、修改數量 / 名稱、刪除）
- 我的訂單頁面（查看並管理自己參加的所有團購）
- 匯出訂單（Excel XLSX 格式）
- 鎖定團購防止新訂單
- 圖片點擊放大燈箱（主圖與品項縮圖均支援，按 Esc 或點擊背景關閉）
- 忘記密碼自助重設（需帳號有設定電子郵件）
- **管理員後台：** 管理所有使用者與團購、重設任意使用者密碼、刪除使用者帳號

## 快速開始

**1. 安裝相依套件**

```bash
npm install
```

**2. 建立環境變數檔案**

在專案根目錄建立 `.env.local`：

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
JWT_SECRET=your-jwt-secret
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

**3. 初始化資料庫結構**

```bash
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/setup-db.mjs
```

**4. 啟動開發伺服器**

```bash
npm run dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000)。

### 預設管理員帳號

初始化資料庫時會建立一個 `admin` 帳號，密碼來源為：

- 若有設定 `ADMIN_PASSWORD` 環境變數 → 使用該值
- 未設定 → 隨機產生一組密碼，並於 `setup-db.mjs` 執行時印出一次（請當下記下來）

> ⚠️ 不再有寫死的固定預設密碼。請在初始化後立即登入並於「個人資料」頁更改為強密碼。
>
> 忘記密碼可透過「忘記密碼」頁面以電子郵件自助重設（需帳號已設定 email），或聯繫管理員由後台直接重設。

## 常用指令

```bash
npm run dev      # 啟動開發伺服器（localhost:3000）
npm run build    # 正式環境建置
npm run start    # 啟動正式伺服器
npm run lint     # 執行 ESLint
```

清除 Next.js 快取（遇到建置問題時使用）：

```bash
rm -rf .next && npm run dev
```

## 專案結構

```
src/
├── app/
│   ├── api/              # API Route Handlers
│   ├── buy/              # 公開團購頁面
│   ├── my-orders/        # 我的訂單
│   ├── forgot-password/  # 忘記密碼
│   ├── reset-password/   # 重設密碼
│   ├── dashboard/        # 使用者後台（含個人資料頁）
│   └── admin/            # 管理員後台
├── components/           # 共用元件（Navbar、GlassCard、GroupBuyForm）
├── lib/
│   ├── db.ts             # Turso 資料庫連線
│   ├── auth.ts           # JWT 驗證工具（jsonwebtoken，Node 端）
│   ├── jwt-secret.ts     # JWT secret 單一來源（正式環境強制要求）
│   ├── email.ts          # 寄送重設密碼信件
│   └── utils.ts          # 共用工具函式
└── proxy.ts              # 路由保護（/dashboard、/admin）；以 jose 驗證 JWT
scripts/
└── setup-db.mjs          # 資料庫初始化與管理員建立
```

## 團購可見性與存取行為

| 狀態 | 首頁顯示 | 直接連結可瀏覽 | 可提交訂單 |
|------|----------|----------------|------------|
| 進行中（is_public = 1） | ✅ | ✅ 任何人 | ✅ |
| 已到期 | ❌（自動鎖定後隱藏） | ✅ 任何人（顯示「已鎖定」） | ❌ |
| 手動鎖定 | ❌ | ✅ 任何人（顯示「已鎖定」） | ❌ |
| 未公開（is_public = 0） | ❌ | ✅ 任何人（仍可直接開） | ✅（若未到期且未鎖定） |

**說明：**
- 團購到期時會被自動鎖定（`autoLockExpired()` 於每次讀取 `/api/group-buys` 或 `/api/group-buys/[id]` 時執行），手動鎖定與到期鎖定在資料庫狀態上一致，首頁均不顯示。
- `/buy/[slug]` 頁面無身份驗證保護，知道連結的人皆可瀏覽；鎖定時頁面會顯示已截止提示並隱藏報名表單。
- 未公開的團購不出現在首頁，但連結本身並未加密保護，知道 slug 仍可直接存取。

## 資料庫

使用 Turso 雲端 SQLite。資料表包含：`users`、`group_buys`、`options`、`orders`、`order_items`、`password_reset_tokens`。

Schema 不自動遷移，需手動執行 `scripts/setup-db.mjs` 初始化或重設。

## 安全性

- **JWT 驗證：** `src/proxy.ts` 跑在 Edge runtime（Vercel），改用 **`jose`** 驗證 JWT，而非 `jsonwebtoken`（後者依賴 Node `crypto`，在 Edge 會拋錯，曾導致進入 `/dashboard` 一律被導回登入）。Node 端 API 仍以 `jsonwebtoken` 簽發，兩者用同一把 HS256 secret，完全相容。
- **JWT_SECRET 為正式環境必要：** `src/lib/jwt-secret.ts` 是 secret 的單一來源；正式環境（`NODE_ENV=production`）未設定即直接拋錯，**不再有任何寫死的 fallback**，避免有人用公開原始碼偽造管理員 token。請勿從部署平台移除此變數。
- **安全 HTTP headers：** `next.config.ts` 對所有路由套用 HSTS、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy`。
- **無寫死的管理員密碼：** 見上方「預設管理員帳號」。

待強化（demo 階段未做）：登入失敗次數限制、CSP（需 nonce）、上傳檔案 magic-byte 檢查、密碼強度規則。

## 部署（Vercel）

1. 將專案推送至 GitHub（已連結 Vercel 時，**push 到 `master` 會自動觸發正式部署**）
2. 在 Vercel 匯入專案並設定以下環境變數：
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`（**必填**；未設定正式站會無法啟動）
   - `BLOB_READ_WRITE_TOKEN`（連結 Vercel Blob Store 後自動注入）
   - `NEXT_PUBLIC_BASE_URL`（完整網域，選填）
   - `ADMIN_PASSWORD`（選填；供 `setup-db.mjs` 建立管理員時使用）
   - `EMAIL_HOST`、`EMAIL_PORT`、`EMAIL_USER`、`EMAIL_PASS`（SMTP，選填）

> 環境變數新增 / 修改後需**重新部署**才會套用到正式站（Vercel 顯示「Needs Attention」即代表尚未套用）。
