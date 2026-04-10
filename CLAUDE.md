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

Initialize or reset the Turso database schema (requires env vars):
```bash
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/setup-db.mjs
```

Clear the Next.js cache when encountering stale build issues (e.g. after abnormal shutdown):
```bash
rm -rf .next && npm run dev        # bash / Git Bash
rmdir /s /q .next && npm run dev   # Windows cmd (stop node.exe first)
```

## Architecture Overview

**Stack:** Next.js 16 App Router · `@libsql/client` (Turso cloud SQLite) · JWT auth · Tailwind CSS 4 · TypeScript (strict)  
**Deployment:** Vercel (serverless) + Turso (database) + Vercel Blob (image uploads)

### Database (`src/lib/db.ts`)
- `getDb()` returns a singleton `@libsql/client` Client connected to Turso via `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` env vars
- All queries are async: `await db.execute({ sql, args })` — results in `.rows`, last insert id in `.lastInsertRowid`
- Schema is **not** auto-migrated; to reset, run `scripts/setup-db.mjs`
- **Tables:** `users`, `group_buys`, `options`, `orders`, `order_items`, `password_reset_tokens`
- Default admin: `admin` / `admin1234` (seeded by setup-db.mjs)

### Authentication (`src/lib/auth.ts`)
- JWT stored in httpOnly cookie `gb_token`, 7-day expiry, `secure: true` in production
- Two helper patterns — use the right one per context:
  - **Server Components & Route Handlers using `cookies()`:** `await getCurrentUser()` (async)
  - **Route Handlers with a `NextRequest` arg:** `getUserFromRequest(req)` (sync) — reads from `req.cookies`
- Roles: `user` (default), `admin`
- **Cookie setting:** Always use `NextResponse.cookies.set()` — never `(await cookies()).set()` from `next/headers` in Route Handlers, as the latter does not reliably emit `Set-Cookie` on Vercel production

### Route Protection (`src/proxy.ts`)
- Next.js 16 uses `proxy.ts` (not `middleware.ts`) as the proxy entry point — do **not** create `src/middleware.ts`
- Exports `proxy(request)` function and `config` — Next.js picks these up automatically
- `/dashboard/*` requires a valid JWT; redirects to `/login` if missing/invalid
- `/admin/*` additionally requires `role === 'admin'`; non-admin redirects to `/`

### URL Routing for Group Buys
- Group buys have an integer `id` (DB PK) and a random 8-char base-36 `slug` (public-facing)
- All public URLs use the slug: `/buy/[slug]`, `/dashboard/[slug]`, `/dashboard/[slug]/edit`
- All API route handlers accept **either** slug or integer ID: `WHERE slug = ? OR id = ?` with `parseInt(id, 10) || -1` fallback
- Slugs generated via `while` loop (not `do…while`) — TypeScript strict definite-assignment requirement

### API Route Rules
- Every handler **must** be wrapped in try-catch returning `Response.json({ error: '...' }, { status: 500 })`
- Only HTTP-verb exports (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) in route files — extra named exports break Next.js routing
- `params` is a **Promise** in Next.js 16 → always `await params` before destructuring

### `'use client'` Function Declaration Order
In client components, `const` helper functions called inside a `useEffect` **must be declared before** that `useEffect` — `const` is not hoisted. Declare the function first, then the effect that calls it. Violating this triggers an ESLint error (`no-use-before-define`).

### Client-Side Data Fetching
Pages are mostly `'use client'` with `useEffect` + `fetch`. Use `safeJson` to handle non-JSON error bodies:
```ts
const safeJson = (r: Response) => r.ok ? r.json() : r.text().then(() => ({}));
```
Auth guard pattern on protected pages:
```ts
useEffect(() => {
  fetch('/api/auth/me').then(r => r.json()).then(d => {
    if (!d.user) router.push('/login');
  });
}, [router]);
```

### Image URL Field (`image_url`)
The `image_url` column in `group_buys` and `options` stores either a plain URL string **or** a JSON-encoded array of URLs. Always use `parseImages(imageUrl)` from `src/lib/utils.ts` to decode — returns `string[]` in both cases.

### File Uploads
- `/api/upload` uses `@vercel/blob` (`put(filename, file, { access: 'public' })`) — requires `BLOB_READ_WRITE_TOKEN` env var
- Returns `{ url }` pointing to Vercel Blob CDN

### Group Buy Deletion
There are **two** delete paths with different behaviour:
- `DELETE /api/group-buys/[id]` (organizer or admin) — manually cascades `order_items` → `orders` → `options` → `group_buys`, then calls `del()` on all collected Vercel Blob image URLs (best-effort)
- `DELETE /api/admin/group-buys/[id]` (admin panel shortcut) — issues a single `DELETE FROM group_buys` and relies on DB-level `ON DELETE CASCADE`; **does not** delete Vercel Blob images

