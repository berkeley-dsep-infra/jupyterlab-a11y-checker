import { IGeneralCell, ICellIssue } from "../../types.js";
import { findAllHtmlTags } from "../../utils/sanitize.js";

export function detectTableIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
): ICellIssue[] {
  const notebookIssues: ICellIssue[] = [];

  // Find all <table>...</table> blocks using indexOf-based scanning (no ReDoS)
  const tables = findAllHtmlTags(rawMarkdown, "table");

  for (const { match: tableHtml, start, end } of tables) {
    // Check for tables without <th> tags
    if (!/<th[\s>]/i.test(tableHtml)) {
      notebookIssues.push({
        cellIndex,
        cellType: cellType as "code" | "markdown",
        violationId: "table-missing-header",
        issueContentRaw: tableHtml,
        metadata: {
          offsetStart: start,
          offsetEnd: end,
        },
      });
    }

    // Check for tables without <caption> tags
    if (!/<caption[\s>]/i.test(tableHtml)) {
      notebookIssues.push({
        cellIndex,
        cellType: cellType as "code" | "markdown",
        violationId: "table-missing-caption",
        issueContentRaw: tableHtml,
        metadata: {
          offsetStart: start,
          offsetEnd: end,
        },
      });
    }

    // Check for tables with <th> tags but missing scope attributes
    const thRegex = /<th\b([^>]*)>/gi;
    let thMatch;
    let hasMissingScope = false;

    while ((thMatch = thRegex.exec(tableHtml)) !== null) {
      const attributes = thMatch[1];
      if (!attributes.toLowerCase().includes("scope=")) {
        hasMissingScope = true;
        break;
      }
    }

    if (hasMissingScope) {
      notebookIssues.push({
        cellIndex,
        cellType: cellType as "code" | "markdown",
        violationId: "table-missing-scope",
        issueContentRaw: tableHtml,
        metadata: {
          offsetStart: start,
          offsetEnd: end,
        },
      });
    }
  }

  return notebookIssues;
}

export async function analyzeTableIssues(
  cells: IGeneralCell[],
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell || cell.type !== "markdown") {
      continue;
    }

    const content = cell.source;
    if (!content.trim()) {
      continue;
    }

    const cellIssues = detectTableIssuesInCell(content, i, "markdown");
    notebookIssues.push(...cellIssues);
  }

  return notebookIssues;
}
