# Changelog

All notable changes to JalLekha are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions are
[SemVer](https://semver.org/).

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
