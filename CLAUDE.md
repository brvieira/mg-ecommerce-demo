# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A demo e-commerce catalog app whose sole purpose is to showcase MongoDB Atlas capabilities: Atlas Search (text), Atlas Vector Search (semantic), Hybrid Search (RRF fusion of both), and flexible document schema. As implemented today (v1) it is query-only — there is no auth, cart, checkout, orders, or admin. **This is changing under the v2 spec below (product create/edit, purchase simulation with an `orders` collection) — don't take "query-only" as a hard constraint once v2 work is in progress.**

Read `GENERAL.md` (original spec) and `AGENTS.md` (agent guidelines) before making product-scope decisions — both describe the intended v1 feature set. **`docs/DIVERGENCES.md` records where this implementation deliberately departs from those two documents** (most importantly: embeddings use OpenAI, not Voyage AI, as originally specified) — check it before "fixing" something that looks like a mismatch with the spec.

**`docs/specs/SPEC_V2.md`** is a confirmed but **not-yet-implemented** v2 spec: main search becomes Atlas-Search-only (mode selector and hybrid/vector search removed from `/search`), Vector Search becomes exclusive to a new "similar products" feature on the product detail page, plus product create/edit (with free-form `attributes` editing), a raw-JSON debug panel, dynamic per-search facet counts, and a purchase simulation (`orders` collection with real stock decrement). Ambiguities in it were resolved and are marked **[DECIDIDO]** inline; the resolutions are also logged in `docs/DIVERGENCES.md`. Until it's implemented, the rest of this file (search modes, `DiagnosticPanel`, filters-fetched-once-on-mount) describes the **current (v1) architecture**, not the v2 target state — don't assume v2 behavior is live without checking the code.

## Repository layout

Three independent Node projects, each with its own `package.json`/`node_modules` (no workspace tooling):

```
backend/   Express API, native MongoDB driver (no Mongoose)
frontend/  React + Vite + MUI
seed/      One-off script: generates embeddings, loads seed/products.json into Atlas, creates indexes
```

MongoDB Atlas is remote-only — there is no database container. All three projects read config from a single `.env` at the repo root (see `.env.example`).

## Commands

Run each from its own subdirectory (`cd backend`, `cd frontend`, `cd seed`).

```bash
# backend
npm install
npm run dev        # node --watch app.js
npm start           # node app.js

# frontend
npm install
npm run dev         # vite dev server (proxies /api -> localhost:5000, see vite.config.js)
npm run build        # production build to frontend/dist
npm run preview

# seed (run once after .env is populated, or whenever seed data changes)
cd seed && npm install && npm run seed
```

Full stack via Docker (production build, frontend served by nginx which proxies `/api` to the backend container):

```bash
docker compose up
```

There is no test suite in this repo yet. Validate changes by running the affected service directly (`npm run dev`) and exercising the endpoints/UI manually.

## Architecture

### Data model

Single collection: `products`. Every product is one document with a name/description/brand/categories, a free-form `attributes` object (keys vary by category — deliberately, to demonstrate schema flexibility, e.g. apparel categories have `material`/`genero`, footwear categories have `material`/`tipoSola`), a top-level `embedding` vector, and a `skus[]` array where each SKU carries its own `color`, `size`, `price`, `inventory`, `gtin`. Size is a per-SKU variant (like color), not a product-level attribute — a product's available sizes are whatever its `skus[]` entries carry. Products can have multiple SKUs with different prices — the UI always shows the **minimum** SKU price as "a partir de R$X" (see `priceFrom` computed via `$min: "$skus.price"` in every repository query, not stored).

### Backend layers

`routes/ → controllers/ → services/ → repositories/`. Only `repositories/productsRepository.js` talks to the MongoDB driver directly. `backend/config/searchIndexes.js` is the single source of truth for both Atlas Search and Atlas Vector Search index definitions — it's imported both by `seed.js` (to create the indexes) and can be used as documentation of what must exist in Atlas. If you change what's filterable/searchable, update it there, not ad hoc in a query.

### Search modes (`GET /api/search?mode=text|vector|hybrid`)

