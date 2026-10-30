"use client";

/**
 * AI-assisted finding explanation. The model explains the supplied result;
 * the numbers in the header remain rendered from the domain output. Any
 * failure (no key, network/CORS, auth, schema, timeout) falls back to the
 * rule-based explanation with a visible label — never a silent swap.
 */

import { useState } from "react";
import Link from "next/link";
import type { ReconciliationResult } from "@/domain/types";
import { aiReady, loadAiSettings } from "@/lib/ai/settings";
import { AiError, explainResult, type ExplanationOutput } from "@/lib/ai/client";
import { Button, StatusPill } from "@/components/ui";
import { IconInfo } from "@/components/icons";

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; output: ExplanationOutput }
  | { kind: "error"; message: string };

export function AiExplainPanel({ result, ruleBased }: { result: ReconciliationResult; ruleBased: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const cfg = loadAiSettings(); // read per render; cheap and always current

  const run = async () => {
    setPhase({ kind: "loading" });
    try {
      const output = await explainResult(cfg, {
        status: result.status,
        residualLiters: result.residualLiters,
        bounds: result.boundsLiters,
        completeness: result.completeness.missingFields,
        invalidReasons: result.invalidReasons,
        scopeAssumption: result.scopeAssumption,
        sourceIds: result.inputs.map((i) => i.id),
        findings: result.findings.map((f) => ({ type: f.type, title: f.title, sourceIds: f.sourceIds })),
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
      });
      setPhase({ kind: "done", output });
    } catch (e) {
      const err = e as AiError;
      setPhase({ kind: "error", message: err.message });
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <StatusPill tone={phase.kind === "done" ? "info" : "neutral"}>
          {phase.kind === "done" ? "AI-assisted — verify against source records" : "Rule-based explanation"}
        </StatusPill>
        {aiReady(cfg) ? (
          <Button size="sm" variant="secondary" onClick={run} disabled={phase.kind === "loading"}>
            {phase.kind === "loading" ? "Asking…" : phase.kind === "done" ? "Ask again" : "Explain with AI"}
          </Button>
        ) : (
          <Link href="/workspace/settings" className="inline-flex items-center gap-1.5 text-xs font-bold text-water-deep hover:underline">
            <IconInfo /> Enable AI assistance in Settings
          </Link>
        )}
      </div>

      {phase.kind === "done" ? (
        <div className="space-y-3">
          <p className="text-[13.5px] leading-relaxed text-slate-700">{phase.output.summary}</p>
          {phase.output.observations.length > 0 ? (
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Observations</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-slate-600">
                {phase.output.observations.map((o, i) => (
                  <li key={i}>
                    {o.text}
                    {o.source_ids.length > 0 ? (
                      <span className="ml-1.5 font-mono text-[11px] text-slate-400">[{o.source_ids.join(", ")}]</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {phase.output.hypotheses.length > 0 ? (
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Hypotheses (unverified)</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-slate-600">
                {phase.output.hypotheses.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          ) : null}
          {phase.output.next_steps.length > 0 ? (
            <div className="rounded-xl bg-[#e8f1ff] px-3.5 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-water-deep">Suggested next steps</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px] font-semibold text-water-deep">
                {phase.output.next_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          ) : null}
          {phase.output.limitations ? (
            <p className="text-xs italic text-slate-400">{phase.output.limitations}</p>
          ) : null}
          <details className="text-[13px] text-slate-500">
            <summary className="cursor-pointer select-none text-xs font-bold text-slate-400 hover:text-slate-500">
              Rule-based explanation (deterministic fallback)
            </summary>
            <div className="mt-2">{ruleBased}</div>
          </details>
        </div>
      ) : (
        <>
          {phase.kind === "error" ? (
            <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-semibold text-danger">
              {phase.message}
            </p>
          ) : null}
          {ruleBased}
        </>
      )}
    </div>
  );
}
