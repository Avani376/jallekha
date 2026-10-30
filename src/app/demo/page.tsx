"use client";

/**
 * Guided demo — the judge's two-click entry. Maps the three-minute script:
 * baseline -> duplicate receipt case -> missing reading case -> unexplained
 * residual -> export. Each step selects the right synthetic site and
 * explains what to look for. Works without AI; resets per visitor.
 */

import { useRouter } from "next/navigation";
import { useWorkspace } from "@/data/store";
import { Button, Card, StatusPill } from "@/components/ui";
import { IconArrowRight } from "@/components/icons";

export default function DemoPage() {
  const router = useRouter();
  const { setSelectedSiteId, actions } = useWorkspace();

  const go = (siteId: string) => {
    setSelectedSiteId(siteId);
    router.push("/workspace");
  };

  return (
    <div className="min-h-screen bg-ink py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6 px-6">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-aqua/40 bg-aqua/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-aqua">
            Guided demo · synthetic data · ~3 minutes
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">
            See why a duplicate receipt and a missing reading need different actions.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">
            Four synthetic sites are pre-loaded below. The calculation is deterministic — the same inputs always
            produce the same numbers. Your demo data lives only in this browser; “Reset demo” reseeds everything.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button onClick={() => go("site-legacy")}>Start the guided demo</Button>
            <Button variant="secondary" onClick={actions.resetDemo}>Reset demo data</Button>
          </div>
        </div>

        <Step
          n="1"
          title="Baseline — a complete, consistent day"
          site="Sunrise Campus (Synthetic)"
          go={() => go("site-sunrise")}
        >
          <p>
            Opening stock 10,000 L, one receipt of 5,000 L, meter usage 4,000 L, closing stock 11,000 L. The balance
            closes at <strong className="text-aqua">R = 0 L</strong> inside the conservative interval{" "}
            <strong className="text-aqua">[−600, +600] L</strong> — labeled “within stated measurement uncertainty”,
            not “perfect”.
          </p>
        </Step>

        <Step
          n="2"
          title="The duplicate receipt — a record problem"
          site="Sunrise Campus — Legacy Ledger Week (Synthetic)"
          go={() => go("site-legacy")}
          highlight
        >
          <p>
            The old spreadsheet double-entered receipt R-101. The raw ledger shows{" "}
            <strong className="text-amber">R = +5,000 L</strong> with bounds [4,300, 5,700] L. JalLekha raises a{" "}
            <strong>duplicate candidate</strong> linked to both rows — never an accusation.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-white/55">
            <li>Open <strong>Cases</strong> → the duplicate case → inspect both linked records.</li>
            <li>Void the repeated record with a reason (reviewer action).</li>
            <li>Watch the balance recompute to R = 0 L — history retained, old run marked superseded.</li>
          </ol>
        </Step>

        <Step
          n="3"
          title="The missing reading — a measurement gap"
          site="Lake View Hostel (Synthetic)"
          go={() => go("site-hostel")}
        >
          <p>
            No closing dipstick reading was taken. JalLekha asserts <strong>no residual at all</strong> — it does not
            substitute zero or guess. The case asks for the missing measurement.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-white/55">
            <li>Open the case → “Record the closing reading” → enter 11,000 L.</li>
            <li>The run recomputes to a complete balance; the case resolves with evidence.</li>
          </ol>
        </Step>

        <Step
          n="4"
          title="The unexplained residual — cause not determined"
          site="Hillcrest Academy (Synthetic)"
          go={() => go("site-hillcrest")}
        >
          <p>
            Complete data, but <strong className="text-amber">R = +2,000 L</strong> with bounds [1,400, 2,600] L.
            That is larger than declared measurement error can explain — so JalLekha opens an investigation with
            verification steps, and states plainly that the cause is <strong>not</strong> determined. It is not proof
            of theft or leakage.
          </p>
        </Step>

        <Step n="5" title="Export the documented review" site="Reports" go={() => go("site-legacy")}>
          <p>
            From <strong>Reports</strong>: print/save the review as PDF (readable without color or animation), export
            a safe CSV, or export the JSON review with findings, cases and outcomes.
          </p>
        </Step>

        <Card className="border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="info">AI status</StatusPill>
            <span className="text-[13px] text-white/60">
              The core accounting runs entirely without AI. This build makes no live AI calls; explanations are
              rule-based and generated from the run itself.
            </span>
          </div>
        </Card>

        <p className="pb-8 text-center text-xs text-white/35">
          Prototype by Team SevaForge — Arya Jannawar, Siddhant Santosh Pardeshi, Avni · Seva First Innovation
          Challenge, Maharashtra Zone 2026. All sites, suppliers, receipts and users are synthetic.
        </p>
      </div>
    </div>
  );
}

function Step({
  n, title, site, children, go, highlight,
}: { n: string; title: string; site: string; children: React.ReactNode; go: () => void; highlight?: boolean }) {
  return (
    <Card className={`p-5 ${highlight ? "border-aqua/50 bg-aqua/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="tabular mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aqua font-display text-sm font-extrabold text-ink">
            {n}
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold leading-snug">{title}</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{site}</p>
          </div>
        </div>
        <Button size="sm" variant={highlight ? "primary" : "secondary"} onClick={go}>
          Open this case <IconArrowRight />
        </Button>
      </div>
      <div className="mt-3 space-y-2 pl-11 text-[14px] leading-relaxed text-white/70">{children}</div>
    </Card>
  );
}
