# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

Clear the Next.js cache when encountering stale build issues:
```bash
rd /s /q .next && npm run dev   # Windows
rm -rf .next && npm run dev      # Unix
```

## Architecture Overview

**Stack:** Next.js 16 App Router · better-sqlite3 (SQLite) · JWT auth · Tailwind CSS 4 · TypeScript (strict)

### Database (`src/lib/db.ts`)
- Single SQLite file at `data/group-buy.db`, WAL mode, foreign keys ON
- `getDb()` is a singleton — call it anywhere on the server side
- Schema is auto-initialized on first call; migrations run inline via `PRAGMA table_info()` checks then `ALTER TABLE ADD COLUMN`
- Default admin account created on first run: `admin` / `admin1234`
- **Tables:** `users`, `group_buys`, `options`, `orders`, `order_items`, `password_reset_tokens`

### Authentication (`src/lib/auth.ts`)
- JWT stored in httpOnly cookie named `gb_token`, 7-day expiry
- **Server Components:** use `getCurrentUser()` (async, reads via `cookies()`)
- **API Route Handlers:** use `getUserFromRequest(req)` (sync)
- Roles: `user` (default), `admin`

### URL Routing for Group Buys
- Group buys have both an integer `id` (internal DB PK) and a random 8-char base-36 `slug` (public-facing)
- All public URLs use the slug (e.g., `/buy/[slug]`, `/dashboard/[slug]`)
- All API route handlers accept **either** slug or integer ID: `WHERE slug = ? OR id = ?` with `parseInt(id, 10) || -1` fallback
- Slugs are generated using a `while` loop (not `do…while`) to satisfy TypeScript strict definite-assignment rules

### API Route Rules
- Every route handler **must** be wrapped in try-catch returning `Response.json({ error: '...' }, { status: 500 })` — Next.js returns an empty body on uncaught exceptions, causing `res.json()` to throw on the client
- Only HTTP-verb exports (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) are allowed in route files — extra named exports break Next.js routing
- `params` is a **Promise** in Next.js 16 → always `await params` before destructuring

### Client-Side Data Fetching Pattern
Use `safeJson` to prevent crashes when the API returns a non-JSON error body:
```ts
const safeJson = (r: Response) => r.ok ? r.json() : r.text().then(() => ({}));
```

### Components (`src/components/`)
| Component | Purpose |
|-----------|---------|
| `Navbar.tsx` | Global nav; fetches `/api/auth/me`; shows current user / guest |
| `GlassCard.tsx` | Reusable glass-morphism card wrapper |
| `GroupBuyForm.tsx` | Full create/edit form with image upload, per-option images, date+hour selector |

### Styling
- Tailwind CSS 4 with glass-morphism theme (`bg-white/10 backdrop-blur-md`)
- Custom utility classes in `globals.css`: `.glass-input`, `.btn-primary`, `.btn-secondary`
- Native `<select>` uses `appearance: none` + custom SVG chevron; `option` elements need explicit `background-color: #1e1b4b` for dark theme

### Server-Only Packages
`better-sqlite3` and `bcryptjs` are listed under `serverExternalPackages` in `next.config.ts` — never import them in client components (`'use client'` files).

### Date Handling
- End dates stored as `YYYY-MM-DDTHH:00` (ISO with hour, no minutes)
- `formatDate()` in `utils.ts` detects the `T` separator and displays the hour in Traditional Chinese
- `getDaysLeft()` respects the hour component for accurate deadline calculation

### File Uploads & Email
- Uploads saved to `public/uploads/` via `/api/upload`
- Password reset emails sent via `nodemailer`; in dev, the reset link is logged to the console instead of sent
