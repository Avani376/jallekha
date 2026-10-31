/* SevaForge_JalLekha_Pitch_Deck — 6 slides, 13.33x7.5in, pptxgenjs */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const A = (f) => path.join(__dirname, "assets", f);

// ---------- palette (BACKGROUND -> PRIMARY -> ACCENT) ----------
const NAVY = "0B2434";      // dark background (slides 1 & 6)
const NAVY_CARD = "12324A"; // card on dark
const NAVY_LINE = "1E4258"; // hairline on dark
const INK = "0E2A3A";       // text on light
const TEAL = "0E9488";      // primary brand teal (readable on white)
const AQUA = "2FD6C4";      // bright aqua accent (on dark)
const GOLD = "C77E14";      // sparing gold accent (discrepancy), dark enough on white
const GOLD_BRIGHT = "F2B04C";
const PAPER = "FFFFFF";
const TINT = "EEF6F5";      // light card tint
const TINT2 = "E2F0EE";
const MUTED = "5C7382";     // muted text on light
const MUTED_D = "9DBAC6";   // muted text on dark
const LINE = "D9E6E4";      // hairline on light

const FONT = "Segoe UI";
const MONO = "Consolas";

const W = 13.33, H = 7.5, M = 0.55;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Team SevaForge - Arya Jannawar, Avani Jannawar, Siddhant Santosh Pardeshi, Vijay Sahu";
pres.title = "JalLekha - SevaForge Pitch Deck (Seva First Innovation Challenge 2026)";

// ---------- helpers ----------
function pngDims(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const shadow = () => ({ type: "outer", color: "0A1B28", blur: 7, offset: 3, angle: 45, opacity: 0.22 });
const softShadow = () => ({ type: "outer", color: "0A1B28", blur: 5, offset: 2, angle: 45, opacity: 0.12 });

// framed screenshot; returns bottom y
function shot(slide, file, x, y, w, caption, dark = false, opts = {}) {
  const { w: pw, h: ph } = pngDims(file);
  const h = w * (ph / pw);
  const pad = 0.055;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad, rectRadius: 0.07,
    fill: { color: "FFFFFF" }, line: { color: dark ? NAVY_LINE : LINE, width: 0.75 }, shadow: shadow(),
  });
  slide.addImage({ path: file, x, y, w, h });
  if (caption) {
    slide.addText(caption, {
      x: x - pad, y: y + h + pad + 0.06, w: w + 2 * pad, h: 0.34, margin: 0,
      fontFace: FONT, fontSize: 12, color: dark ? MUTED_D : MUTED, align: "left", valign: "top",
    });
  }
  return y + h + pad + (caption ? 0.45 : 0.1);
}

function header(slide, kicker, title, dark = false, titleW = 12.23) {
  slide.addText(kicker, {
    x: M, y: 0.34, w: titleW, h: 0.3, margin: 0, fontFace: FONT, fontSize: 12.5, bold: true,
    color: dark ? AQUA : TEAL, charSpacing: 3, align: "left",
  });
  slide.addText(title, {
    x: M, y: 0.62, w: titleW, h: 0.62, margin: 0, fontFace: FONT, fontSize: 30, bold: true,
    color: dark ? "FFFFFF" : INK, align: "left", valign: "top",
  });
}

function footer(slide, n, dark = false) {
  const c = dark ? MUTED_D : MUTED;
  slide.addText("SevaForge · JalLekha", {
    x: M, y: 7.06, w: 4, h: 0.3, margin: 0, fontFace: FONT, fontSize: 12, color: c, align: "left",
  });
  slide.addText(`Seva First Innovation Challenge 2026 · Maharashtra Zone · ${n} / 6`, {
    x: W - 6.55, y: 7.06, w: 6, h: 0.3, margin: 0, fontFace: FONT, fontSize: 12, color: c, align: "right",
  });
}

function chip(slide, txt, x, y, w, opts = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h: opts.h ?? 0.42, rectRadius: 0.09,
    fill: { color: opts.fill ?? TINT }, line: { color: opts.line ?? TINT2, width: 0.75 },
  });
  slide.addText(txt, {
    x, y, w, h: opts.h ?? 0.42, margin: 0.04, fontFace: FONT, fontSize: opts.size ?? 12.5,
    bold: opts.bold ?? true, color: opts.color ?? TEAL, align: "center", valign: "middle",
  });
}

function logoChip(slide, x, y) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: 0.62, h: 0.62, rectRadius: 0.12, fill: { color: "FFFFFF" }, shadow: softShadow(),
  });
  slide.addImage({ path: A("logo_mark.png"), x: x + 0.055, y: y + 0.055, w: 0.51, h: 0.51 });
  slide.addText("SevaForge", {
    x: x + 0.74, y, w: 2.2, h: 0.62, margin: 0, fontFace: FONT, fontSize: 19, bold: true,
    color: "FFFFFF", align: "left", valign: "middle",
  });
}

