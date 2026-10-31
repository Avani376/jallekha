/**
 * Provider-neutral AI configuration resolver (SERVER-SIDE ONLY).
 *
 * The deterministic engine (src/domain) never imports this module; AI remains
 * an optional, independent layer. This resolver reads the operator's server
 * environment (.env — never committed) and turns it into a validated config
 * or a clear, actionable error. It is the configuration half of the provider
 * interface:
 *
 *   AI configuration (env) -> resolveAiConfig() -> provider config
 *     -> [HTTP adapters per apiStyle — wired at the server proxy, docs/AI.md]
 *
 * There are NO hardcoded model identifiers and no unverified endpoints:
 * OpenAI and Anthropic have documented stable API roots; any other provider
 * must set AI_BASE_URL explicitly after verifying it in current provider
 * documentation. API keys are only ever read from the server environment —
 * they are never returned in error messages, never logged, and never sent
 * to the browser (the in-app browser-direct feature uses the operator's OWN
 * key from localStorage instead; see settings.ts).
 */

export type AiProviderId = "openai" | "anthropic" | "zai" | "custom";
export type AiApiStyle = "openai-compatible" | "anthropic";
export type AiMode = "disabled" | "live";

export interface ProviderSpec {
  id: AiProviderId;
  label: string;
  /** Request/response wire format the provider speaks. */
  apiStyle: AiApiStyle;
  /** Documented stable API root, or null when the operator must supply one. */
  defaultBaseUrl: string | null;
  /** Environment variable holding this provider's API key. */
  apiKeyEnv: "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "ZAI_API_KEY" | null;
}

export const AI_PROVIDERS: Readonly<Record<AiProviderId, ProviderSpec>> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    apiStyle: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    apiStyle: "anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
    apiKeyEnv: "ANTHROPIC_API_KEY",
  },
  zai: {
    id: "zai",
    label: "Z.ai / GLM",
    apiStyle: "openai-compatible",
    // No endpoint is assumed: verify it in current provider docs and set
    // AI_BASE_URL in the server environment.
    defaultBaseUrl: null,
    apiKeyEnv: "ZAI_API_KEY",
  },
  custom: {
    id: "custom",
    label: "Custom OpenAI-compatible endpoint",
    apiStyle: "openai-compatible",
    defaultBaseUrl: null,
    apiKeyEnv: null, // bring your own env var name via AI_KEY_VAR, or inline via AI_API_KEY
  },
};

export interface ResolvedAiConfig {
  mode: AiMode;
  provider: AiProviderId | null;
  apiStyle: AiApiStyle | null;
  baseUrl: string | null;
  model: string | null;
  /** Present only in mode "live"; never log or serialize it. */
  apiKey: string | null;
}

/** Raised for invalid AI configuration. Messages never contain key values. */
export class AiConfigError extends Error {}

function orEmpty(v: string | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Resolve AI configuration from a server environment.
 *
 * Defaults to { mode: "disabled" } when AI_MODE is unset or anything other
 * than "live" — JalLekha never requires AI configuration, and a disabled
 * mode never reads key variables at all.
 */
export function resolveAiConfig(
  env: Record<string, string | undefined> = {},
): ResolvedAiConfig {
  const mode = orEmpty(env.AI_MODE).toLowerCase();
  if (mode !== "live") {
    return { mode: "disabled", provider: null, apiStyle: null, baseUrl: null, model: null, apiKey: null };
  }

  const providerId = orEmpty(env.AI_PROVIDER).toLowerCase() as AiProviderId;
  if (!providerId) {
    throw new AiConfigError("AI_MODE=live requires AI_PROVIDER (one of: openai, anthropic, zai, custom).");
  }
  const spec = AI_PROVIDERS[providerId];
  if (!spec) {
    throw new AiConfigError(`Unknown AI_PROVIDER "${providerId}". Valid providers: openai, anthropic, zai, custom.`);
  }

  // Key resolution: custom providers may name their own env var via AI_KEY_VAR
  // or supply AI_API_KEY directly; registry providers use their declared var.
  let apiKey = "";
  if (spec.apiKeyEnv) {
    apiKey = orEmpty(env[spec.apiKeyEnv]);
    if (!apiKey) {
      throw new AiConfigError(`AI_MODE=live with provider "${providerId}" requires a non-empty ${spec.apiKeyEnv}.`);
    }
  } else {
    const keyVar = orEmpty(env.AI_KEY_VAR);
    apiKey = keyVar ? orEmpty(env[keyVar]) : orEmpty(env.AI_API_KEY);
    if (!apiKey) {
      throw new AiConfigError(
        `AI_MODE=live with provider "custom" requires AI_API_KEY (or AI_KEY_VAR naming the env var that holds the key).`,
      );
    }
  }

  const model = orEmpty(env.AI_MODEL);
  if (!model) {
    throw new AiConfigError(`AI_MODE=live requires AI_MODEL — set the model id available under your verified ${spec.label} plan.`);
  }

  const baseUrl = orEmpty(env.AI_BASE_URL) || spec.defaultBaseUrl;
  if (!baseUrl) {
    throw new AiConfigError(
      `AI_MODE=live with provider "${providerId}" requires AI_BASE_URL — set the API root after verifying it in the current ${spec.label} documentation.`,
    );
  }

  return { mode: "live", provider: providerId, apiStyle: spec.apiStyle, baseUrl, model, apiKey };
}

/**
 * True when the environment would enable live AI right now. Never throws —
 * health checks and startup logs can call this freely (it exposes no values).
 */
export function isAiLive(env: Record<string, string | undefined> = {}): boolean {
  try {
    return resolveAiConfig(env).mode === "live";
  } catch {
    return false;
  }
}
