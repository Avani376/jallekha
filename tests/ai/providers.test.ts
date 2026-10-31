import { describe, expect, it } from "vitest";
import {
  AI_PROVIDERS,
  AiConfigError,
  isAiLive,
  resolveAiConfig,
} from "../../src/lib/ai/providers";

describe("AI provider configuration resolver", () => {
  it("is disabled by default (no AI_MODE)", () => {
    const cfg = resolveAiConfig({});
    expect(cfg.mode).toBe("disabled");
    expect(cfg.apiKey).toBeNull();
    expect(cfg.model).toBeNull();
    expect(cfg.baseUrl).toBeNull();
  });

  it("is disabled for any AI_MODE other than live, without reading keys", () => {
    for (const m of ["disabled", "", "off", "LIVE-typo", "enabled"]) {
      const cfg = resolveAiConfig({ AI_MODE: m, OPENAI_API_KEY: "sk-should-not-matter" });
      expect(cfg.mode).toBe("disabled");
    }
  });

  it("requires a provider when mode is live", () => {
    expect(() => resolveAiConfig({ AI_MODE: "live" })).toThrowError(AiConfigError);
    expect(() => resolveAiConfig({ AI_MODE: "live" })).toThrowError(/AI_PROVIDER/);
  });

  it("rejects unknown providers with the valid list", () => {
    expect(() => resolveAiConfig({ AI_MODE: "live", AI_PROVIDER: "glm9" })).toThrowError(
      /openai, anthropic, zai, custom/,
    );
  });

  it("openai: requires its key when live", () => {
    expect(() => resolveAiConfig({ AI_MODE: "live", AI_PROVIDER: "openai" })).toThrowError(
      /OPENAI_API_KEY/,
    );
    // Empty string counts as unset.
    expect(() => resolveAiConfig({ AI_MODE: "live", AI_PROVIDER: "openai", OPENAI_API_KEY: "  " })).toThrowError(
      /OPENAI_API_KEY/,
    );
  });

  it("openai: resolves with the documented default base URL and no hardcoded model", () => {
    const cfg = resolveAiConfig({
      AI_MODE: "live",
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      AI_MODEL: "my-plan-model",
    });
    expect(cfg.mode).toBe("live");
    expect(cfg.provider).toBe("openai");
    expect(cfg.apiStyle).toBe("openai-compatible");
    expect(cfg.baseUrl).toBe("https://api.openai.com/v1");
    expect(cfg.model).toBe("my-plan-model");
    expect(cfg.apiKey).toBe("test-key");
  });

  it("openai: honors an explicit AI_BASE_URL override", () => {
    const cfg = resolveAiConfig({
      AI_MODE: "live",
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "k",
      AI_MODEL: "m",
      AI_BASE_URL: "https://gateway.example.internal/v1",
    });
    expect(cfg.baseUrl).toBe("https://gateway.example.internal/v1");
  });

  it("zai: requires AI_BASE_URL (no unverified endpoint is assumed)", () => {
    expect(() =>
      resolveAiConfig({ AI_MODE: "live", AI_PROVIDER: "zai", ZAI_API_KEY: "k", AI_MODEL: "m" }),
    ).toThrowError(/AI_BASE_URL/);
    const cfg = resolveAiConfig({
      AI_MODE: "live",
      AI_PROVIDER: "zai",
      ZAI_API_KEY: "k",
      AI_MODEL: "m",
      AI_BASE_URL: "https://verified-by-operator.example/v1",
    });
    expect(cfg.provider).toBe("zai");
    expect(cfg.baseUrl).toBe("https://verified-by-operator.example/v1");
  });

  it("anthropic: resolves with its documented root and anthropic wire style", () => {
    const cfg = resolveAiConfig({
      AI_MODE: "live",
      AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "k",
      AI_MODEL: "m",
    });
    expect(cfg.provider).toBe("anthropic");
    expect(cfg.apiStyle).toBe("anthropic");
    expect(cfg.baseUrl).toBe("https://api.anthropic.com");
  });

  it("custom: requires AI_API_KEY (or AI_KEY_VAR) and AI_BASE_URL", () => {
    expect(() =>
      resolveAiConfig({ AI_MODE: "live", AI_PROVIDER: "custom", AI_MODEL: "m", AI_BASE_URL: "https://x" }),
    ).toThrowError(/AI_API_KEY/);
    const viaVar = resolveAiConfig({
      AI_MODE: "live",
      AI_PROVIDER: "custom",
      AI_MODEL: "m",
      AI_BASE_URL: "https://x",
      AI_KEY_VAR: "MY_PROVIDER_KEY",
      MY_PROVIDER_KEY: "k",
    });
    expect(viaVar.mode).toBe("live");
    expect(viaVar.apiKey).toBe("k");
  });

  it("requires AI_MODEL when live (model ids come from the operator's plan)", () => {
    expect(() =>
      resolveAiConfig({ AI_MODE: "live", AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }),
    ).toThrowError(/AI_MODEL/);
  });

  it("isAiLive never throws and matches the resolver", () => {
    expect(isAiLive({})).toBe(false);
    expect(isAiLive({ AI_MODE: "live" })).toBe(false); // invalid -> not live, no throw
    expect(isAiLive({ AI_MODE: "live", AI_PROVIDER: "openai", OPENAI_API_KEY: "k", AI_MODEL: "m" })).toBe(true);
  });

  it("registry providers all declare a key variable and wire style", () => {
    for (const spec of Object.values(AI_PROVIDERS)) {
      expect(spec.label.length).toBeGreaterThan(0);
      expect(["openai-compatible", "anthropic"]).toContain(spec.apiStyle);
      expect(spec.apiKeyEnv !== null || spec.id === "custom").toBe(true);
    }
  });

  it("error messages never contain key values", () => {
    try {
      resolveAiConfig({ AI_MODE: "live", AI_PROVIDER: "openai", OPENAI_API_KEY: "" });
      throw new Error("expected AiConfigError");
    } catch (e) {
      expect(e).toBeInstanceOf(AiConfigError);
      expect((e as Error).message).not.toContain("sk-");
    }
  });
});