// ============================================================ SLIDE 1 - THE VISION
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  logoChip(s, M, 0.42);
  s.addText("SEVA FIRST INNOVATION CHALLENGE 2026 · MAHARASHTRA ZONE", {
    x: 5.6, y: 0.5, w: 7.18, h: 0.3, margin: 0, fontFace: FONT, fontSize: 12, bold: true,
    color: AQUA, charSpacing: 2, align: "right",
  });

  s.addText("JalLekha", {
    x: M, y: 1.42, w: 6.2, h: 1.1, margin: 0, fontFace: FONT, fontSize: 62, bold: true,
    color: "FFFFFF", align: "left", valign: "top",
  });
  s.addText("Every delivery. Every reading.\nA clearer water balance.", {
    x: M, y: 2.62, w: 6.2, h: 0.95, margin: 0, fontFace: FONT, fontSize: 21, bold: true,
    color: AQUA, align: "left", valign: "top", lineSpacingMultiple: 1.05,
  });
  s.addText(
    "A deterministic water-balance engine that reconciles tanker receipts, tank stock readings and meter logs for campuses and housing societies - showing what came in, what was measured, and what needs checking, with uncertainty you can see and an audit trail you can defend.",
    { x: M, y: 3.72, w: 5.95, h: 1.35, margin: 0, fontFace: FONT, fontSize: 14.5, color: "DCEBEA", align: "left", valign: "top", lineSpacingMultiple: 1.12 }
  );

  chip(s, "Working prototype · live demo", M, 5.15, 2.62, { fill: NAVY_CARD, line: NAVY_LINE, color: AQUA, size: 12.5 });
  chip(s, "41 unit + 33 e2e tests green", 3.31, 5.15, 2.66, { fill: NAVY_CARD, line: NAVY_LINE, color: AQUA, size: 12.5 });

  s.addText(
    [
      { text: "Sector: Sustainability - Energy, Climate and Others", options: { breakLine: true } },
      { text: "Sub-theme: Technology for pollution mitigation, water conservation and waste management", options: { breakLine: true } },
      { text: "Track A - Product / Technology Solution · Open Level", options: {} },
    ],
    { x: M, y: 5.88, w: 6.4, h: 0.95, margin: 0, fontFace: FONT, fontSize: 12, color: MUTED_D, align: "left", valign: "top", lineSpacingMultiple: 1.18 }
  );

  shot(s, A("app-hero.png"), 6.58, 1.35, 6.2, "The live product - jallekha-na41.zai-ai.site/demo", true);
  shot(s, A("app-workflow.png"), 6.58, 4.85, 6.2, "One workflow, visible end to end - record → reconcile → investigate → resolve", true);

  s.addNotes(
    "OPEN (60-90s). 'Good morning. We are SevaForge - Arya, Avani, Siddhant and Vijay. JalLekha answers one deceptively simple question for any campus or housing society that buys water by the tanker: did the water that arrived actually match the water that was recorded, measured and paid for?\n\n" +
    "Point at the screenshot: this is our live product, not a mockup - every figure on screen is recomputed from source records. What came in, what was measured, what needs checking.\n\n" +
    "Status honesty up front builds credibility: this is a working prototype, validated by 41 automated domain tests and 33 browser end-to-end checks, running on synthetic demonstration data. No pilot, no savings claims - yet. That honesty is deliberate; it is the same discipline the product itself enforces.\n\n" +
    "Domain: Sustainability - technology for pollution mitigation, water conservation and waste management. Water you cannot account for is water you cannot conserve.'"
  );
}

