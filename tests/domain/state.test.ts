import { describe, expect, it } from "vitest";
import {
  assertTransition,
  makeAuditEvent,
  makeId,
  TransitionError,
} from "../../src/domain/state";

describe("investigation transitions", () => {
  it("allows the standard path and the verified-duplicate shortcut", () => {
    expect(() => assertTransition("open", "in-review")).not.toThrow();
    expect(() => assertTransition("in-review", "resolved")).not.toThrow();
    expect(() => assertTransition("open", "resolved")).not.toThrow();
    expect(() => assertTransition("in-review", "action-required")).not.toThrow();
    expect(() => assertTransition("resolved", "reopened")).not.toThrow();
    expect(() => assertTransition("reopened", "in-review")).not.toThrow();
  });
  it("blocks illegal transitions", () => {
    expect(() => assertTransition("open", "action-required")).toThrow(TransitionError);
    expect(() => assertTransition("resolved", "open")).toThrow(TransitionError);
    expect(() => assertTransition("action-required", "open")).toThrow(TransitionError);
  });
});

describe("ids and audit", () => {
  it("generates unique ids", () => {
    const a = makeId("dlv");
    const b = makeId("dlv");
    expect(a).not.toBe(b);
  });
  it("audit events capture actor, action and reason", () => {
    const e = makeAuditEvent("reviewer@demo", "delivery.voided", "Delivery", "dlv-1", {
      reason: "Duplicate of R-101",
      before: { status: "posted" },
      after: { status: "voided" },
    });
    expect(e.actor).toBe("reviewer@demo");
    expect(e.action).toBe("delivery.voided");
    expect(e.reason).toBe("Duplicate of R-101");
    expect(e.before).toEqual({ status: "posted" });
  });
});
