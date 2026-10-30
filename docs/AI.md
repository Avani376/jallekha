# AI integration

JalLekha's engine is deterministic and never depends on AI. AI assistance is
**opt-in** and uses the operator's own key.

## How it works

- Settings → AI assistance: enable, set the base URL (default
  `https://api.z.ai/api/paas/v4`), paste the API key, choose the model
  (default `glm-4.6`), then **Test connection**.
- Settings persist in `localStorage` (`jallekha.ai.v1`) in the operator's
  browser only. The key is sent **directly** from the browser to the
  provider endpoint — it never touches JalLekha servers, exports, audit
  events, or screenshots of the app.
- Requests are OpenAI-compatible `POST {baseUrl}/chat/completions` with a
  30 s timeout, temperature 0.2, and strict response schemas (Zod). Any
  failure — missing key, network/CORS, auth (401/403), provider error,
  timeout, malformed JSON — falls back to the deterministic rule-based
  explanation, visibly labeled. Nothing partial is ever shown as AI output.

## Features

1. **Explain with AI** (Reconciliation screen). The prompt includes only the
   immutable run: status, residual, bounds, missing fields, blocking
   problems, scope assumption, allowed source IDs, and finding titles. The
   system prompt forbids blame, invented measurements, and embedded
   instructions. The UI renders model *text* but keeps all *numbers* from
   the domain result; observation source IDs are filtered to IDs that
   actually exist in the run.
2. **Draft fields from note** (Add delivery). The operator's raw note is
   treated as untrusted text; the model extracts only explicitly stated
   fields and returns null for anything unstated, plus warnings. Drafts
   prefill the form — deterministic validation still gates saving, and
   nothing is posted automatically.

## Shared deployments (hardening)

Browser-direct calls suit single-operator use. For a shared deployment where
the key must live server-side, proxy the calls instead of exposing keys:

1. Add a route handler (`src/app/api/ai/route.ts` in a **server-mode**
   deployment — static exports exclude API routes) that forwards
   `{ messages, maxTokens }` to the provider using a server-only env key
   (`AI_MODE=live`, `ZAI_API_KEY`, `ZAI_MODEL`, `ZAI_BASE_URL`), with per-IP
   rate limiting and the same schema validation.
2. Point the app at it by setting the Settings base URL to your deployment's
   `/api/ai` path (the proxy returns the same `choices[0].message.content`
   shape, so the client code is unchanged).
3. Keep the same guarantees: schema validation, timeouts, labeled fallback,
   and no key in any client response.

## Cost control

`max_tokens` is capped per call (900 for explanations, 500 for drafts,
8 for the connection test) and input text is truncated at 6,000 characters.
Calls happen only on explicit button presses — never automatically, never
during test runs.
