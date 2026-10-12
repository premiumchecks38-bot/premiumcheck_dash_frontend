import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/client/api";
import { applyFieldErrors, errorMessage, fieldErrors, waitText } from "@/lib/client/errors";

describe("errorMessage", () => {
  it("prefers the code's message", () => {
    expect(errorMessage(new ApiError(403, "OWNER_PROTECTED", "raw"))).toBe(
      "The owner account cannot be changed.",
    );
  });

  it("falls back to the status message for 403 and 409", () => {
    expect(errorMessage(new ApiError(403, "SOMETHING_NEW", "raw"))).toBe(
      "You do not have permission to do that.",
    );
    expect(errorMessage(new ApiError(409, "SOMETHING_NEW", "raw"))).toMatch(
      /changed by someone else/,
    );
  });

  it("uses the backend message when neither is known", () => {
    expect(errorMessage(new ApiError(418, "TEAPOT", "I am a teapot."))).toBe("I am a teapot.");
  });

  it("tells the person how long to wait on 429", () => {
    expect(errorMessage(new ApiError(429, "RATE_LIMITED", "raw", null, 240))).toBe(
      "Too many attempts. Try again in 4 minutes.",
    );
    expect(errorMessage(new ApiError(429, "RATE_LIMITED", "raw"))).toBe(
      "Too many attempts. Please wait and try again.",
    );
  });

  it("has a generic message for anything that is not an ApiError", () => {
    expect(errorMessage(new Error("boom"))).toBe("Something went wrong. Try again.");
  });
});

describe("waitText", () => {
  it("rounds to seconds or whole minutes", () => {
    expect(waitText(0.2)).toBe("1 second");
    expect(waitText(45)).toBe("45 seconds");
    expect(waitText(60)).toBe("1 minute");
    expect(waitText(61)).toBe("2 minutes");
  });
});

describe("422 field errors", () => {
  const error = new ApiError(422, "VALIDATION_ERROR", "Invalid", [
    { loc: ["body", "email"], message: "Enter a valid email", type: "value_error" },
    {
      loc: ["body", "permissions", 0, "page"],
      message: "Value error, Unknown page",
      type: "value_error",
    },
    { loc: ["body", "email"], message: "Second email error is ignored", type: "value_error" },
  ]);

  it("maps each location to its last field name", () => {
    expect(fieldErrors(error)).toEqual({ email: "Enter a valid email", page: "Unknown page" });
  });

  it("ignores errors that are not 422", () => {
    expect(
      fieldErrors(new ApiError(400, "BAD", "x", [{ loc: ["body", "email"], message: "m" }])),
    ).toEqual({});
  });

  it("puts errors on form fields, renamed through the field map", () => {
    const setError = vi.fn();
    const applied = applyFieldErrors<{ emailAddress: string; page: string }>(error, setError, {
      email: "emailAddress",
    });
    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledWith("emailAddress", {
      type: "server",
      message: "Enter a valid email",
    });
    expect(setError).toHaveBeenCalledWith("page", { type: "server", message: "Unknown page" });
  });

  it("reports false when nothing could be placed on a field", () => {
    expect(applyFieldErrors(new ApiError(500, "X", "y"), vi.fn())).toBe(false);
  });
});