// ============================================================ SLIDE 2 - THE PROBLEM
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  header(s, "THE PROBLEM", "Three registers. No single water balance.");

  // --- left: three registers diagram ---
  const regY = 1.62, regW = 1.92, regH = 1.58, gap = 0.18;
  const regs = [
    { t: "Tanker receipts", l1: "#R-101 · 5,000 L", l2: "paper slips + a register" },
    { t: "Tank dipstick readings", l1: "11,000 L ± 200", l2: "twice a day, by hand" },
    { t: "Meter logs", l1: "1,00,000 → 1,04,000", l2: "cumulative m³, one line a day" },
  ];
  regs.forEach((r, i) => {
    const x = M + i * (regW + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: regY, w: regW, h: regH, rectRadius: 0.08, fill: { color: TINT }, line: { color: TINT2, width: 1 }, shadow: softShadow(),
    });
    s.addText(r.t, { x: x + 0.12, y: regY + 0.12, w: regW - 0.24, h: 0.55, margin: 0, fontFace: FONT, fontSize: 13.5, bold: true, color: INK, align: "left", valign: "top", lineSpacingMultiple: 1.0 });
    s.addText(r.l1, { x: x + 0.12, y: regY + 0.68, w: regW - 0.24, h: 0.3, margin: 0, fontFace: MONO, fontSize: 11.5, bold: true, color: TEAL, align: "left", valign: "top" });
    s.addText(r.l2, { x: x + 0.12, y: regY + 1.0, w: regW - 0.24, h: 0.5, margin: 0, fontFace: FONT, fontSize: 12, color: MUTED, align: "left", valign: "top" });
  });
  // converge arrows
  const cx1 = M + regW / 2, cx2 = M + regW + gap + regW / 2, cx3 = M + 2 * (regW + gap) + regW / 2;
  const bx = M + 0.55, bw = 5.85, by = 4.05, bh = 1.06;
  [[cx1, regY + regH], [cx2, regY + regH], [cx3, regY + regH]].forEach(([ax, ay]) => {
    const tx = bx + bw / 2, ty = by;
    s.addShape(pres.shapes.LINE, { x: Math.min(ax, tx), y: ay + 0.02, w: Math.abs(tx - ax), h: ty - ay - 0.06, line: { color: TEAL, width: 1.5, endArrowType: "triangle" }, flipH: tx < ax });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: by, w: bw, h: bh, rectRadius: 0.09, fill: { color: NAVY }, shadow: shadow() });
  s.addText("Water doesn't add up - so staff trace entries by hand", {
    x: bx + 0.2, y: by + 0.12, w: bw - 0.4, h: 0.4, margin: 0, fontFace: FONT, fontSize: 15.5, bold: true, color: "FFFFFF", align: "center", valign: "middle",
  });
  s.addText("Duplicate? Missing reading? Real loss? The register cannot say.", {
    x: bx + 0.2, y: by + 0.55, w: bw - 0.4, h: 0.36, margin: 0, fontFace: FONT, fontSize: 12.5, color: AQUA, align: "center", valign: "middle",
  });

  s.addText("WHO FEELS IT", { x: M, y: 5.5, w: 3, h: 0.28, margin: 0, fontFace: FONT, fontSize: 12, bold: true, color: TEAL, charSpacing: 2 });
  chip(s, "Hostel & campus teams", M, 5.84, 1.92, { size: 11.5, h: 0.44 });
  chip(s, "Housing societies", 2.59, 5.84, 1.7, { size: 11.5, h: 0.44 });
  chip(s, "Students & residents", 4.41, 5.84, 1.92, { size: 11.5, h: 0.44 });

  // --- right: why manual records fail ---
  const rx = 6.85, rw = 5.93;
  s.addText("WHY PAPER CANNOT CARRY THIS WORKFLOW", { x: rx, y: 1.58, w: rw, h: 0.28, margin: 0, fontFace: FONT, fontSize: 12, bold: true, color: TEAL, charSpacing: 2 });
  const fails = [
    { h: "Same symptom, three different causes", b: "A duplicate receipt needs a correction, a missing reading needs a measurement, an unexplained residual needs investigation. Paper cannot tell them apart - so staff guess." },
    { h: "Exact-looking numbers hide uncertainty", b: "A dipstick is ±100-200 L, a meter ±100 L. Registers make estimates look exact: small errors trigger panic while real losses hide inside tolerance." },
    { h: "Corrections destroy the evidence", b: "Overwrite one register line and the audit trail is gone. Disputes with suppliers cannot be evidenced - so nothing gets fixed and water stays unaccounted." },
  ];
  fails.forEach((f, i) => {
    const y = 1.98 + i * 1.62;
    s.addShape(pres.shapes.OVAL, { x: rx, y: y + 0.02, w: 0.34, h: 0.34, fill: { color: TEAL } });
    s.addText(String(i + 1), { x: rx, y: y + 0.02, w: 0.34, h: 0.34, margin: 0, fontFace: FONT, fontSize: 13.5, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    s.addText(f.h, { x: rx + 0.5, y, w: rw - 0.5, h: 0.34, margin: 0, fontFace: FONT, fontSize: 15.5, bold: true, color: INK, align: "left", valign: "top" });
    s.addText(f.b, { x: rx + 0.5, y: y + 0.38, w: rw - 0.5, h: 1.05, margin: 0, fontFace: FONT, fontSize: 13, color: MUTED, align: "left", valign: "top", lineSpacingMultiple: 1.1 });
    if (i < 2) s.addShape(pres.shapes.LINE, { x: rx + 0.5, y: y + 1.47, w: rw - 0.5, h: 0, line: { color: LINE, width: 0.75 } });
  });

  footer(s, 2);
  s.addNotes(
    "PROBLEM (60-75s). Ground it in a concrete scene: a hostel manager holds a tanker receipt for 5,000 litres, a dipstick reading that says the tank is fuller than it should be, and a meter log that disagrees with both. Three registers, kept by three people, in three formats - and no way to compute a single water balance.\n\n" +
    "The three failure modes on the right are the heart of the pitch: (1) the same symptom - 'water doesn't add up' - has three different causes needing three different actions; (2) every manual measurement carries uncertainty that registers hide; (3) hand corrections destroy the evidence trail.\n\n" +
    "Jury question to pre-empt: 'why not just a spreadsheet?' - because a spreadsheet still cannot separate a duplicate record from a missing measurement, still hides uncertainty, and still lets anyone overwrite history silently."
  );
}

// ============================================================ SLIDE 3 - THE INNOVATION
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  header(s, "THE INNOVATION", "One equation. Three honest outcomes.");

  // --- left: equation card ---
  const ex = M, ey = 1.58, ew = 5.7, eh = 2.78;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: ex, y: ey, w: ew, h: eh, rectRadius: 0.1, fill: { color: NAVY }, shadow: shadow() });
  s.addText("THE WATER BALANCE - recon-v1.0", { x: ex + 0.25, y: ey + 0.16, w: ew - 0.5, h: 0.26, margin: 0, fontFace: FONT, fontSize: 11.5, bold: true, color: AQUA, charSpacing: 2 });
  s.addText("R = O + D - U - C", { x: ex + 0.25, y: ey + 0.44, w: ew - 0.5, h: 0.62, margin: 0, fontFace: MONO, fontSize: 30, bold: true, color: "FFFFFF", align: "left", valign: "middle" });
  const terms = [["OPENING", "stock O"], ["DELIVERIES", "inflow D"], ["USAGE", "outflow U"], ["CLOSING", "stock C"]];
  terms.forEach((t, i) => {
    s.addText(t[0], { x: ex + 0.27 + i * 1.32, y: ey + 1.1, w: 1.3, h: 0.22, margin: 0, fontFace: FONT, fontSize: 10.5, bold: true, color: AQUA, charSpacing: 1, align: "left" });
  });
  s.addText("R_min = O_min + D_min - U_max - C_max\nconservative summed bounds - never root-sum-square optimism", {
    x: ex + 0.25, y: ey + 1.38, w: ew - 0.5, h: 0.55, margin: 0, fontFace: MONO, fontSize: 11.5, color: "BFE8E2", align: "left", valign: "top", lineSpacingMultiple: 1.15,
  });
  s.addShape(pres.shapes.LINE, { x: ex + 0.25, y: ey + 2.0, w: ew - 0.5, h: 0, line: { color: NAVY_LINE, width: 0.75 } });
  s.addText("Status precedence:", { x: ex + 0.25, y: ey + 2.1, w: 1.65, h: 0.5, margin: 0, fontFace: FONT, fontSize: 12, bold: true, color: "FFFFFF", valign: "middle" });
  s.addText("invalid → incomplete (no residual asserted) → uncertainty not quantified → within uncertainty → discrepancy", {
    x: ex + 1.95, y: ey + 2.1, w: ew - 2.2, h: 0.5, margin: 0, fontFace: FONT, fontSize: 12, color: "BFE8E2", valign: "middle", lineSpacingMultiple: 1.1,
  });

  // --- right: live reconciliation screenshot ---
  shot(s, A("app-recon-b-crop.png"), 6.62, 1.62, 6.2, "Live reconciliation - Scenario B: a double-entered receipt R-101 yields R = +5,000 L, bounds [4,300, 5,700] L, duplicate candidate linked to both rows.", false);

  // --- bottom: three outcomes ---
  const oy = 5.02, ow = 3.98, og = 0.14;
  const outs = [
    { tag: "SCENARIO B · DUPLICATE", h: "Record correction", b: "Reviewer voids the repeated receipt with a reason - R returns to 0 L and the original records stay in history." },
    { tag: "SCENARIO C · MISSING READING", h: "No residual invented", b: "No closing reading? The run is 'incomplete' and asserts no residual at all. The fix is a measurement, not a guess." },
    { tag: "SCENARIO D · UNEXPLAINED", h: "Investigation, never accusation", b: "R = +2,000 L in [1,400, 2,600] L opens an owned case - the cause is never auto-labelled theft or leakage." },
  ];
  outs.forEach((o, i) => {
    const x = M + i * (ow + og);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: oy, w: ow, h: 1.58, rectRadius: 0.08, fill: { color: TINT }, line: { color: TINT2, width: 1 }, shadow: softShadow() });
    s.addText(o.tag, { x: x + 0.16, y: oy + 0.12, w: ow - 0.32, h: 0.22, margin: 0, fontFace: FONT, fontSize: 10.5, bold: true, color: TEAL, charSpacing: 1.5 });
    s.addText(o.h, { x: x + 0.16, y: oy + 0.36, w: ow - 0.32, h: 0.3, margin: 0, fontFace: FONT, fontSize: 15, bold: true, color: INK });
    s.addText(o.b, { x: x + 0.16, y: oy + 0.68, w: ow - 0.32, h: 0.85, margin: 0, fontFace: FONT, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.08, valign: "top" });
  });

  chip(s, "Every number carries its uncertainty - and a discrepancy is never labelled theft or leakage.", 2.47, 6.72, 8.4, { fill: "FDF4E5", line: "F3DFBC", color: GOLD, size: 13 });

  footer(s, 3);
  s.addNotes(
    "INNOVATION (90s). Walk the equation left to right: R equals Opening stock plus Deliveries minus Usage minus Closing stock. Each input carries its own declared uncertainty, and the bounds are summed conservatively - if the interval contains zero, the records are consistent with measurement error, full stop.\n\n" +
    "Then the three outcomes - this is the differentiator. Scenario B: a double-entered receipt shows R = +5,000 L, the duplicate candidate is linked to both rows, and a reviewer voids it with a reason - R returns to 0 L and history is retained. Scenario C: a missing closing reading means NO residual is asserted at all - the app refuses to invent a number and asks for a measurement. Scenario D: a residual outside uncertainty opens an investigation, but the cause is never auto-labelled.\n\n" +
    "Say it plainly: JalLekha distinguishes duplicate records from missing measurements from unexplained residuals - each gets a different, owned next action. That separation is what manual registers and generic dashboards cannot do."
  );
}

