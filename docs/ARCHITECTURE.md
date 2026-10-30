# Architecture

## Layers

```
src/app/        Next.js App Router pages (landing, /demo, /workspace/*) — client components
src/domain/     PURE TypeScript. No React, no storage, no network. Fully unit-tested.
src/data/       DataAdapter interface; LocalDemoAdapter (localStorage) + InMemoryAdapter;
                seed (fixtures v1); React store via useSyncExternalStore
src/components/ Accessible UI kit + domain-value visualizations (equation, uncertainty band, tank)
fixtures/synthetic/  Versioned scenarios A–D with expected outcomes
tests/          Vitest domain tests; Playwright e2e journeys
scripts/        fix-static-prefetch.mjs (static-export shim)
```

The domain layer is import-free of React/storage so the same engine can later run server-side
(e.g. in route handlers or a Supabase-backed adapter) without change.

## Data adapter

`DataAdapter` (src/data/adapter.ts): `load / save / update / reset / subscribe`. The React store
subscribes via `useSyncExternalStore` (server snapshot = fresh seed; client snapshot = persisted
state), avoiding hydration mismatches and setState-in-effect anti-patterns. A shared backend
(Supabase with RLS + membership checks) would implement the same interface; the UI never
special-cases storage beyond the visible demo disclosure.

## Reconciliation (recon-v1.0)

- Inputs: site, tank, meter, period `[start, end)`; deliveries (posted only counted, voided kept
  in provenance); boundary stock readings; cumulative meter readings at the exact instants.
- Validation first: cross-site joins rejected, quantities validated (no NaN/∞/negative), stock ≤
  capacity, ambiguous duplicate boundary readings blocking, negative meter delta invalid (never
  absolute-valued).
- Status precedence: `invalid` → `incomplete` (no residual; missing fields named) →
  `complete-unknown-bounds` (provisional residual) → `within-uncertainty` → `discrepancy`.
- Bounds: conservative sum of declared per-input uncertainties; meter-delta uncertainty =
  start + end reading bounds. No root-sum-square. Unknown bounds → no interval, labelled.
- Duplicate detection: exact = supplier + receipt + site; fuzzy = supplier + volume within 24 h
  with a receipt missing (explicitly unconfirmed). Candidates never auto-void; flagged rows stay in
  as-recorded totals until a reviewer voids with a reason.
- Runs are immutable; corrections create a new run and mark predecessors `supersededByRunId`.
- Findings carry content-derived stable IDs; actionable findings idempotently open investigations
  (`investigationsForRuns`, shared by seed and store).

## CSV import

RFC4180-style parser (quotes/commas/CRLF) — text is data, never executed. Column aliases with
operator-confirmed mapping, explicit date-format selection (ambiguous slash-dates rejected in ISO
mode), unit normalization (L/kL/m³), row errors surfaced in preview. Natural-key exact duplicates
and fuzzy candidates are staged out; only valid rows post. Idempotency: `stableHash(siteId |
fileHash | row | timestamp | qty | supplier)` keys both the record ID and the batch, so replaying
the same file creates zero new rows. Exported user cells neutralize spreadsheet formula prefixes.

## Static export

`npm run build:static` = `NEXT_STATIC=1 next build` (output: "export", PPR disabled) +
`scripts/fix-static-prefetch.mjs`, which flattens Next 16.4.3's nested prefetch payloads
(`<route>/__next.<seg>/…/__PAGE__.txt`) to the names the router requests
(`<route>/__next.<seg-chain>.__PAGE__.txt`). The deployed demo is this static export; it contains
no secrets, no server routes, and no private files.

## AI slot (disabled)

`AI_MODE=disabled` by default. The intended server-only integration (env: `ZAI_API_KEY`,
`ZAI_MODEL`, `ZAI_BASE_URL`) would offer note-structuring drafts and finding explanations with
schema validation, timeouts, rate limits and a labelled rule-based fallback. No AI code runs in
the current build; explanations shown in-product are generated from the saved run by rules.
