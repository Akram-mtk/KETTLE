# KETTLE — Native Local-Only Rewrite

## Context

The original KETTLE (v1, now at `C:\Users\matak\Desktop\New folder\KETTLE old`) is a French-language, single-tenant, no-auth production & sales tracking app for a small manufacturing/sales business: log daily production quantities, record per-customer sales (qty + frozen price), maintain a derived running stock balance, reconcile it against physical counts, and generate/print immutable receipts. It was built as a web app (Fastify + Prisma + SQLite backend, React + Vite PWA frontend) that requires a server process running somewhere (currently a VPS) for the phone to talk to over the network.

The user regrets that shape — running/maintaining a backend just so a phone can use the app — and wants a full remake, same pages and features, but architected to run **entirely on-device**: no backend, no network dependency, works offline in airplane mode. They explicitly chose a **native app via Expo/React Native** over an offline PWA. The rewrite goes into `C:\Users\matak\Desktop\New folder\KETTLE` (the old project was moved aside to `KETTLE old` to make room for it).

The v1 domain logic is compact, already UI/framework-agnostic (lives in `apps/api/src/services/`), and has zero external dependencies (no payments/email/push/cloud) — the only thing v1's "backend" ever did was own a SQLite file and expose it over HTTP. That means the rewrite is mostly a **boundary swap** (HTTP+Prisma → direct on-device SQLite calls), not a redesign of the business rules, which must be preserved exactly:

- `onHand = Σproduction − Σsales + Σadjustments` (always derived, never stored as an absolute)
- Stock counts store a **delta** vs. expected, never overwrite — full audit trail
- Sale prices are frozen per line at sale time, never centralized; qty>0 requires a price
- Receipts are frozen snapshots; a fingerprint check flags them "Désynchronisé" if underlying sales drift after generation; regenerate rebuilds+refreezes; issue is one-way (DRAFT→ISSUED)
- Money = integer centimes, fr-DZ formatting ("DA")
- A "day" is always a `YYYY-MM-DD` string, never a DateTime (avoids UTC timezone bugs)
- Products/customers are soft-archived, never hard-deleted

## Recommended Stack

| Decision | Choice | Reason |
|---|---|---|
| Framework | Expo (managed) + TypeScript | One toolchain for Android/iOS; EAS Build compiles native code so no Android Studio/Xcode needed on Windows to get a real installable APK. |
| Local DB | expo-sqlite + Drizzle ORM (`drizzle-orm/expo-sqlite` + `drizzle-kit`) | Official first-party Expo driver (works in Expo Go, no prebuild needed); Drizzle's typed query builder is the closest DX match to Prisma, minimizing rewrite friction for the ported services. |
| Navigation | expo-router (file-based) | Mirrors v1's route table (`/`, `/ventes`, `/ventes/tableau`, `/stock`, `/recus`, `/recus/:id`, `/plus`, `/plus/produits`, `/plus/clients`) almost 1:1, with built-in tab-navigator support for the 5-tab bottom bar. |
| Styling | NativeWind | Reuses the v1 brand-green Tailwind theme tokens and most `className` strings directly instead of hand-porting every screen to `StyleSheet`. |
| Data/query layer | TanStack Query wrapping local Drizzle calls | v1 pages already use `useQuery`/`useMutation`/`invalidateQueries`; only the `queryFn`/`mutationFn` bodies change (HTTP call → direct async Drizzle call), component logic stays the same. |
| Receipt display | In-app screen only — no PDF/print/share | User explicitly does not want a printing/export feature; the receipt detail screen renders the same frozen line-item table v1 showed, viewed on-device only. |
| Business logic | Verbatim port into a framework-agnostic `packages/shared` services layer, unit-tested with Vitest against `better-sqlite3` | v1's services already have zero HTTP-framework coupling — swapping Prisma calls for Drizzle calls is mechanical and preserves every rule 1:1. |
| Monorepo tooling | npm workspaces (`app`, `packages/shared`) | Only 2 packages now (no `apps/api`); simpler than depending on a global pnpm install. |

**Assumption:** Android-primary target (Windows machine, side-load an APK via EAS Build rather than needing a Mac for iOS). Nothing here is Android-only by design — flag to confirm if iOS is actually the real target.

## Project Structure

