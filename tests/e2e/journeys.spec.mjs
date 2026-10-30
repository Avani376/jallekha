/**
 * JalLekha e2e: the two signature journeys against the production build.
 * Run: node tests/e2e/run.mjs [baseURL]
 * Uses Playwright directly (no test-runner dep) for a compact, readable script.
 * The app is deterministic; test state lives in the browser profile only.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const results = [];
let browser;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function textVisible(page, text, timeout = 8000) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function gotoOverview(page) {
  await page.getByRole("link", { name: "Overview" }).first().click();
  await page.waitForTimeout(700);
}

try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // ---------- 1. Landing ----------
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  check("landing: hero headline", await textVisible(page, "A clearer water balance"));
  check("landing: synthetic-data label", await textVisible(page, "synthetic demonstration data"));
  check("landing: CTA", (await page.getByRole("link", { name: /Try the live demo/i }).count()) >= 1);

  // ---------- 2. Guided demo -> legacy site (Scenario B) ----------
  await page.goto(BASE + "/demo", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Start the guided demo/i }).click();
  await page.waitForURL("**/workspace", { timeout: 8000 });
  await page.waitForTimeout(900);
  check("demo: routes to workspace", true);
  check("scenario B: discrepancy pill", await textVisible(page, "Outside uncertainty"));
  check("scenario B: raw residual +5,000", await textVisible(page, "+5,000"));
  check("scenario B: bounds [4,300, 5,700]", await textVisible(page, "[4,300, 5,700]"));
  check("scenario B: duplicate finding", await textVisible(page, "Possible duplicate delivery record"));

  // ---------- 3. Journey A: void the duplicate ----------
  await page.getByRole("link", { name: "Cases" }).first().click();
  await page.waitForTimeout(500);
  const caseLink = page.getByRole("link", { name: /Possible duplicate delivery record/i }).first();
  check("cases: duplicate case listed", (await caseLink.count()) === 1);
  await caseLink.click();
  await page.waitForTimeout(500);
  check("case detail: flagged row linked", await textVisible(page, "dlv-B2-dup"));

  // Void the duplicate from the ledger record detail.
  await page.getByRole("link", { name: "Deliveries" }).first().click();
  await page.waitForTimeout(500);
  const dupRow = page.locator("tr", { hasText: "Duplicate candidate" }).first();
  await dupRow.getByRole("button", { name: /Details/i }).click();
  await page.locator("textarea").first().fill("Duplicate of receipt R-101 confirmed against the physical receipt; same load entered twice from the legacy ledger.");
  await page.getByRole("button", { name: /Void with reason/i }).click();
  await page.waitForTimeout(1000); // recompute

  check("after void: voided row kept in history", await textVisible(page, "Voided — kept in history"));
  await gotoOverview(page);
  check("after void: within uncertainty", await textVisible(page, "Within stated measurement uncertainty"));
  check("after void: residual R = 0 L", await textVisible(page, "R = 0 L"));
  check("after void: interval [-600, 600]", await textVisible(page, "[-600, 600]"));

  // ---------- 4. Journey C: missing closing reading ----------
  await page.getByLabel("Select site").selectOption({ label: "Lake View Hostel (Synthetic)" });
  await gotoOverview(page);
  check("scenario C: incomplete status", await textVisible(page, "Incomplete data"));
  check("scenario C: no residual asserted", await textVisible(page, "residual unavailable"));
  check("scenario C: missing field named", await textVisible(page, "Closing stock reading at period end"));

  await page.getByRole("link", { name: "Cases" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Closing stock reading missing/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Record & recompute/i }).click();
  await page.waitForTimeout(1000);
  await gotoOverview(page);
  check("scenario C after reading: complete balance", await textVisible(page, "Within stated measurement uncertainty"));
  await page.getByRole("link", { name: "Cases" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Closing stock reading missing/i }).first().click();
  await page.waitForTimeout(500);
  await page.locator("#res-exp").fill("Closing dipstick reading taken and recorded at the boundary instant; balance recomputed and consistent.");
  await page.locator("#res-outcome").selectOption("missing-reading-supplied");
  await page.getByRole("button", { name: /Resolve case/i }).click();
  await page.waitForTimeout(600);
  check("scenario C: case resolved with outcome", await textVisible(page, "missing-reading-supplied"));

  // ---------- 5. Scenario D: unexplained residual ----------
  await page.getByLabel("Select site").selectOption({ label: "Hillcrest Academy (Synthetic)" });
  await gotoOverview(page);
  check("scenario D: residual +2,000", await textVisible(page, "+2,000"));
  check("scenario D: bounds [1,400, 2,600]", await textVisible(page, "[1,400, 2,600]"));
  check("scenario D: cause-not-determined wording", await textVisible(page, "not proof of theft"));

  // ---------- 6. Import preview + idempotent replay (Sunrise) ----------
  await page.getByLabel("Select site").selectOption({ label: "Sunrise Campus (Synthetic)" });
  await page.getByRole("link", { name: "Deliveries" }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Import CSV/i }).click();
  await page.getByRole("button", { name: /Load sample file/i }).click();
  await page.getByRole("button", { name: /Validate & preview/i }).click();
  await page.waitForTimeout(500);
  // Row 1 duplicates the manual R-101 record; 3 rows are valid.
  check("import: 3 valid rows", await textVisible(page, "3 valid"));
  check("import: exact duplicate flagged", await textVisible(page, "1 exact duplicate"));
  await page.getByRole("button", { name: /Confirm import of 3 rows/i }).click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Import CSV/i }).click();
  await page.getByRole("button", { name: /Load sample file/i }).click();
  await page.getByRole("button", { name: /Validate & preview/i }).click();
  await page.waitForTimeout(500);
  check("import: replay fully idempotent", await textVisible(page, "4 exact duplicate"));
  await page.getByRole("button", { name: /Close dialog/i }).click();

  // ---------- 7. Refresh persistence (localStorage) ----------
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByLabel("Select site").selectOption({ label: "Sunrise Campus — Legacy Ledger Week (Synthetic)" });
  await page.getByRole("link", { name: "Deliveries" }).first().click();
  await page.waitForTimeout(800);
  check("refresh: voided correction survives", await textVisible(page, "Voided — kept in history"));

  // ---------- 7b. Dashboard + new features ----------
  await page.getByLabel("Select site").selectOption({ label: "Riverside Apartments — 14-Day History (Synthetic)" });
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await page.waitForTimeout(1000);
  check("dashboard: waterfall card", await textVisible(page, "Water balance — waterfall"));
  check("dashboard: cumulative trend", await textVisible(page, "Cumulative meter — trend"));
  check("dashboard: runs trend", await textVisible(page, "Residual across saved runs"));
  check("dashboard: KPI quality tile", await textVisible(page, "Data quality"));
  await page.getByRole("link", { name: "Readings" }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Import readings CSV/i }).click();
  await page.waitForTimeout(600);
  check("readings import: type tabs", await textVisible(page, "Tank stock readings"));
  await page.getByRole("button", { name: /Close dialog/i }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.waitForTimeout(600);
  check("settings: AI section", await textVisible(page, "AI assistance"));

  // ---------- 8. Console ----------
  check("no console/page errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

} catch (e) {
  check("e2e script completed without exception", false, String(e).slice(0, 300));
} finally {
  await browser?.close();
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
