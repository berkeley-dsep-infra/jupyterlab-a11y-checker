import { ICellIssue, IGeneralCell } from "../../types.js";
import { findAllHtmlTags, stripHtmlComments } from "../../utils/sanitize.js";

export function detectTableIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: "code" | "markdown",
): ICellIssue[] {
  const notebookIssues: ICellIssue[] = [];

  // Find all <table>...</table> blocks using indexOf-based scanning (no ReDoS)
  const tables = findAllHtmlTags(rawMarkdown, "table");

  for (const { match: tableHtml, start, end } of tables) {
    // Strip HTML comments so that tags inside comments are not counted
    const uncommented = stripHtmlComments(tableHtml);

    // Check for tables without <th> tags
    if (!/<th[\s>]/i.test(uncommented)) {
      notebookIssues.push({
        cellIndex,
        cellType,
        violationId: "table-missing-header",
        issueContentRaw: tableHtml,
        metadata: {
          offsetStart: start,
          offsetEnd: end,
        },
      });
    }

    // Check for tables without <caption> tags
    if (!/<caption[\s>]/i.test(uncommented)) {
      notebookIssues.push({
        cellIndex,
        cellType,
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

    while ((thMatch = thRegex.exec(uncommented)) !== null) {
      const attributes = thMatch[1];
      if (!/(?:^|\s)scope\s*=/i.test(attributes)) {
        hasMissingScope = true;
        break;
      }
    }

    if (hasMissingScope) {
      notebookIssues.push({
        cellIndex,
        cellType,
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