// ============================================================ SLIDE 4 - THE ENGINEERING
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  header(s, "THE ENGINEERING", "A pure, tested core. AI assists - never decides.");

  // --- left: architecture bands ---
  const ax = M, aw = 5.95, bandH = 1.06, ay0 = 1.62, arrowGap = 0.26;
  const bands = [
    { t: "INTERFACE - Next.js 16 · TypeScript · Tailwind", b: "landing · guided demo · workspace: dashboard, ledger, readings, reconciliation, cases, reports", fill: TINT, tc: INK, bc: MUTED, line: TINT2 },
    { t: "DOMAIN - recon-v1.0 rule engine · pure TypeScript", b: "balance · findings · CSV import · audit state · strict units - no framework imports, fully unit-tested", fill: TEAL, tc: "FFFFFF", bc: "D8F3EF", line: TEAL },
    { t: "DATA - DataAdapter port", b: "browser-local demo (disclosed) · in-memory tests · shared backend (Supabase + RLS) designed as drop-in", fill: TINT, tc: INK, bc: MUTED, line: TINT2 },
  ];
  bands.forEach((b, i) => {
    const y = ay0 + i * (bandH + arrowGap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: ax, y, w: aw, h: bandH, rectRadius: 0.09, fill: { color: b.fill }, line: { color: b.line, width: 1 }, shadow: softShadow() });
    s.addText(b.t, { x: ax + 0.2, y: y + 0.1, w: aw - 0.4, h: 0.3, margin: 0, fontFace: FONT, fontSize: 13.5, bold: true, color: b.tc });
    s.addText(b.b, { x: ax + 0.2, y: y + 0.42, w: aw - 0.4, h: 0.58, margin: 0, fontFace: FONT, fontSize: 12, color: b.bc, lineSpacingMultiple: 1.08, valign: "top" });
    if (i < 2) {
      s.addShape(pres.shapes.LINE, { x: ax + aw / 2, y: y + bandH + 0.02, w: 0, h: arrowGap - 0.06, line: { color: TEAL, width: 1.75, endArrowType: "triangle" } });
    }
  });
  s.addText("Key decisions: decimal-safe litres (NaN / negative / over-capacity rejected, never clamped) · exact boundary instants (tolerance 0) · content-derived stable finding IDs", {
    x: ax, y: ay0 + 3 * bandH + 2 * arrowGap + 0.06, w: aw, h: 0.62, margin: 0, fontFace: FONT, fontSize: 12, italic: true, color: MUTED, lineSpacingMultiple: 1.12, valign: "top",
  });

  // --- right: built & verified checklist ---
  const rx = 6.85, rw = 5.93;
  s.addText("BUILT & VERIFIED - DATED RUN LOG, 31 OCT 2026", { x: rx, y: 1.58, w: rw, h: 0.28, margin: 0, fontFace: FONT, fontSize: 12, bold: true, color: TEAL, charSpacing: 2 });
  const checks = [
    { h: "41 / 41 domain tests · 33 / 33 browser e2e", b: "Vitest + Playwright on the production build; strict tsc 0 errors, lint 0/0 - docs/VALIDATION.md" },
    { h: "Deterministic engine - zero AI in the math", b: "Same inputs always give the same verdict; four signature scenarios asserted to the litre" },
    { h: "CSV import you can trust", b: "Validate-before-commit preview; replaying the same file never doubles a total" },
    { h: "Every correction keeps its history", b: "Audit trail + superseded runs - reviewers see what changed and why" },
    { h: "Optional AI, bring your own key", b: "Schema-validated explanations & note-drafting with rule-based fallback - stored only in your browser" },
  ];
  checks.forEach((c, i) => {
    const y = 1.96 + i * 0.86;
    s.addText("✓", { x: rx, y: y - 0.02, w: 0.3, h: 0.3, margin: 0, fontFace: FONT, fontSize: 14.5, bold: true, color: TEAL, align: "left" });
    s.addText(c.h, { x: rx + 0.36, y, w: rw - 0.36, h: 0.28, margin: 0, fontFace: FONT, fontSize: 13.5, bold: true, color: INK });
    s.addText(c.b, { x: rx + 0.36, y: y + 0.29, w: rw - 0.36, h: 0.5, margin: 0, fontFace: FONT, fontSize: 11.5, color: MUTED, lineSpacingMultiple: 1.05, valign: "top" });
  });

  // --- bottom roadmap ---
  const ry = 6.38, rwid = 3.98;
  const steps = [
    { t: "NOW", b: "Single-device pilot - browser-local workspace, operator CSVs, zero hardware" },
    { t: "NEXT", b: "Shared authenticated workspaces - the adapter port is already designed for it" },
    { t: "THEN", b: "Multi-site rollup - one campus chain or a municipal ward, same equation" },
  ];
  steps.forEach((st, i) => {
    const x = M + i * (rwid + 0.14);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: ry, w: rwid, h: 0.52, rectRadius: 0.08, fill: { color: NAVY } });
    s.addText([
      { text: st.t + "  ", options: { bold: true, color: AQUA } },
      { text: st.b, options: { color: "DCEBEA" } },
    ], { x: x + 0.14, y: ry, w: rwid - 0.28, h: 0.52, margin: 0, fontFace: FONT, fontSize: 11.5, align: "left", valign: "middle" });
    if (i < 2) s.addShape(pres.shapes.LINE, { x: x + rwid + 0.005, y: ry + 0.26, w: 0.13, h: 0, line: { color: TEAL, width: 1.75, endArrowType: "triangle" } });
  });

  footer(s, 4);
  s.addNotes(
    "ENGINEERING (75-90s). Three-layer architecture, and the layer that matters is the middle one: a pure TypeScript domain core with no framework imports - balance, findings, CSV import, audit state and strict unit handling are all plain functions, so they are trivially testable and portable.\n\n" +
    "The data layer is a port: today a disclosed browser-local adapter (honest about being per-device), tomorrow a shared backend - Supabase with row-level security is designed as a drop-in, which is exactly what the deployment roadmap needs.\n\n" +
    "Read the evidence column as claims with receipts: 41/41 Vitest, 33/33 Playwright against the production build, strict TypeScript, and a dated validation log in the repo. On AI: it is optional, bring-your-own-key, schema-validated with a rule-based fallback - the deterministic engine never depends on it. If the network dies, the maths still runs.\n\n" +
    "Roadmap in one breath: pilot on one device now, shared authenticated workspaces next, multi-site rollup then."
  );
}