### Export Endpoints
Two overlapping XLSX export routes exist (minor format differences):
- `GET /api/group-buys/[id]/excel` — uses `getUserFromRequest(req)`; sheets: "參加名單" + "統計摘要"
- `GET /api/group-buys/[id]/export` — uses `getCurrentUser()`; sheets: "訂單名單" + "統計"

### Order Management API
Organizer-facing endpoints under `/api/group-buys/[id]/orders/`:
- `GET` — list all orders for a group buy (organizer or admin only)
- `POST` — submit a new order (public; associates `user_id` from JWT if logged in)
- `PATCH /[orderId]` — mark order paid/unpaid (`{ is_paid }`)
- `DELETE /[orderId]` — delete an order

Duplicate payment route: `PUT /api/orders/[id]/payment` does the same as the `PATCH` above with slightly different auth lookup — prefer the nested route for new code.

### My Orders (`/my-orders`, `/api/my-orders`)
Logged-in users can view and manage their own past orders:
- `GET /api/my-orders` — returns all orders where `user_id = current user`, joined with group buy info and items
- `PATCH /api/my-orders/[orderId]` — edit `participant_name` or replace items; blocked if group buy is locked or expired
- `DELETE /api/my-orders/[orderId]` — cancel own order; blocked if locked or expired

### Utility Functions (`src/lib/utils.ts`)
| Function | Purpose |
|----------|---------|
| `formatDate(str)` | Formats `YYYY-MM-DD` or `YYYY-MM-DDTHH:00` to zh-TW string with hour |
| `getDaysLeft(endDate)` | Respects the `T` hour component for accurate deadline |
| `isExpired(endDate)` | Returns `true` if deadline has passed |
| `getLabel(index)` | Returns `A`, `B`, `C`… for option display labels |
| `parseImages(imageUrl)` | Decodes plain URL or JSON array → `string[]` |
| `randomFakeName()` | Returns a random zh-TW placeholder name (for testing/demo) |

### Profile / Account (`/api/auth/profile`, `/dashboard/profile`)
- `PATCH /api/auth/profile` — updates `display_name` and optionally `password` (requires `current_password`); re-issues JWT on success
- Profile page exposes only display name and password change — email field is not in the UI
- After a successful update the cookie is refreshed so Navbar reflects the new display name immediately
- Registration does **not** collect email

### Password Reset
Two flows exist:
1. **Self-service via email** (`/forgot-password`, `/reset-password`) — requires the `email` column to be populated on the user record; tokens expire after 1 hour; `sendResetEmail` in `src/lib/email.ts` sends SMTP mail or logs the link to console if `EMAIL_USER` is unset
2. **Admin reset** (`PATCH /api/admin/users/[id]`) — no email required; admin sets the password directly

### Admin (`/admin`, `/api/admin/`)
- `GET /api/admin/users` — list all users
- `PATCH /api/admin/users/[id]` — resets any user's password (no current-password required)
- `DELETE /api/admin/users/[id]` — deletes user; cannot delete self; manually nullifies `orders.user_id`, deletes owned group buys (DB cascade handles options/orders/order_items), then deletes the user
- `GET /api/admin/group-buys` — list all group buys
- `DELETE /api/admin/group-buys/[id]` — deletes via DB cascade only (no Vercel Blob cleanup)

### Components (`src/components/`)
| Component | Purpose |
|-----------|---------|
| `Navbar.tsx` | Global nav; fetches `/api/auth/me`; logged-in username is a `Link` to `/dashboard/profile` |
| `GlassCard.tsx` | Reusable glass-morphism card wrapper |
| `GroupBuyForm.tsx` | Full create/edit form — image upload, per-option images, date+hour selector |
| `ImageLightbox.tsx` | Fullscreen image overlay; closes on backdrop click, × button, or Escape key |

### Styling
- Tailwind CSS 4 with glass-morphism theme (`bg-white/10 backdrop-blur-md`)
- Custom utility classes in `globals.css`: `.glass-input`, `.btn-primary`, `.btn-secondary`
- Native `<select>` uses `appearance: none` + custom SVG chevron; `<option>` elements need `background-color: #1e1b4b` for dark theme

### Server-Only Packages
`bcryptjs` is listed under `serverExternalPackages` in `next.config.ts` — never import it in `'use client'` files. `@libsql/client` is safe to import server-side only.

### Date Handling
- End dates stored as `YYYY-MM-DDTHH:00` (ISO with hour, no minutes)
- `formatDate()` detects the `T` separator and displays the hour in Traditional Chinese
- `getDaysLeft()` respects the hour component for accurate deadline calculation

### Environment Variables
| Variable | Purpose |
|----------|---------|
| `TURSO_DATABASE_URL` | libsql:// URL — must not have trailing newline |
| `TURSO_AUTH_TOKEN` | Turso auth token — must not have trailing newline |
| `JWT_SECRET` | JWT signing secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access token (auto-injected when Blob store linked) |
| `NEXT_PUBLIC_BASE_URL` | Full origin URL (used in password reset email links) |
| `EMAIL_HOST/PORT/USER/PASS` | SMTP config (optional); if `EMAIL_USER` is unset, reset links log to console |
