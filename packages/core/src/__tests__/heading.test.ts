import { describe, it, expect } from "vitest";
import {
  detectHeadingOneIssue,
  analyzeHeadingHierarchy,
} from "../detection/category/heading.js";
import { IGeneralCell } from "../types.js";

function cell(
  source: string,
  type: IGeneralCell["type"] = "markdown",
  index = 0,
): IGeneralCell {
  return { cellIndex: index, type, source };
}

function cells(...sources: string[]): IGeneralCell[] {
  return sources.map((s, i) => cell(s, "markdown", i));
}

describe("detectHeadingOneIssue", () => {
  it("flags missing H1 when first cell starts with H2", async () => {
    const issues = await detectHeadingOneIssue(cells("## Subtitle"));
    expect(issues).toHaveLength(1);
    expect(issues[0].violationId).toBe("heading-missing-h1");
  });

  it("passes when first cell starts with ATX H1", async () => {
    const issues = await detectHeadingOneIssue(cells("# Title"));
    expect(issues).toHaveLength(0);
  });

  it("passes when first cell starts with HTML H1", async () => {
    const issues = await detectHeadingOneIssue(cells("<h1>Title</h1>"));
    expect(issues).toHaveLength(0);
  });

  it("returns no issues for empty cells array", async () => {
    const issues = await detectHeadingOneIssue([]);
    expect(issues).toHaveLength(0);
  });

  it("flags when first cell is code (not markdown)", async () => {
    const c: IGeneralCell[] = [
      cell("print('hi')", "code", 0),
      cell("# Title", "markdown", 1),
    ];
    const issues = await detectHeadingOneIssue(c);
    expect(issues).toHaveLength(1);
    expect(issues[0].violationId).toBe("heading-missing-h1");
  });

  // P0 fix (Commit 1a): H1 containing $$ is no longer dropped
  it("does not flag H1 containing $$", async () => {
    const issues = await detectHeadingOneIssue(cells("# Cost is $$"));
    expect(issues).toHaveLength(0);
  });
});

describe("analyzeHeadingHierarchy", () => {
  it("flags multiple H1 headings", async () => {
    const issues = await analyzeHeadingHierarchy(cells("# A", "# B"));
    const multiH1 = issues.filter(
      (i) => i.violationId === "heading-multiple-h1",
    );
    expect(multiH1).toHaveLength(1);
    expect(multiH1[0].cellIndex).toBe(1);
  });

  it("flags duplicate H2 headings", async () => {
    const issues = await analyzeHeadingHierarchy(cells("# A", "## X", "## X"));
    const dupH2 = issues.filter(
      (i) => i.violationId === "heading-duplicate-h2",
    );
    expect(dupH2).toHaveLength(1);
  });

  it("flags H1/H2 same text", async () => {
    const issues = await analyzeHeadingHierarchy(cells("# Same", "## Same"));
    const dup = issues.filter(
      (i) => i.violationId === "heading-duplicate-h1-h2",
    );
    expect(dup).toHaveLength(1);
  });

  it("flags wrong heading order (H2 -> H4)", async () => {
    const issues = await analyzeHeadingHierarchy(
      cells("# A", "## B", "#### D"),
    );
    const wrongOrder = issues.filter(
      (i) => i.violationId === "heading-wrong-order",
    );
    expect(wrongOrder).toHaveLength(1);
  });

  it("flags empty heading", async () => {
    const issues = await analyzeHeadingHierarchy(cells("# A", "### "));
    const empty = issues.filter((i) => i.violationId === "heading-empty");
    expect(empty).toHaveLength(1);
  });

  it("no issues for correct hierarchy", async () => {
    const issues = await analyzeHeadingHierarchy(cells("# A", "## B", "### C"));
    expect(issues).toHaveLength(0);
  });
});