```
KETTLE/                             # C:\Users\matak\Desktop\New folder\KETTLE
├── package.json                # npm workspaces: ["app", "packages/shared"]
├── tsconfig.base.json
├── packages/shared/             # UI-agnostic, testable — the ported business logic
│   ├── src/
│   │   ├── days.ts, money.ts, schemas.ts, types.ts   # ported verbatim from v1 packages/shared
│   │   ├── db/schema.ts         # Drizzle schema, 7 tables (below)
│   │   ├── db/client.ts         # driver-agnostic createDb(conn) factory + getDb/setDb injection point
│   │   ├── services/stock.ts    # ported from apps/api/src/services/stock.ts
│   │   ├── services/sales.ts    # ported from apps/api/src/services/sales.ts
│   │   ├── services/receipts.ts # ported from apps/api/src/services/receipts.ts
│   │   ├── services/catalogue.ts # product/customer CRUD+reorder (was route-level in v1)
│   │   └── errors.ts            # ported from apps/api/src/http.ts, minus HTTP status codes
│   └── __tests__/setup.ts, stock.test.ts, sales.test.ts, receipts.test.ts
└── app/                          # the Expo app
    ├── app.json, eas.json, babel.config.js, tailwind.config.js, metro.config.js
    ├── db/database.ts            # opens expo-sqlite, runs Drizzle migrations on boot, calls setDb()
    ├── drizzle/                  # drizzle-kit generated SQL migrations (checked in)
    ├── i18n/fr.ts                # ported verbatim from apps/web/src/i18n/fr.ts
    ├── lib/queryClient.ts, toast.tsx, day-context.tsx
    ├── components/ui.tsx, fields.tsx, DayNav.tsx, Sheet.tsx
    ├── hooks/useProduction.ts, useSales.ts, useStock.ts, useReceipts.ts, useCatalogue.ts
    └── app/                       # expo-router route tree
        ├── _layout.tsx            # QueryClientProvider + DayProvider + ToastProvider (mounted ABOVE tabs)
        └── (tabs)/
            ├── _layout.tsx        # 5-tab bottom navigator
            ├── index.tsx          # "/" Aujourd'hui
            ├── ventes/index.tsx, tableau.tsx, [customerId].tsx
            ├── stock.tsx
            ├── recus/index.tsx, [id].tsx
            └── plus/index.tsx, produits.tsx, clients.tsx
```

Business logic stays UI-agnostic: `packages/shared/src/services/*.ts` never imports React/RN/expo-router — functions take plain args + use a module-level `getDb()`/`setDb()` injection point, swapped to a test DB in `__tests__/setup.ts`. Only `app/hooks/*.ts` touches TanStack Query; only route files under `app/app/**` touch RN components. This mirrors v1's `apps/api/src/services` boundary exactly.

## On-Device Schema (Drizzle, 1:1 from Prisma)

Source of truth: `KETTLE old\apps\api\prisma\schema.prisma`. Target: `packages/shared/src/db/schema.ts`, `sqliteTable` from `drizzle-orm/sqlite-core`. Text `id` (cuid-style, e.g. via nanoid) on every table except `receipts.id`, which stays an autoincrement integer (it doubles as the human-readable receipt number).

- **products** — id, name (unique), active (bool), sortOrder, createdAt
- **customers** — same shape as products
- **productionEntries** — id, day (text), productId (fk), quantity, note?; unique(day, productId); index(day)
- **saleEntries** — id, day (text), productId (fk), customerId (fk), quantity, unitPriceCents; unique(day, productId, customerId); index(day), index(day, customerId)
- **stockAdjustments** — id, day (text), productId (fk), countedQuantity, expectedQuantity, deltaQuantity, reason?, createdAt; index(day), index(productId)
- **receipts** — id (autoincrement = receipt number), day (text), customerId (fk), status ('DRAFT'|'ISSUED'), totalCents, issuedAt?, createdAt; unique(day, customerId); index(day)
- **receiptLines** — id, receiptId (fk cascade), productId (fk), quantity, unitPriceCents, lineTotalCents; index(receiptId)

