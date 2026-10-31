/**
 * Preflight privacy gate: fails (exit 1) if forbidden private paths, known
 * secret files, or repository-policy files are tracked by git. Run before
 * pushing. This script is COMMITTED on purpose: `.gitignore` is intentionally
 * untracked (team policy), so contributors' local Git clients do not inherit
 * exclusion rules automatically — this gate is the repository-level safeguard
 * that catches anything private before it reaches the remote.
 * Usage: node scripts/preflight-check.mjs
 */
import { execSync } from "node:child_process";

const FORBIDDEN = [
  // Internal project knowledge — must never be published.
  /^Build_?[Pp]rompt(\/|$)/,
  // Private context and submission material.
  /\.private-context\//,
  /\.private-submission\//,
  /JALLEKHA_[A-Z_]*PRIVATE/i,
  /JALLEKHA_.*WORKING/i,
  // Environment files and credentials (real values never enter the repo;
  // operators configure their own local .env from the README instructions).
  /^\.env($|\.)/, // any .env* — including .env.example (see README)
  /\.pem$/,
  /\.key$/,
  /SubmissionContentHackathon/,
  /Arya_Sid_EventContextt/,
  // .gitignore is intentionally untracked (team policy): the committed
  // preflight gate above is the safeguard that travels with the repository.
  /^\.gitignore$/,
];

let tracked = "";
try {
  tracked = execSync("git ls-files", { encoding: "utf8", cwd: process.cwd() });
} catch {
  console.error("preflight: not a git repository (or git unavailable)");
  process.exit(1);
}

const problems = [];
for (const line of tracked.split("\n")) {
  const f = line.trim();
  if (!f) continue;
  for (const re of FORBIDDEN) {
    if (re.test(f)) problems.push(f);
  }
}

if (problems.length > 0) {
  console.error("preflight FAILED: forbidden files are tracked:");
  for (const p of problems) console.error("  -", p);
  console.error("Untrack them (git rm --cached) BEFORE pushing.");
  process.exit(1);
}
console.log(`preflight OK: ${tracked.split("\n").filter(Boolean).length} tracked files, no forbidden paths`);
