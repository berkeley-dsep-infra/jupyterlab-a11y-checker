import { describe, it, expect } from "vitest";
import { detectTableIssuesInCell } from "../detection/category/table.js";

function detectTable(markdown: string) {
  return detectTableIssuesInCell(markdown, 0, "markdown");
}

describe("detectTableIssuesInCell", () => {
  it("flags table without <th>", () => {
    const issues = detectTable("<table><tr><td>A</td></tr></table>");
    const headerIssues = issues.filter(
      (i) => i.violationId === "table-missing-header",
    );
    expect(headerIssues).toHaveLength(1);
  });

  it("flags table without <caption>", () => {
    const issues = detectTable("<table><tr><th>A</th></tr></table>");
    const captionIssues = issues.filter(
      (i) => i.violationId === "table-missing-caption",
    );
    expect(captionIssues).toHaveLength(1);
  });

  it("flags table with <th> missing scope", () => {
    const issues = detectTable("<table><tr><th>A</th></tr></table>");
    const scopeIssues = issues.filter(
      (i) => i.violationId === "table-missing-scope",
    );
    expect(scopeIssues).toHaveLength(1);
  });

  it("passes complete table with caption, th, and scope", () => {
    const issues = detectTable(
      '<table><caption>T</caption><tr><th scope="col">A</th></tr></table>',
    );
    expect(issues).toHaveLength(0);
  });

  // P0 fix (Commit 1c): data-scope no longer falsely passes scope check
  it("flags <th data-scope> as missing real scope attribute", () => {
    const issues = detectTable(
      '<table><caption>T</caption><tr><th data-scope="col">A</th></tr></table>',
    );
    const scopeIssues = issues.filter(
      (i) => i.violationId === "table-missing-scope",
    );
    expect(scopeIssues).toHaveLength(1);
  });

  // P0 fix (Commit 1d): <th> inside HTML comment no longer counts
  it("flags table with <th> only in HTML comment", () => {
    const issues = detectTable(
      "<table><!-- <th>X</th> --><tr><td>A</td></tr></table>",
    );
    const headerIssues = issues.filter(
      (i) => i.violationId === "table-missing-header",
    );
    expect(headerIssues).toHaveLength(1);
  });
});
