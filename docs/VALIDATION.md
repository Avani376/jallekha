# Validation log

All results below are **actual executed runs**. Test fixtures are internal technical validation —
not a field pilot and not proof of liters saved.

| Date (IST) | Commit | Environment | Command | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-10-31 | pre-push (see git log) | Windows 11, Node v24.15.0, npm 11.12.1 | `npx vitest run` | **38/38 passed** | Domain: 4 signature scenarios (A/B/C/D exact numbers), duplicate detection (exact/fuzzy/legitimate), units (1 kL = 1,000 L; 1 m³ = 1,000 L), CSV replay idempotency, boundary conventions, meter reset → invalid, capacity overflow → invalid, unknown bounds → provisional, cross-site joins rejected, determinism |
| 2026-10-31 | pre-push | same | `npx tsc --noEmit` | **0 errors** | Strict TS across app + domain |
| 2026-10-31 | pre-push | same | `npm run lint` | **0 errors, 0 warnings** | eslint (next/core-web-vitals + react-hooks) |
| 2026-10-31 | pre-push | same | `npm run build` | **10 routes compiled & prerendered** | Next 16.4.3, Turbopack |
| 2026-10-31 | pre-push | same | `npm run build:static` | **9 static routes exported** | incl. prefetch shim (`scripts/fix-static-prefetch.mjs`) |
| 2026-10-31 | pre-push | Chromium (Playwright 1.64.1) against production static build | `node tests/e2e/journeys.spec.mjs http://127.0.0.1:3000` | **27/27 passed** | Landing; guided demo → workspace; Scenario B numbers (+5,000 / [4,300, 5,700]); void journey → 0 L with history kept; Scenario C incomplete → completed → resolved; Scenario D (+2,000 / [1,400, 2,600]) with cause-not-determined wording; import preview (3 valid + 1 exact duplicate); replay fully idempotent; refresh persistence; **zero console/page errors** |
| 2026-10-31 | deployment 2116272028938739712 | ZCode Sites (static) | `zcode-site deploy` | **live, health 200** | https://jallekha-na41.zai-ai.site |
| 2026-10-31 | UI polish pass (same checks re-run after chrome/icon/nav rework) | same | tsc + lint + vitest + e2e | **all green again** | Nav item renamed ("Delivery ledger" → "Deliveries"); e2e locator updated to match. Deployed as 2116288239096061952. |
| 2026-10-31 | Real-data + AI + dashboard release | same | `npx vitest run` → **41/41** (3 new readings-import tests); `npx tsc --noEmit` 0 errors; lint 0/0; server + static builds green; e2e extended to **33/33** (dashboard charts, readings import modal, AI settings) | **all green** | New: dual workspace modes (demo / real), per-site reconciliation periods, readings CSV import (tank + meter) with conflict blocking, dashboard with authored SVG charts (waterfall bug found in review and fixed: y-scale used the signed sum instead of the peak level), AI assistance (browser-direct, schema-validated, rule-based fallback; no live AI calls in automated tests), workspace JSON export/import. Deployed as 2116299970082004992 and 2116301149889388544 (waterfall fix). |

## Signature fixture expectations (fixtures v1)

| Scenario | Inputs | Expected | Asserted |
| --- | --- | --- | --- |
| A Baseline | O 10,000 ±100 · D 5,000 ±100 · U 4,000 (meter ±100×2) · C 11,000 ±200 | R = 0, bounds [-600, +600], within uncertainty | ✅ |
| B Duplicate (legacy posted) | A + second posted record, same receipt R-101 | R = +5,000, bounds [4,300, 5,700], discrepancy + duplicate candidate | ✅ |
| B after reviewed void | duplicate voided with reason | R = 0, bounds [-600, +600], history retained | ✅ |
| C Missing reading | no closing stock reading | status incomplete, residual null, missingFields = [closingStockReading] | ✅ |
| C after reading | closing 11,000 ±200 recorded | R = 0, bounds [-600, +600] | ✅ |
| D Unexplained | O 10,000 ±100 · D 5,000 ±100 · U 4,000 · C 9,000 ±200 | R = +2,000, bounds [1,400, 2,600], cause NOT determined | ✅ |

## Known limitations (tested scope)

- No live AI calls were made or tested (AI disabled by design in this build).
- No authenticated/shared-backend mode exists to test (browser-local demo only).
- Boundary tolerance is 0 (exact instants); approximate-match behaviour is unimplemented.
- Playwright e2e runs against the static production build; the Next server-mode build was
  compile-verified and spot-checked via the same routes.
- Review-time / detection-quality metrics with human participants: **planned, not run**.
