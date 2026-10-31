/**
 * Preflight privacy gate: fails (exit 1) if forbidden private paths or known
 * secret files are tracked by git. Run before pushing. .gitignore alone does
 * not untrack an already-committed file — this checks the tracked list.
 * Usage: node scripts/preflight-check.mjs
 */
import { execSync } from "node:child_process";

const FORBIDDEN = [
  /\.private-context\//,
  /\.private-submission\//,
  /JALLEKHA_[A-Z_]*PRIVATE/i,
  /JALLEKHA_.*WORKING/i,
  // Build_Prompt/ is intentionally tracked: it is the team's engineering
  // handoff pack, committed with nothing private in it. Private working
  // notes and submission drafts at the workspace root stay blocked above.
  /^\.env($|\.)/, // any .env* except .env.example (checked below)
  /\.env\.local/,
  /\.pem$/,
  /\.key$/,
  /SubmissionContentHackathon/,
  /Arya_Sid_EventContextt/,
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
  if (f === ".env.example") continue;
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
