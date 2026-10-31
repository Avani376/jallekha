JALLEKHA - BUILD & HANDOFF PACK
================================
Team SevaForge | prepared 31 October 2026 | committed to the repository

WHAT THIS FOLDER IS
-------------------
The complete engineering context for the JalLekha repository
(https://github.com/Avani376/jallekha). It is committed to the repo on
purpose: clone it and you have the full picture. It exists so any
teammate can continue building, updating and extending the project
without guessing at decisions, conventions or current state.

This pack contains nothing private - no keys, no operator data, no
submission drafts. Private working material (raw prompts, submission
drafts) lives outside the repository and stays untracked by the
preflight privacy gate.

TEAM
----
  Arya Jannawar             team lead - product & reconciliation domain
  Avani Jannawar            engineering & data integrity (repo owner)
  Siddhant Santosh Pardeshi quality & user workflow
  Vijay Sahu                research & validation

HOW TO USE THIS PACK
--------------------
1. Read the files in numbered order. 01-03 give you the "what and why";
   04-06 give you the "how"; 07 explains why things are the way they are.
2. Clone the repo and follow 03_TECH_STACK_SETUP.txt exactly (it lists the
   two verification gates every change must pass).
3. Before your first commit, read 06_CONTRIBUTING_RULES.txt. The project has
   a strict claims policy and a green-CI expectation; both are enforced by
   scripts, not goodwill.
4. When you finish a change: npm run verify, then the e2e command listed in
   03, then commit with the style shown in 06.

FILE INDEX
----------
00_README_FIRST.txt          this file
01_PROJECT_CONTEXT.txt       product, users, problem, non-negotiables
02_CURRENT_STATE.txt         everything that exists today + honest gaps
03_TECH_STACK_SETUP.txt      versions, install, scripts, env, deploy steps
04_ARCHITECTURE_RULES.txt    layer boundaries, engine math, data rules, UI
05_BACKLOG.txt               prioritized work with acceptance criteria
06_CONTRIBUTING_RULES.txt    workflow, commit style, claims policy
07_DECISIONS_LOG.txt         decisions taken and rejected alternatives

THE FIVE RULES THAT OUTRANK EVERYTHING
--------------------------------------
R1. The reconciliation math is sacred. The four signature scenarios have
    exact expected numbers; if your change moves them, your change is wrong.
R2. Never present incomplete data as zero, and never present a discrepancy
    as proof of theft or leakage. This wording is baked into the product.
R3. The engine (src/domain) is pure TypeScript: no React, no storage, no
    network. Keep it that way; it is what makes the 41 tests meaningful.
R4. Every user-visible number traces to a stored record. No invented data,
    no simulated totals, no placeholder statistics anywhere.
R5. npm run verify must be green before any push, and the e2e suite must
    stay at 33/33 or better.

CONTACT
-------
Repo owner: Avani376 (GitHub). Coordination happens in the team chat; the
deployed demo and its hosting account are managed by the repo owner.
Keep this pack current: a change that makes 02 or 03 stale should update
them in the same commit.
