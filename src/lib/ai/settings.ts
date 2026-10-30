/**
 * AI assistance settings, persisted per browser (localStorage). The API key
 * belongs to the operator: it is stored only in this browser and sent
 * directly to the configured provider endpoint — never to JalLekha servers,
 * never written into exports, audit events, or the reconciliation record.
 */

export interface AiSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const AI_DEFAULTS: Omit<AiSettings, "enabled" | "apiKey"> = {
  baseUrl: "https://api.z.ai/api/paas/v4",
  model: "glm-4.6",
};

const KEY = "jallekha.ai.v1";

export function loadAiSettings(): AiSettings {
  if (typeof window === "undefined") return { enabled: false, ...AI_DEFAULTS, apiKey: "" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiSettings>;
      return {
        enabled: parsed.enabled === true,
        baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl ? parsed.baseUrl : AI_DEFAULTS.baseUrl,
        apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
        model: typeof parsed.model === "string" && parsed.model ? parsed.model : AI_DEFAULTS.model,
      };
    }
  } catch {
    // Corrupt settings: fall back to defaults.
  }
  return { enabled: false, ...AI_DEFAULTS, apiKey: "" };
}

export function saveAiSettings(s: AiSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: settings stay for this session only.
  }
}

export function clearAiSettings(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable.
  }
}

/** Masked form for display: sk-abcd…wxyz */
export function maskKey(key: string): string {
  if (!key) return "not set";
  if (key.length <= 10) return key.slice(0, 2) + "…";
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}

export function aiReady(s: AiSettings): boolean {
  return s.enabled && s.apiKey.trim().length > 0 && s.baseUrl.trim().length > 0 && s.model.trim().length > 0;
}
