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

- 使用者註冊 / 登入 / 忘記密碼（Email 重設）
- 個人資料管理（更改顯示名稱、Email、密碼）
- 建立與管理團購（含圖片上傳、多規格選項）
- 公開團購頁面（以 slug 識別）
- 訂單管理（建立、查看、付款確認）
- 後台管理介面（管理使用者、團購）
- 匯出訂單（Excel XLSX 格式）
- 鎖定團購防止新訂單

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

| 帳號 | 密碼 |
|------|------|
| admin | admin1234 |

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
│   ├── api/          # API Route Handlers
│   ├── buy/          # 公開團購頁面
│   ├── dashboard/    # 使用者後台（含個人資料頁）
│   └── admin/        # 管理員後台
├── components/       # 共用元件（Navbar、GlassCard、GroupBuyForm）
├── lib/
│   ├── db.ts         # Turso 資料庫連線
│   ├── auth.ts       # JWT 驗證工具
│   ├── email.ts      # 密碼重設 Email
│   └── utils.ts      # 共用工具函式
└── proxy.ts          # 路由保護（/dashboard、/admin）
scripts/
└── setup-db.mjs      # 資料庫初始化與管理員建立
```

## 資料庫

使用 Turso 雲端 SQLite。資料表包含：`users`、`group_buys`、`options`、`orders`、`order_items`、`password_reset_tokens`。

Schema 不自動遷移，需手動執行 `scripts/setup-db.mjs` 初始化或重設。

## 部署（Vercel）

1. 將專案推送至 GitHub
2. 在 Vercel 匯入專案並設定以下環境變數：
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`
   - `BLOB_READ_WRITE_TOKEN`（連結 Vercel Blob Store 後自動注入）
   - `NEXT_PUBLIC_BASE_URL`（完整網域，用於密碼重設連結）
   - `EMAIL_HOST`、`EMAIL_PORT`、`EMAIL_USER`、`EMAIL_PASS`（SMTP，選填）
