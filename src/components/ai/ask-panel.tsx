"use client";

/**
 * "Ask Bundu" — a grounded Q&A drawer over the workspace records. The model
 * receives a deterministic snapshot of the selected site and may only cite
 * record IDs from it; suggestions, citations and follow-ups keep the loop
 * tight. With no key configured, the drawer shows honest setup guidance
 * instead of pretending to answer.
 */

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/data/store";
import { buildWorkspaceContext } from "@/lib/ai/context";
import { aiReady, loadAiSettings } from "@/lib/ai/settings";
import { answerQuestion, AiError, type AnswerOutput, type ChatTurn } from "@/lib/ai/client";
import { BunduFace, mascotReact } from "@/components/mascot";
import { Button, cx } from "@/components/ui";
import { IconArrowRight, IconClose } from "@/components/icons";

import { askStore } from "./ask-store";

interface Msg extends ChatTurn {
  citations?: string[];
  followups?: string[];
}

const SUGGESTIONS = [
  "Why is there a residual?",
  "Any duplicate receipts?",
  "How much was delivered recently?",
  "What needs my attention?",
  "How do I import my data?",
];

export function AskPanel() {
  const { state, selectedSiteId } = useWorkspace();
  const open = useSyncOpen();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cfg = loadAiSettings();
  const ready = aiReady(cfg);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs, busy, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && askStore.get()) askStore.set(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const context = buildWorkspaceContext(state, selectedSiteId);
      const history: ChatTurn[] = msgs.map((m) => ({ role: m.role, content: m.content }));
      const out: AnswerOutput = await answerQuestion(cfg, context, q, history);
      setMsgs((m) => [...m, { role: "assistant", content: out.answer, citations: out.citations, followups: out.followups }]);
      mascotReact("happy", 1800);
    } catch (e) {
      const err = e as AiError;
      setError(err.message ?? "The AI request failed.");
      mascotReact("sad", 2200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cx(
        "no-print fixed inset-y-0 right-0 z-50 w-full max-w-[430px] transform transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      )}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col border-l border-slate-200 bg-white shadow-pop">
        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="h-10 w-10 shrink-0"><BunduFace mood={busy ? "think" : "happy"} size={40} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-extrabold text-ink">Ask Bundu</p>
            <p className="text-[11px] font-semibold text-slate-400">
              {ready ? "Answers come only from your workspace records" : "AI is off — add your key in Settings"}
            </p>
          </div>
          <button onClick={() => askStore.set(false)} aria-label="Close Ask Bundu" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink">
            <IconClose />
          </button>
        </header>

        {!ready ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="rounded-2xl bg-[#e8f1ff] p-4 text-[13px] leading-relaxed text-water-deep">
              <p className="font-bold">AI answers need your own API key</p>
              <p className="mt-1.5">
                Open <strong>Settings → AI assistance</strong>, paste a key for an OpenAI-compatible endpoint
                (the Z.ai v4 base URL is pre-filled), and press <strong>Test connection</strong>. The key stays in
                this browser and is sent directly to the provider.
              </p>
              <p className="mt-2">
                Bundu answers only from your actual workspace records — receipts, readings, runs and cases — and
                cites the exact record IDs behind every claim. Without a key, the deterministic screens still work
                exactly the same.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-[13px] text-slate-500">
              <p className="font-bold text-slate-600">Meanwhile, the deterministic answer to “what needs attention?”:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Open Cases are listed with their next action.</li>
                <li>The Reconciliation screen states residual and uncertainty.</li>
                <li>The Dashboard shows quality and trends for the selected site.</li>
              </ul>
            </div>
            <Button onClick={() => askStore.set(false)} variant="secondary" size="sm">Close</Button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.length === 0 ? (
                <div className="space-y-2.5">
                  <p className="text-[13px] leading-relaxed text-slate-500">
                    Ask anything about <strong className="text-slate-700">this workspace</strong> — I answer only from
                    your records and cite the IDs I used.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:border-water hover:text-water-deep"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {msgs.map((m, i) => (
                <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "items-start gap-2")}>
                  {m.role === "assistant" ? <div className="mt-1 h-7 w-7 shrink-0"><BunduFace mood="idle" size={28} /></div> : null}
                  <div
                    className={cx(
                      "anim-fade max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      m.role === "user" ? "bg-water text-white" : "border border-slate-200 bg-slate-50 text-slate-700",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.citations && m.citations.length > 0 ? (
                      <p className="mt-1.5 font-mono text-[10.5px] text-slate-400">sources: {m.citations.join(", ")}</p>
                    ) : null}
                    {m.followups && m.followups.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.followups.map((f) => (
                          <button
                            key={f}
                            onClick={() => ask(f)}
                            className="rounded-full border border-water/40 bg-white px-2.5 py-1 text-[11px] font-bold text-water-deep hover:bg-[#e8f1ff]"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {busy ? (
                <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-400">
                  <div className="h-7 w-7"><BunduFace mood="think" size={28} /></div>
                  Bundu is checking the records…
                </div>
              ) : null}
              {error ? (
                <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-semibold text-danger">
                  {error}
                </p>
              ) : null}
            </div>

            <form
              className="border-t border-slate-100 p-3"
              onSubmit={(e) => { e.preventDefault(); ask(input); }}
            >
              <div className="flex items-end gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about receipts, readings, the balance…"
                  aria-label="Ask Bundu a question about this workspace"
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-[13px] text-ink focus:border-water"
                  maxLength={400}
                />
                <Button size="sm" type="submit" disabled={!input.trim() || busy} aria-label="Send question">
                  <IconArrowRight />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function useSyncOpen(): boolean {
  const [open, setOpen] = useState(askStore.get());
  useEffect(() => {
    const unsub = askStore.subscribe(() => setOpen(askStore.get()));
    return () => { unsub(); };
  }, []);
  return open;
}