// ============================================================ SLIDE 5 - THE IMPACT
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  header(s, "THE IMPACT", "Measured water is manageable water.");

  // --- left: what we measure ---
  const lx = M, lw = 5.9;
  s.addText("WHAT THE PILOT WILL MEASURE", { x: lx, y: 1.56, w: lw, h: 0.28, margin: 0, fontFace: FONT, fontSize: 12, bold: true, color: TEAL, charSpacing: 2 });
  const mets = [
    { n: "01", h: "Planted-discrepancy detection rate", b: "% of seeded duplicate / missing records caught on known test ledgers" },
    { n: "02", h: "Reviewer time-to-diagnosis", b: "minutes to the correct next action, vs tracing paper registers by hand" },
    { n: "03", h: "Uncertainty coverage", b: "share of reconciliation periods reported with quantified bounds" },
    { n: "04", h: "Case closure quality", b: "duplicates voided with reasons; missing readings re-measured and closed" },
  ];
  mets.forEach((m, i) => {
    const y = 1.94 + i * 0.92;
    s.addText(m.n, { x: lx, y: y + 0.01, w: 0.62, h: 0.5, margin: 0, fontFace: MONO, fontSize: 19, bold: true, color: TEAL, align: "left" });
    s.addText(m.h, { x: lx + 0.66, y, w: lw - 0.66, h: 0.28, margin: 0, fontFace: FONT, fontSize: 14.5, bold: true, color: INK });
    s.addText(m.b, { x: lx + 0.66, y: y + 0.3, w: lw - 0.66, h: 0.5, margin: 0, fontFace: FONT, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05, valign: "top" });
    if (i < 3) s.addShape(pres.shapes.LINE, { x: lx + 0.66, y: y + 0.82, w: lw - 0.66, h: 0, line: { color: LINE, width: 0.75 } });
  });

  // --- right: dashboard screenshot + honesty note ---
  shot(s, A("app-dash-crop.png"), 6.58, 1.6, 6.2, "Dashboard - balance waterfall, findings mix, meter trend, tank gauge and data quality in one view.", false);
  s.addText("Baselines are set during the pilot - no litres-saved claims are made before field data exists.", {
    x: 6.58, y: 5.42, w: 6.2, h: 0.55, margin: 0, fontFace: FONT, fontSize: 12.5, italic: true, color: GOLD, valign: "top", lineSpacingMultiple: 1.1,
  });

  // --- bottom: sustainability strip ---
  const sy = 6.34, sw = 3.98;
  const sust = [
    { t: "CONSERVATION", b: "losses surface early; over-ordering and unnoticed leaks become owned cases" },
    { t: "POLLUTION & HAULAGE", b: "documented demand means fewer emergency tanker trips and less idle haulage" },
    { t: "WASTE & TRUST", b: "evidence-backed records end billing disputes and repeat reconciliation work" },
  ];
  sust.forEach((c, i) => {
    const x = M + i * (sw + 0.14);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: sy, w: sw, h: 0.52, rectRadius: 0.08, fill: { color: TINT }, line: { color: TINT2, width: 0.75 } });
    s.addText([
      { text: c.t + "  ", options: { bold: true, color: TEAL } },
      { text: c.b, options: { color: MUTED } },
    ], { x: x + 0.13, y: sy, w: sw - 0.26, h: 0.52, margin: 0, fontFace: FONT, fontSize: 10.5, align: "left", valign: "middle", lineSpacingMultiple: 1.0 });
  });

  footer(s, 5);
  s.addNotes(
    "IMPACT (60-75s). Be disciplined here: we do not claim litres saved, because we have not run a field pilot - and that honesty is itself the impact story.\n\n" +
    "What we CAN show: a measurement plan that is already instrumented in the product. Detection rate on planted discrepancies, reviewer time-to-diagnosis against manual tracing, the share of periods reported with quantified uncertainty, and case-closure quality. The pilot sets the baselines.\n\n" +
    "The sustainability logic chain: water you cannot account for, you cannot conserve. Reconciliation makes every invisible loss visible and ownable - that is the conservation lever. Fewer surprise shortfalls mean fewer emergency tanker hauls; documented evidence ends disputes and re-work.\n\n" +
    "Scalability: the unit of scaling is a CSV file and a browser - tank to hostel to campus to ward, with no hardware purchase. The same equation works at every level; only the ledger size changes."
  );
}