- `text` — `$search` compound query (`must` on name/description/brand.name/categories.name) + `compound.filter` for category/brand/color/price. Total count comes from a parallel `$searchMeta` call (there's no cheap way to get an exact count otherwise).
- `vector` — embeds the query via `embeddingService.embedQuery`, then `$vectorSearch` with a native MQL `filter`. Because `$vectorSearch` has no `$searchMeta` equivalent, `productsRepository.searchVector` over-fetches up to `CANDIDATE_POOL_SIZE` (200) matching documents and paginates in memory — this only gives an exact total because the demo catalog is capped at ~100 products; it would need rethinking at real scale.
- `hybrid` — runs `text` and `vector` pools (top ~100 each) in parallel and merges them with Reciprocal Rank Fusion computed in `searchService.hybridSearch` (`RRF_K = 60`), not via Atlas's native `$rankFusion` stage (kept deliberately independent of that feature's availability across tiers). Each merged item carries `origin: 'text' | 'vector' | 'both'` plus whichever of `textScore`/`vectorScore` it has.

All three modes apply category/brand/color/price filters as **pre-filters inside** `$search`/`$vectorSearch` — never as a `$match` stage tacked on after. Color filtering matches if *any* SKU has the requested color (products aren't excluded just because one variant doesn't match).

`embeddingService.js` wraps OpenAI's embeddings endpoint directly via `fetch` (no SDK). It's imported by both `backend/services/searchService.js` (query-time) and `seed/seed.js` (product-time) — keep it provider-agnostic in one place rather than duplicating the HTTP call.

### Seed script (`seed/seed.js`)

Reads `seed/products.json` (100 hand-authored products, no embeddings, referencing image keys — catalog scope is deliberately narrowed to apparel and footwear only, across 6 categories: Vestuário — camisetas, calças, camisas — and Calçados — tênis, sapatos, sandálias; see `docs/DIVERGENCES.md`) and `seed/images.json` (a curated map of stable Unsplash URLs per category — verified to return HTTP 200, reused across a product's images and all of its SKUs). It resolves image refs, generates embeddings in batches of 100 with retry/backoff on 429s, `deleteMany({})` + `insertMany()`s the `products` collection (fully idempotent reseed), then creates the common MQL indexes and the two Atlas indexes from `backend/config/searchIndexes.js` via the native driver's `createSearchIndex`, polling `listSearchIndexes()` until `queryable: true`. If index creation fails (permissions/tier), it prints the exact JSON needed to create the index manually in the Atlas UI.

It then also `deleteMany({})` + batch-`insertMany()`s ~20k synthetic historical orders into the `orders` collection, dated over the trailing 90 days. Both the product chosen and the day are drawn from weighted random distributions (Pareto-ish product popularity, weekend/growth-trend/random-spike day weights, business-hours-skewed time-of-day) rather than uniformly, so the result looks like a real e-commerce sales curve — long-tail top sellers, uneven daily volume — instead of flat/uniform test data. This does **not** touch `products[].skus[].inventory`: the historical orders are an independent sales-history snapshot, decoupled from the live stock levels that `POST /orders` (real purchase simulation) decrements.

Note the import order in `seed.js`: `dotenv.config()` is called explicitly with a path to the root `.env` (cwd when running `npm run seed` is `seed/`, not the repo root), then `backend/services/embeddingService.js` and `backend/config/searchIndexes.js` are pulled in via dynamic `await import(...)` — this is required so `backend/config/openai.js`'s module-level `process.env` reads happen after dotenv has populated them.

### Frontend state flow

`CatalogContext` (React Context, no Redux) is the single source of truth for `query`, `mode`, `filters`, `page`, and the fetched `items`/`diagnostics`/`filterOptions`. A debounced effect there decides between `GET /products` (no query) and `GET /search` (query present) — components never call the API directly except through `frontend/src/services/*`. Changing `query`/`mode`/`filters` resets `page` to 1. `filterOptions` (brands/categories/colors/price range for the Sidebar) is fetched once on mount from `GET /api/filters`.

The `DiagnosticPanel` and per-card score/origin badges exist specifically to make the search-technology-in-use visible (this is the app's whole reason for existing) — when touching search response shapes, keep `diagnostics.mode/tookMs/total/resultCount` and per-item `origin`/`textScore`/`vectorScore` intact.
