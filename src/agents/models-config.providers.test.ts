import { describe, it, expect } from "vitest";
import { normalizeGoogleModelId } from "./models-config.providers.js";

describe("normalizeGoogleModelId", () => {
  it("normalizes gemini-flash-1.5 to gemini-1.5-flash", () => {
    expect(normalizeGoogleModelId("gemini-flash-1.5")).toBe("gemini-1.5-flash");
  });

  it("normalizes gemini-pro-1.5 to gemini-1.5-pro", () => {
    expect(normalizeGoogleModelId("gemini-pro-1.5")).toBe("gemini-1.5-pro");
  });

  it("normalizes gemini-3-pro to gemini-3-pro-preview", () => {
    expect(normalizeGoogleModelId("gemini-3-pro")).toBe("gemini-3-pro-preview");
  });

  it("passes through unknown models", () => {
    expect(normalizeGoogleModelId("gemini-1.5-flash")).toBe("gemini-1.5-flash");
    expect(normalizeGoogleModelId("other")).toBe("other");
  });
});