// ============================================================ SLIDE 6 - PEOPLE & FUTURE
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  logoChip(s, M, 0.42);
  s.addText("THE PEOPLE & THE FUTURE", {
    x: 5.6, y: 0.5, w: 7.18, h: 0.3, margin: 0, fontFace: FONT, fontSize: 12, bold: true, color: AQUA, charSpacing: 3, align: "right",
  });
  s.addText("Four builders. One honest ask.", {
    x: M, y: 1.28, w: 11.5, h: 0.6, margin: 0, fontFace: FONT, fontSize: 30, bold: true, color: "FFFFFF",
  });

  // team cards
  const ty = 2.12, tw = 2.94, tg = 0.155;
  const team = [
    { init: "AJ", name: "Arya Jannawar", role: "Team Lead · product & reconciliation domain" },
    { init: "AV", name: "Avani Jannawar", role: "Engineering & data integrity" },
    { init: "SP", name: "Siddhant Santosh Pardeshi", role: "Quality & user workflow" },
    { init: "VS", name: "Vijay Sahu", role: "Research & validation" },
  ];
  team.forEach((t, i) => {
    const x = M + i * (tw + tg);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: ty, w: tw, h: 1.34, rectRadius: 0.1, fill: { color: NAVY_CARD }, line: { color: NAVY_LINE, width: 1 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: ty + 0.31, w: 0.62, h: 0.62, fill: { color: TEAL } });
    s.addText(t.init, { x: x + 0.15, y: ty + 0.31, w: 0.62, h: 0.62, margin: 0, fontFace: FONT, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    s.addText(t.name, { x: x + 0.9, y: ty + 0.2, w: tw - 1.02, h: 0.52, margin: 0, fontFace: FONT, fontSize: 13.5, bold: true, color: "FFFFFF", align: "left", valign: "middle", lineSpacingMultiple: 1.0 });
    s.addText(t.role, { x: x + 0.9, y: ty + 0.74, w: tw - 1.02, h: 0.5, margin: 0, fontFace: FONT, fontSize: 10.5, color: AQUA, align: "left", valign: "top", lineSpacingMultiple: 1.05 });
  });

  // support required
  s.addText("WHAT WE ARE ASKING FOR", { x: M, y: 3.86, w: 6, h: 0.28, margin: 0, fontFace: FONT, fontSize: 12, bold: true, color: AQUA, charSpacing: 2 });
  const asks = [
    { h: "One pilot campus or housing society", b: "4-6 weeks, one device, operator-supplied CSVs - we instrument the four impact metrics and publish the baselines" },
    { h: "Mentorship & lab access", b: "study design for the reviewer-time measurement, and measurement-quality practice from domain experts" },
    { h: "A route to shared deployment", b: "introductions toward authenticated, multi-user workspaces for a full institution - the adapter design is ready" },
  ];
  asks.forEach((a, i) => {
    const y = 4.24 + i * 0.78;
    s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.03, w: 0.14, h: 0.14, fill: { color: AQUA } });
    s.addText(a.h, { x: M + 0.3, y, w: 5.6, h: 0.28, margin: 0, fontFace: FONT, fontSize: 14, bold: true, color: "FFFFFF" });
    s.addText(a.b, { x: M + 0.3, y: y + 0.28, w: 6.3, h: 0.46, margin: 0, fontFace: FONT, fontSize: 11.5, color: MUTED_D, lineSpacingMultiple: 1.05, valign: "top" });
  });

  // closing quote panel (right)
  const qx = 7.35, qy = 3.86, qw = 5.43, qh = 2.52;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: qx, y: qy, w: qw, h: qh, rectRadius: 0.1, fill: { color: NAVY_CARD }, line: { color: NAVY_LINE, width: 1 }, shadow: shadow() });
  s.addText('"Know what came in, what was measured, and what needs checking."', {
    x: qx + 0.3, y: qy + 0.22, w: qw - 0.6, h: 1.3, margin: 0, fontFace: FONT, fontSize: 19.5, bold: true, color: AQUA, align: "left", valign: "top", lineSpacingMultiple: 1.12,
  });
  s.addText("JalLekha - from Team SevaForge", { x: qx + 0.3, y: qy + 1.5, w: qw - 0.6, h: 0.3, margin: 0, fontFace: FONT, fontSize: 12, color: "FFFFFF" });
  s.addText("github.com/Avani376/jallekha  ·  live demo: jallekha-na41.zai-ai.site/demo", {
    x: qx + 0.3, y: qy + 1.92, w: qw - 0.6, h: 0.5, margin: 0, fontFace: FONT, fontSize: 11.5, color: MUTED_D, valign: "top", lineSpacingMultiple: 1.15,
  });

  footer(s, 6, true);
  s.addNotes(
    "CLOSE (45-60s). Introduce the team in one line each - Arya leads product and the reconciliation domain, Avani drives engineering and data integrity, Siddhant owns quality and the user workflow, and Vijay anchors research and validation.\n\n" +
    "Then the ask, concretely: one pilot site for four to six weeks - we bring the software, the metrics and the training; the campus brings its existing paper registers as CSVs. Mentorship and lab access to run the reviewer-time study properly. And a route to shared deployment so a whole institution can run on authenticated workspaces.\n\n" +
    "End on the line that is already in the product footer: know what came in, what was measured, and what needs checking. That is the whole product - an honest balance for every litre.\n\n" +
    "Leave the jury with the links: the repo and the live demo are one click away."
  );
}

pres.writeFile({ fileName: path.join(__dirname, "SevaForge_JalLekha_Pitch_Deck.pptx") }).then(() => console.log("PPTX written"));
