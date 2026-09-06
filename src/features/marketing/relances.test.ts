import { describe, expect, it } from "vitest";
import { buildReengagementMessage, isInactiveCustomer, isPendingOrder, whatsappUrl } from "./relances";

describe("reengagement", () => {
  it("identifies pending orders", () => {
    expect(isPendingOrder("to_confirm")).toBe(true);
    expect(isPendingOrder("delivered")).toBe(false);
  });

  it("identifies customers inactive for thirty days", () => {
    expect(isInactiveCustomer("2026-08-01T00:00:00.000Z", new Date("2026-09-04T00:00:00.000Z"))).toBe(true);
    expect(isInactiveCustomer("2026-08-20T00:00:00.000Z", new Date("2026-09-04T00:00:00.000Z"))).toBe(false);
  });

  it("builds an explicit WhatsApp message and URL", () => {
    const message = buildReengagementMessage({ name: "Awa", orderNumber: "VF-0004", kind: "pending_order" });
    expect(message).toContain("Awa");
    expect(message).toContain("VF-0004");
    expect(whatsappUrl("+225 07 00 00 00", message)).toContain("https://wa.me/22507000000?text=");
  });
});
