/**
 * Static-export shim for a Next.js 16.4.3 quirk: `next build` with
 * output:"export" writes router prefetch payloads NESTED, e.g.
 *   workspace/ledger/__next.workspace/ledger/__PAGE__.txt
 * while the client router requests them FLATTENED with dots:
 *   workspace/ledger/__next.workspace.ledger.__PAGE__.txt
 * This script copies each nested __PAGE__.txt next to the route under the
 * flattened name (byte-identical content). Run after the static build.
 */
import { readdirSync, copyFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const OUT = process.argv[2] ?? "out";
let fixed = 0;

/** Recursively find every file named __PAGE__.txt under `dir`. */
function findPageFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) findPageFiles(p, out);
    else if (entry === "__PAGE__.txt") out.push(p);
  }
  return out;
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (!statSync(p).isDirectory()) continue;
    if (entry.startsWith("__next.")) {
      for (const src of findPageFiles(p)) {
        const routeRel = relative(OUT, dir).split(/[/\\]/).join(".");
        const flat = join(dir, `__next.${routeRel}.__PAGE__.txt`);
        if (!existsSync(flat)) {
          copyFileSync(src, flat);
          fixed += 1;
        }
      }
      continue;
    }
    walk(p);
  }
}

if (existsSync(OUT)) {
  walk(OUT);
  console.log(`fix-static-prefetch: wrote ${fixed} flattened prefetch file(s) into ${OUT}`);
} else {
  console.log(`fix-static-prefetch: ${OUT} not found, skipped`);
}
