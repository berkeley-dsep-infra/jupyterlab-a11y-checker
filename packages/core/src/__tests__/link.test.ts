import { describe, it, expect } from "vitest";
import { detectLinkIssuesInCell } from "../detection/category/link.js";

function detectLinks(markdown: string) {
  return detectLinkIssuesInCell(markdown, 0, "markdown");
}

describe("detectLinkIssuesInCell", () => {
  it("flags vague short link text", () => {
    const issues = detectLinks("[Click here](https://example.com)");
    expect(issues).toHaveLength(1);
    expect(issues[0].violationId).toBe("link-discernible-text");
  });

  it("passes descriptive link text", () => {
    const issues = detectLinks("[UC Berkeley a11y guide](https://example.com)");
    expect(issues).toHaveLength(0);
  });

  it("flags URL-only link text", () => {
    const issues = detectLinks("[https://example.com](https://example.com)");
    expect(issues).toHaveLength(1);
  });

  it("flags empty HTML link", () => {
    const issues = detectLinks('<a href="https://example.com"></a>');
    expect(issues).toHaveLength(1);
  });

  it("passes HTML link with aria-label", () => {
    const issues = detectLinks(
      '<a href="https://example.com" aria-label="Guide"></a>',
    );
    expect(issues).toHaveLength(0);
  });

  it("does not flag markdown image links", () => {
    const issues = detectLinks("![](img.png)");
    expect(issues).toHaveLength(0);
  });

  it("passes long vague text (trade-off by design)", () => {
    const issues = detectLinks(
      "[Click here to read our full guide](https://example.com)",
    );
    expect(issues).toHaveLength(0);
  });
});
