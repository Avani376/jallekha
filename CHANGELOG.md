# Changelog

All notable changes to JalLekha are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions are
[SemVer](https://semver.org/).

## [1.3.1] - 2026-10-31

Submission deck rebuilt strictly on the official challenge template.

### Changed
- `pitch-deck/SevaForge_JalLekha_Pitch_Deck.pptx` (+ matching PDF) is now
  built **on the official Seva First Innovation Challenge template**
  (10 x 5.62 in, Nirmala UI, navy/orange system, mandated slide order and
  footers) — replacing the previous custom-branded 13.33 x 7.5 in deck.
  All submission content is preserved and re-slotted: problem cards with
  the headline stat, solution brief with the three-step how-it-works and
  the existing-vs-ours comparison table, feasibility stage tracker marked
  at Working Prototype, impact stats (1 pilot campus / 4 instrumented
  metrics / 3 sustainability domains — no invented numbers), the
  four-member team roster and the support checklist.
- `pitch-deck/build_template_deck.py` replaces the retired pptxgenjs
  `build.js`: a reproducible python-pptx fill-in from the official
  template (`template_source.pptx` committed unmodified as the build
  input). Verified: zero leftover placeholders, all image relations
  resolve, render-checked slide by slide.

## [1.3.0] - 2026-10-31

README showcase release: animated artwork, live product tour, deep
feature documentation.

### Added
- Seven hand-crafted **animated SVG artworks** (CSS keyframes, honored by
  GitHub's image pipeline, all respecting `prefers-reduced-motion`): the
  deep-water hero banner, the signature "residual slides into the
  uncertainty band" story, the three-findings comparison, a sloshing
  tank cutaway, the record→resolve flow pipeline, the SevaForge team
  banner with sustainability ring, and the closing "solvers" loop.
- **Live product tour** — eight retina screenshots of the real running
  app (demo, overview, ledger, readings, reconciliation, cases,
  dashboard, reports), each captioned and linked to the live deployment.
- README rewritten as a full submission document: the problem and why the
  three finding types matter, the equation and uncertainty rules, a tab
  by tab tour, the four signature scenarios, a feature deep-dive
  (engine, uncertainty, duplicates, CSV import, cases + audit, real-data
  mode, optional provider-neutral AI, accessibility, honest status),
  architecture, quality gates, configuration and roadmap.

## [1.2.0] - 2026-10-31

Narrated video walkthrough for the competition submission.

### Added
- `docs/media/jallekha-walkthrough.mp4` — a 6-minute narrated product
  walkthrough (720p, 14.6 MB): the problem of scattered water records, the
  reconciliation approach with conservative uncertainty, all four signature
  scenarios performed live on the demo (including the duplicate-void journey
  with run history), the verification-case workflow, CSV import with
  idempotent replay, dashboard charts, reports, honest limits, and the
  SevaForge team credits.

## [1.1.2] - 2026-10-31

Repository privacy refinement and provider-neutral AI configuration.

### Changed
- **Internal project knowledge removed from the repository.** The
  engineering handoff pack is no longer published on GitHub — it is a
  local-only team resource shared through the team's private channel, and
  the tracked preflight gate now blocks it (plus `.env*` including
  templates, and `.gitignore`, which is intentionally untracked) from ever
  being committed again.
- `.gitignore` is intentionally untracked (local copies preserved). The
  committed safeguard is `npm run preflight`, which every contributor runs
  before pushing; README documents the local `git info/exclude` block.

### Added
- **Provider-neutral AI configuration** (`src/lib/ai/providers.ts`): a
  server-side resolver with a declared provider registry — OpenAI,
  Anthropic Claude, Z.ai, and any custom OpenAI-compatible endpoint —
  14 unit tests included. `AI_MODE=disabled` is the default and reads no
  key material; `live` mode requires a provider, a key, and an operator
  -verified model, with clear actionable errors. No hardcoded model
  identifiers; endpoints for non-OpenAI providers must be verified and set
  explicitly.
- In-app AI defaults are now provider-neutral (operators choose endpoint,
  key and model; nothing is pre-filled from a specific vendor).

### Removed
- `.env.example` from the repository; operators create a local `.env`
  from the README instructions (AI variables per provider; keys never
  committed, never browser-exposed).

## [1.1.1] - 2026-10-31

Full-app QA pass (automated gates + guided GUI exploratory testing of
every screen) and one visual bug fix.

### Fixed
- **Highlighted demo card was unreadable** (white text on a white card):
  `Card` baked `bg-white` into its base classes, so a caller-supplied
  background (`bg-aqua/[0.06]`) silently lost the Tailwind CSS-order fight.
  `Card` now takes a `tone` prop — `"paper"` (default, unchanged) or
  `"custom"` (no base colors) — and the three dark-surface call sites
  (demo step cards, demo AI-status card, workspace dark tank card) use it.
- Verified end to end: reconciliation journey (void → superseding run),
  case lifecycle (evidence, assignee, transitions, resolution), dual
  workspace isolation, onboarding validation, settings, reduce-motion
  round-trip; domain 41/41, e2e 33/33, lint 0/0, typecheck 0 errors.

## [1.1.0] - 2026-10-31

Landing-page water experience and the SevaForge team stage; contributor
hygiene pass.

### Added
- Landing-page water experience, all CSS-only ambient motion: a layered
  swell surface with caustic shimmer, rising bubbles and drifting droplets
  in the hero, sonar ripple rings behind the receipt-to-ledger panel, an
  animated squiggle under section headings, and a flow ribbon whose
  droplets travel the Record → Reconcile → Investigate → Resolve pipeline.
  Every loop settles in a clean static state under the reduce-motion
  control; reveals are forced visible for print and no-JS readers.
- SevaForge team stage on the landing page: the team mark on deep water
  (rotating conic halo, orbiting droplets, pulsing glow, shine sweep masked
  to the artwork) above the four-member roster — Arya Jannawar (team lead),
  Avani Jannawar, Siddhant Santosh Pardeshi, Vijay Sahu — with roles and
  focus areas. Mark served from `public/brand/sevaforge-mark.png`.
- `typecheck` now runs `next typegen` first, so a fresh clone no longer
  fails on generated route types before the first build.

### Fixed
- Tank cutaway value label was invisible on dark surfaces (landing hero);
  captions now take an `onDark` tone.
- Three lint warnings (unused variable/imports) that had slipped past the
  0-warnings gate; lint is back to 0 errors / 0 warnings.
- Stale test counts on the landing page and in the README (38 → 41 domain
  tests, 27 → 33 e2e checks).

### Removed
- Stray PowerPoint lock file (`~$…Pitch_Deck.pptx`) from `pitch-deck/`;
  Office lock files are now gitignored.

## [1.0.1] - 2026-10-31

Team handoff: onboarding context in the repository, roster of four, and
the competition pitch deck.

### Added
- `Build_Prompt/` engineering handoff pack committed to the repository:
  product context, current state, toolchain setup, architecture rules,
  prioritized backlog, contributing rules and the decision log — the
  onboarding path for every teammate, kept current with the code.
- 6-slide SevaForge pitch deck under `pitch-deck/`: editable PPTX with
  presenter notes, matching PDF export, build script and captured
  product screenshots.

### Changed
- Team roster is four members — Arya Jannawar (team lead), Avani
  Jannawar, Siddhant Santosh Pardeshi, Vijay Sahu — across the landing
  page, demo footer, README and the deck.
- The privacy gate allowlists the `Build_Prompt/` pack (team
  documentation, nothing private in it); private context, submission
  drafts and raw working prompts remain blocked as before.

## [1.0.0] - 2026-10-31

First public prototype. Deterministic water-accounting engine, dual
workspace modes, and an operator-facing review workflow.

### Added
- Reconciliation engine (`recon-v1.0`): `R = O + D − U − C` with
  conservative summed uncertainty bounds, exact boundary instants, and
  status precedence (invalid → incomplete → provisional → within
  uncertainty → discrepancy).
- Signature scenarios A–D as versioned fixtures with expected outcomes:
  baseline (0 L in [−600, +600]), duplicate receipt (+5,000 L in
  [4,300, 5,700] → 0 L after a reviewed void), missing closing reading
  (no residual asserted), and an unexplained residual (+2,000 L in
  [1,400, 2,600], cause left open).
- Duplicate-candidate detection (exact + fuzzy) that never auto-deletes;
  reviewer voids with a documented reason; corrections preserve history
  and supersede runs.
- Investigation workflow: ownership, guarded status transitions, evidence
  timeline, resolution with outcome + reviewer.
- CSV import for deliveries, tank stock readings and cumulative meter
  readings — validate-before-commit preview, explicit date-format
  selection, exact unit conversion, idempotent replays, conflicting
  same-instant values blocked.
- Dual workspace modes: seeded synthetic demo and an empty real-data
  workspace ("My data") with onboarding, per-site reconciliation periods,
  and JSON workspace export/import.
- Analytics dashboard with an authored SVG chart kit: balance waterfall,
  cumulative meter trend, deliveries by day, findings donut,
  measurement-quality mix, residual band across runs, tank gauge.
- Bundu, the reactive droplet mascot: contextual next-best-action tips
  and event reactions; fully stilled by reduce-motion.
- Optional AI assistance (bring your own key): grounded Q&A chat over the
  workspace records, finding explanation, and note→fields drafting — all
  schema-validated with a visible rule-based fallback. The deterministic
  engine never depends on AI.
- Accessible operator chrome: grouped navigation, persistent context
  strip, inline SVG icon set, printable documented review, safe CSV and
  JSON exports, audit trail on every mutation.

### Security
- No secrets in the repository; API keys are operator-supplied, stored
  browser-locally, and sent only to the provider the operator configures.
- Privacy gate (`npm run preflight`) blocks private material from being
  tracked.
