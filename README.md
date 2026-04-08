# 團購平台 Group Buy App

基於 Next.js 開發的團購管理平台，支援建立團購、訂單管理、後台管理等功能。

## 技術架構

- **框架：** Next.js 16 App Router
- **資料庫：** better-sqlite3（SQLite，WAL 模式）
- **驗證：** JWT（httpOnly Cookie）
- **樣式：** Tailwind CSS 4 + 玻璃擬態設計
- **語言：** TypeScript（strict 模式）

## 功能特色

- 使用者註冊 / 登入 / 忘記密碼
- 建立與管理團購（含圖片上傳、多規格選項）
- 公開團購頁面（以 slug 識別）
- 訂單管理（建立、查看、付款確認）
- 後台管理介面（管理使用者、團購）
- 匯出訂單（Excel / CSV）
- 鎖定團購防止新訂單

## 快速開始

安裝相依套件：

```bash
npm install
```

啟動開發伺服器：

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
# Windows
rd /s /q .next && npm run dev

# Unix / macOS
rm -rf .next && npm run dev
```

## 專案結構

```
src/
├── app/
│   ├── api/          # API Route Handlers
│   ├── buy/          # 公開團購頁面
│   ├── dashboard/    # 使用者後台
│   └── admin/        # 管理員後台
├── components/       # 共用元件
└── lib/
    ├── db.ts         # SQLite 資料庫連線
    ├── auth.ts       # JWT 驗證工具
    └── utils.ts      # 共用工具函式
data/
└── group-buy.db      # SQLite 資料庫檔案
public/
└── uploads/          # 上傳圖片存放位置
```

## 資料庫

資料庫位於 `data/group-buy.db`，首次執行時自動初始化，無需額外設定。

**資料表：** `users`、`group_buys`、`options`、`orders`、`order_items`、`password_reset_tokens`

## 部署

可部署至任何支援 Node.js 的環境。若使用 Vercel，請注意 SQLite 檔案需持久化儲存（建議改用 Turso 或其他雲端資料庫）。

詳細部署說明請參考 [Next.js 部署文件](https://nextjs.org/docs/app/building-your-application/deploying)。