Non-negotiables carried from v1: `day` columns stay plain `text`, never a date/timestamp type (the #1 regression risk if RN `Date`/`toISOString()` shortcuts leak in); money stays `integer` centimes, never `real`. `active` → `integer({mode:'boolean'})`, timestamps → `integer({mode:'timestamp'})` (Drizzle SQLite handles both transparently). Generate migrations with `drizzle-kit generate`, commit the SQL under `app/drizzle/`, run them via `drizzle-orm/expo-sqlite/migrator` on app boot so a fresh install self-creates its schema.

## Phased Build Order

0. **Copy this plan into the project** — write this document to `KETTLE\PLAN.md` (project root) before any other scaffolding, so the plan travels with the repo.
1. **Scaffold** — npm workspace root + `packages/shared` + `create-expo-app` (expo-router template) in `app/`; install expo-router, nativewind+tailwindcss, drizzle-orm+drizzle-kit, expo-sqlite, better-sqlite3 (dev/test only), @tanstack/react-query, zod, nanoid.
2. **Schema + business logic + tests (no UI)** — port `days.ts`/`money.ts`/`schemas.ts`/`types.ts` verbatim; write `db/schema.ts`; port `errors.ts` then `services/stock.ts`, `sales.ts`, `receipts.ts`, `catalogue.ts` (Prisma calls → Drizzle equivalents, `$transaction([...])` → `db.transaction(async tx => {...})`); port `stock.test.ts` verbatim + new `sales.test.ts`/`receipts.test.ts`. **Exit: `npm test` green, zero UI written.**
3. **DB wiring + nav shell** — `app/db/database.ts` (open expo-sqlite, run migrations, `setDb()`), root `_layout.tsx`, tab `_layout.tsx` (5 tabs from `TabBar.tsx`), stub screens for all 8 routes, port `ui.tsx`/`fields.tsx`/`day-context.tsx`/`toast.tsx`/`fr.ts`. **Exit: app launches on-device, all tabs navigate.**
4. **Aujourd'hui** — `useProduction.ts` + `index.tsx`, validates the DB write/invalidate loop end-to-end (simplest screen first).
5. **Stock** — `useStock.ts` + `stock.tsx`, "Comptage réel" sheet + `recordCount`, adjustment history.
6. **Ventes** — `useSales.ts` + hub/tableau/customer-sheet; tableau (frozen column + horizontal-scroll matrix) is the trickiest RN layout.
7. **Reçus** — `useReceipts.ts` + list/detail screens (in-app view only, no export/print/share).
8. **Catalogue** — `useCatalogue.ts` + `plus/`, `produits.tsx`, `clients.tsx` (shared CRUD component for both).
9. **App identity + install** — `app.json` (name/slug/icon/splash/`android.package`/portrait), `eas.json` profiles, `eas build -p android --profile preview` (or `expo run:android` if Android SDK is set up) for a real installable APK.

Each phase after (2) ends with a quick on-device smoke pass; `packages/shared` tests must stay green throughout.

## Verification

**Unit tests** (`packages/shared`, Vitest, no device needed): port `stock.test.ts` verbatim (running balance, count absorption, correction carried forward not lost, second same-day count measures against the first, refuses no-op count); new `sales.test.ts` (zeroing a line deletes+returns stock, `onHandBefore` adds back own qty, price frozen per day, duplicate/unknown/archived product id rejected, qty-without-price rejected); new `receipts.test.ts` (generate-with-no-sales rejected, fingerprint drift → `outOfSync`, double-issue rejected, regenerate re-freezes `issuedAt`).

**On-device manual pass** (Expo Go first, then a real EAS build install for the final check): all 5 tabs reachable; airplane-mode check with a full app relaunch (proves zero network dependency); enter production, confirm stock updates and survives restart; run a matching and a diverging count, confirm rejection/adjustment-history behavior; enter a sale with no price (rejected) and a valid sale (hub total = tableau matrix cell); generate → issue a receipt, change the underlying sale, confirm "Désynchronisé" appears, regenerate clears it; add/rename/reorder/archive/restore a product and customer, confirm archived items vanish from entry screens but stay visible in historical receipts/sales; switch tabs and confirm the selected day persists (validates `DayProvider` is mounted above the tab navigator); force-close and relaunch, confirm all data persisted; final pass repeated against a standalone EAS-built APK (not Expo Go) as acceptance.

## Critical Reference Files (v1, read-only source for the port — now under `KETTLE old`)

- `KETTLE old\apps\api\prisma\schema.prisma` — schema source of truth (verified above)
- `KETTLE old\apps\api\src\services\{stock,sales,receipts}.ts` — exact algorithms to port (verified `stock.ts` above)
- `KETTLE old\apps\api\src\__tests__\{stock.test.ts,setup.ts}` — test suite/fixture pattern to port
- `KETTLE old\packages\shared\src\{days.ts,money.ts,schemas.ts,types.ts}` — ported verbatim
- `KETTLE old\apps\web\src\{i18n\fr.ts,day.tsx,components\TabBar.tsx,components\Sheet.tsx,App.tsx,index.css}` — source for strings, day-context, tab/nav shell, sheet pattern, brand-color theme
