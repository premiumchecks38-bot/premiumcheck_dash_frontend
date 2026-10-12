import { describe, expect, it } from "vitest";

import { penceToPounds, poundsToPence, refundSchema } from "@/lib/payments/refund";

const valid = { amount: "10.00", reason: "duplicate", note: "", cancelBooking: false };

function amountError(rules: Parameters<typeof refundSchema>[0], amount: string): string | null {
  const result = refundSchema(rules).safeParse({ ...valid, amount });
  if (result.success) return null;
  return result.error.issues.find((i) => i.path[0] === "amount")?.message ?? null;
}

describe("poundsToPence", () => {
  it("reads pounds with or without the sign, commas and pence", () => {
    expect(poundsToPence("12")).toBe(1200);
    expect(poundsToPence("12.5")).toBe(1250);
    expect(poundsToPence("£1,234.56")).toBe(123456);
    expect(poundsToPence(" 0.07 ")).toBe(7);
  });

  it("refuses anything that is not an amount", () => {
    expect(poundsToPence("")).toBeNull();
    expect(poundsToPence("abc")).toBeNull();
    expect(poundsToPence("1.234")).toBeNull();
    expect(poundsToPence("-5")).toBeNull();
  });

  it("formats pence as pounds", () => {
    expect(penceToPounds(13417)).toBe("134.17");
  });
});

describe("refund form rules", () => {
  it("accepts an amount within what is left", () => {
    expect(amountError({ remainingPence: 1000 }, "10.00")).toBeNull();
  });

  it("refuses zero and malformed amounts", () => {
    expect(amountError({ remainingPence: 1000 }, "0")).toBe(
      "Enter an amount in pounds, like 25.00",
    );
    expect(amountError({ remainingPence: 1000 }, "ten")).toBe(
      "Enter an amount in pounds, like 25.00",
    );
  });

  it("refuses more than the remaining amount", () => {
    expect(amountError({ remainingPence: 999 }, "10.00")).toBe("You can refund up to £9.99");
  });

  it("refuses more than the approval limit", () => {
    expect(amountError({ remainingPence: 20000, limitPence: 5000 }, "60.00")).toBe(
      "Refunds over £50.00 need an owner or admin",
    );
    expect(amountError({ remainingPence: 20000, limitPence: 5000 }, "50.00")).toBeNull();
  });

  it("reads the rules when it validates, so a limit learned later applies", () => {
    const rules: { remainingPence: number; limitPence?: number | null } = {
      remainingPence: 20000,
    };
    const schema = refundSchema(rules);
    expect(schema.safeParse({ ...valid, amount: "100.00" }).success).toBe(true);
    rules.limitPence = 5000;
    expect(schema.safeParse({ ...valid, amount: "100.00" }).success).toBe(false);
  });

  it("keeps the note short", () => {
    const result = refundSchema({ remainingPence: 1000 }).safeParse({
      ...valid,
      note: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
