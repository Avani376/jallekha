"use client";

/**
 * Workspace settings: AI assistance (operator-provided key, stored only in
 * this browser) and workspace data actions. Saving never writes the key to
 * the reconciliation record, audit events, or exports.
 */

import { useState } from "react";
import { useWorkspace } from "@/data/store";
import { AI_DEFAULTS, aiReady, clearAiSettings, loadAiSettings, maskKey, saveAiSettings, type AiSettings } from "@/lib/ai/settings";
import { testConnection } from "@/lib/ai/client";
import { Button, Field, Input, Modal, StatusPill } from "@/components/ui";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mode, actions } = useWorkspace();
  const [cfg, setCfg] = useState<AiSettings>(() => loadAiSettings());
  const [saved, setSaved] = useState<null | "ok" | "cleared">(null);
  const [test, setTest] = useState<null | { ok: boolean; message: string }>(null);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  const persist = (next: AiSettings) => {
    setCfg(next);
    saveAiSettings(next);
    setSaved("ok");
    setTest(null);
  };

  const doTest = async () => {
    setTesting(true);
    setTest(null);
    const res = await testConnection(cfg);
    setTest(res.ok ? { ok: true, message: `Connected — model replied "${res.model}"` } : { ok: false, message: res.message });
    setTesting(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" wide>
      <div className="space-y-6">
        {/* AI assistance */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-[15px] font-extrabold text-ink">AI assistance</h3>
            <StatusPill tone={aiReady(cfg) ? "ok" : "neutral"}>
              {aiReady(cfg) ? "Enabled" : "Off"}
            </StatusPill>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
            Bring your own key. The key is stored <strong>only in this browser</strong> and is sent directly to the
            provider endpoint you configure — never to JalLekha servers, exports, or audit records. The deterministic
            engine never depends on AI; explanations fall back to rule-based text if the call fails.
          </p>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={(e) => persist({ ...cfg, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Enable AI-assisted explanations and note drafting
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="API base URL" htmlFor="ai-base" hint="OpenAI-compatible /chat/completions endpoint">
                <Input
                  id="ai-base"
                  value={cfg.baseUrl}
                  onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })}
                  placeholder={AI_DEFAULTS.baseUrl}
                />
              </Field>
              <Field label="Model" htmlFor="ai-model" hint="Must be eligible on your plan">
                <Input id="ai-model" value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder={AI_DEFAULTS.model} />
              </Field>
            </div>
            <Field
              label="API key"
              htmlFor="ai-key"
              hint={`Stored locally (${maskKey(cfg.apiKey)}). Prefer a limited, revocable key.`}
            >
              <div className="flex gap-2">
                <Input
                  id="ai-key"
                  type={showKey ? "text" : "password"}
                  value={cfg.apiKey}
                  onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
                  placeholder="paste your key"
                  autoComplete="off"
                />
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowKey(!showKey)}>
                  {showKey ? "Hide" : "Show"}
                </Button>
              </div>
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => persist(cfg)}>Save settings</Button>
              <Button size="sm" variant="secondary" onClick={doTest} disabled={testing || !cfg.apiKey || !cfg.baseUrl || !cfg.model}>
                {testing ? "Testing…" : "Test connection"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearAiSettings();
                  const fresh = { enabled: false, ...AI_DEFAULTS, apiKey: "" };
                  setCfg(fresh);
                  setSaved("cleared");
                  setTest(null);
                }}
              >
                Remove key
              </Button>
            </div>
            {saved === "ok" ? <p className="text-xs font-semibold text-verd">Settings saved to this browser.</p> : null}
            {saved === "cleared" ? <p className="text-xs font-semibold text-slate-500">Key removed from this browser.</p> : null}
            {test ? (
              <p role="status" className={`text-xs font-semibold ${test.ok ? "text-verd" : "text-danger"}`}>
                {test.ok ? "✓ " : "✕ "}
                {test.message}
              </p>
            ) : null}
          </div>
        </section>

        <div className="border-t border-slate-100 pt-5">
          {/* Workspace data */}
          <h3 className="font-display text-[15px] font-extrabold text-ink">Workspace data</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
            {mode === "demo"
              ? "Demo mode holds seeded synthetic sites. Resetting restores that seed — never reset a real workspace."
              : "Your records live in this browser only. Use Reports → Export workspace (JSON) to back up or move them."}
          </p>
          <div className="mt-3">
            {mode === "demo" ? (
              <Button size="sm" variant="secondary" onClick={() => { actions.resetWorkspace(); onClose(); }}>
                Reset demo data to seed
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={confirmDelete !== "DELETE"}
                  onClick={() => { actions.resetWorkspace(); setConfirmDelete(""); onClose(); }}
                >
                  Delete all my records
                </Button>
                <Field label="Type DELETE to confirm" htmlFor="confirm-delete" hint="This permanently clears your records from this browser.">
                  <Input id="confirm-delete" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder="DELETE" />
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
