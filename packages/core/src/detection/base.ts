import axe from "axe-core";
import { marked } from "marked";
import { ICellIssue, IGeneralCell, IImageProcessor } from "../types.js";
import {
  detectHeadingOneIssue,
  analyzeHeadingHierarchy,
} from "./category/heading.js";
import { detectImageIssuesInCell } from "./category/index.js";
import { detectTableIssuesInCell } from "./category/index.js";
import { detectColorIssuesInCell } from "./category/index.js";
import { detectLinkIssuesInCell } from "./category/index.js";

export async function analyzeCellsAccessibility(
  cells: IGeneralCell[],
  documentContext: Document,
  baseUrl: string,
  imageProcessor: IImageProcessor,
  notebookPath: string = "",
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // Add heading one check
  notebookIssues.push(...(await detectHeadingOneIssue(cells)));

  const tempDiv = documentContext.createElement("div");
  documentContext.body.appendChild(tempDiv);

  const axeConfig: axe.RunOptions = {
    runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    rules: {
      "image-alt": { enabled: false },
      "empty-heading": { enabled: false },
      "heading-order": { enabled: false },
      "page-has-heading-one": { enabled: false },
      "link-name": { enabled: false },
    },
  };

  try {
    // First, analyze heading hierarchy across the notebook
    const headingIssues = await analyzeHeadingHierarchy(cells);
    notebookIssues.push(...headingIssues);

    // Then analyze individual cells for other issues
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) {
        console.warn(`Skipping cell ${i}: Invalid cell or model`);
        continue;
      }

      const cellType = cell.type;
      if (cellType === "markdown") {
        const rawMarkdown = cell.source;
        if (rawMarkdown.trim()) {
          try {
            tempDiv.innerHTML = await marked.parse(rawMarkdown);
          } catch (err) {
            console.error(`marked.parse() failed for cell ${i}:`, err);
            continue;
          }

          const results = await axe.run(tempDiv, axeConfig);
          const violations = results.violations;

          // Can have multiple violations in a single cell
          if (violations.length > 0) {
            violations.forEach((violation) => {
              violation.nodes.forEach((node) => {
                // Extract WCAG SC from axe tags (e.g. "wcag111" → "1.1.1")
                const wcagTag = violation.tags.find((t) =>
                  /^wcag\d{3,4}$/.test(t),
                );
                const wcagSc = wcagTag
                  ? wcagTag.replace("wcag", "").split("").join(".")
                  : undefined;

                notebookIssues.push({
                  cellIndex: i,
                  cellType: cellType,
                  violationId: violation.id,
                  issueContentRaw: node.html,
                  customDescription: violation.description,
                  metadata: { wcagSc },
                  detectedBy: "axe-core",
                });
              });
            });
          }

          // Image Issues
          notebookIssues.push(
            ...(await detectImageIssuesInCell(
              rawMarkdown,
              i,
              cellType,
              notebookPath,
              baseUrl,
              imageProcessor,
              cell.attachments,
            )),
          );

          // Table Issues
          notebookIssues.push(
            ...detectTableIssuesInCell(rawMarkdown, i, cellType),
          );

          // Color Issues (OCR-based detection — results may be inaccurate)
          notebookIssues.push(
            ...(await detectColorIssuesInCell(
              rawMarkdown,
              i,
              cellType,
              notebookPath,
              baseUrl,
              imageProcessor,
              cell.attachments,
            )),
          );

          // Link Issues
          notebookIssues.push(
            ...detectLinkIssuesInCell(rawMarkdown, i, cellType),
          );
        }
      } else if (cellType === "code") {
        // Code cell analysis not implemented yet
      }
    }
  } finally {
    tempDiv.remove();
  }

  return notebookIssues;
}

// Analyze a single cell (content-based categories only). Headings are excluded
// because heading structure depends on the entire notebook.
export async function analyzeCellIssues(
  cell: IGeneralCell,
  documentContext: Document,
  baseUrl: string,
  imageProcessor: IImageProcessor,
  notebookPath: string = "",
): Promise<ICellIssue[]> {
  const issues: ICellIssue[] = [];

  const cellType = cell.type;
  if (cellType !== "markdown") {
    return issues;
  }

  const rawMarkdown = cell.source;
  if (!rawMarkdown.trim()) {
    return issues;
  }

  // Images
  issues.push(
    ...(await detectImageIssuesInCell(
      rawMarkdown,
      cell.cellIndex,
      cellType,
      notebookPath,
      baseUrl,
      imageProcessor,
      cell.attachments,
    )),
  );

  // Tables
  issues.push(
    ...detectTableIssuesInCell(rawMarkdown, cell.cellIndex, cellType),
  );

  // Color Issues (OCR-based detection — results may be inaccurate)
  issues.push(
    ...(await detectColorIssuesInCell(
      rawMarkdown,
      cell.cellIndex,
      cellType,
      notebookPath,
      baseUrl,
      imageProcessor,
      cell.attachments,
    )),
  );

  // Links
  issues.push(...detectLinkIssuesInCell(rawMarkdown, cell.cellIndex, cellType));

  return issues;
}

/**
 * CLI-specific analysis function.
 * Excludes: axe-core (requires DOM)
 */
export async function analyzeCellsAccessibilityCLI(
  cells: IGeneralCell[],
  imageProcessor: IImageProcessor,
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // 1. Heading One Check
  notebookIssues.push(...(await detectHeadingOneIssue(cells)));

  // 2. Heading Hierarchy
  const headingIssues = await analyzeHeadingHierarchy(cells);
  notebookIssues.push(...headingIssues);

  // 3. Per-cell checks
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.type === "markdown" && cell.source.trim()) {
      const rawMarkdown = cell.source;

      // Image Issues
      notebookIssues.push(
        ...(await detectImageIssuesInCell(
          rawMarkdown,
          i,
          cell.type,
          "", // notebookPath
          "", // baseUrl
          imageProcessor,
          cell.attachments,
        )),
      );

      // Table Issues
      notebookIssues.push(
        ...detectTableIssuesInCell(rawMarkdown, i, cell.type),
      );

      // Link Issues
      notebookIssues.push(...detectLinkIssuesInCell(rawMarkdown, i, cell.type));
    }
  }

  return notebookIssues;
}
