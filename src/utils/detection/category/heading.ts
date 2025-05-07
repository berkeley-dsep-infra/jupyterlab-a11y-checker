import { Cell } from '@jupyterlab/cells';
import { ICellModel } from '@jupyterlab/cells';
import { NotebookPanel } from '@jupyterlab/notebook';
import { marked } from 'marked';
import { ICellIssue } from '../../types';

export async function detectHeadingOneIssue(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  cells: readonly Cell<ICellModel>[]
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];
  const tempDiv = document.createElement('div');

  // Find the first heading in the notebook
  let firstHeadingFound = false;
  let firstHeadingContent = '';

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.model.type !== 'markdown') {
      continue;
    }

    const content = cell.model.sharedModel.getSource();
    if (!content.trim()) {
      continue;
    }

    // Parse markdown to HTML
    tempDiv.innerHTML = await marked.parse(content);
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

    if (headings.length > 0) {
      firstHeadingFound = true;
      firstHeadingContent = headings[0].outerHTML;

      // Check if first heading is not h1
      const level = parseInt(headings[0].tagName[1]);
      if (level !== 1) {
        notebookIssues.push({
          cellIndex: i,
          cellType: 'markdown',
          violationId: 'heading-missing-h1',
          issueContentRaw: firstHeadingContent
        });
      }
      break;
    }
  }

  // If no headings found at all, suggest adding h1 at the top
  if (!firstHeadingFound) {
    notebookIssues.push({
      cellIndex: 0,
      cellType: 'markdown',
      violationId: 'heading-missing-h1',
      issueContentRaw: ''
    });
  }

  tempDiv.remove();
  return notebookIssues;
}

export async function analyzeHeadingHierarchy(
  panel: NotebookPanel
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];
  const cells = panel.content.widgets;
  const tempDiv = document.createElement('div');
  document.body.appendChild(tempDiv);

  try {
    // Create a complete heading structure that maps cell index to heading level and content
    // Use array to retain order of headings
    const headingStructure: Array<{
      cellIndex: number;
      level: number;
      content: string;
      html: string;
    }> = [];

    // First pass: collect all headings
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell || !cell.model || cell.model.type !== 'markdown') {
        continue;
      }

      const content = cell.model.sharedModel.getSource();
      if (!content.trim()) {
        continue;
      }

      // Parse markdown to HTML
      tempDiv.innerHTML = await marked.parse(content);

      // Find all headings in the cell
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

      headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        const text = heading.textContent || '';

        headingStructure.push({
          cellIndex: i,
          level,
          content: text,
          html: heading.outerHTML
        });
      });
    }

    // Track headings by level to detect duplicates
    // Only track h1 and h2 headings
    const h1Headings = new Map<string, number[]>();
    const h2Headings = new Map<string, number[]>();

    // First pass: collect all h1 and h2 headings
    headingStructure.forEach((heading, index) => {
      if (heading.level === 1) {
        const normalizedContent = heading.content.trim().toLowerCase();
        if (!h1Headings.has(normalizedContent)) {
          h1Headings.set(normalizedContent, []);
        }
        h1Headings.get(normalizedContent)!.push(index);
      } else if (heading.level === 2) {
        const normalizedContent = heading.content.trim().toLowerCase();
        if (!h2Headings.has(normalizedContent)) {
          h2Headings.set(normalizedContent, []);
        }
        h2Headings.get(normalizedContent)!.push(index);
      }
    });

    // Check for multiple h1 headings
    // First, find all h1 headings regardless of content
    const allH1Indices = headingStructure
      .map((heading, index) => (heading.level === 1 ? index : -1))
      .filter(index => index !== -1);

    // If there are multiple h1 headings, flag all but the first one
    if (allH1Indices.length > 1) {
      allH1Indices.slice(1).forEach(index => {
        const heading = headingStructure[index];
        notebookIssues.push({
          cellIndex: heading.cellIndex,
          cellType: 'markdown',
          violationId: 'heading-duplicate-h1',
          issueContentRaw: heading.html,
          metadata: {
            headingStructure: headingStructure.filter(
              h => h.level === 1 || h.level === 2
            )
          }
        });
      });
    }

    // Check for duplicate h2 headings
    h2Headings.forEach((indices, content) => {
      if (indices.length > 1) {
        // Flag all h2 headings after the first one
        indices.slice(1).forEach(index => {
          const heading = headingStructure[index];
          notebookIssues.push({
            cellIndex: heading.cellIndex,
            cellType: 'markdown',
            violationId: 'heading-duplicate',
            customDescription: 'Ensure identical h2 headings are not used.',
            customDetailedDescription:
              'This can be confusing for screen reader users as it creates redundant landmarks in the document structure. Please consider combining the sections or using different heading text.',
            issueContentRaw: heading.html,
            metadata: {
              headingStructure: headingStructure.filter(
                h => h.level === 1 || h.level === 2
              )
            }
          });
        });
      }
    });

    // Check for headings that appear in both h1 and h2
    h1Headings.forEach((h1Indices, content) => {
      if (h2Headings.has(content)) {
        // Flag all h2 headings that share content with h1
        h2Headings.get(content)!.forEach(index => {
          const heading = headingStructure[index];
          notebookIssues.push({
            cellIndex: heading.cellIndex,
            cellType: 'markdown',
            violationId: 'heading-duplicate',
            customDescription:
              'Ensure h1 and h2 headings do not share the same text.',
            customDetailedDescription:
              'This can be confusing for screen reader users as it creates redundant landmarks in the document structure. Please use different text for h1 and h2 headings.',
            issueContentRaw: heading.html,
            metadata: {
              headingStructure: headingStructure.filter(
                h => h.level === 1 || h.level === 2
              )
            }
          });
        });
      }
    });

    // Second pass: analyze heading structure for other issues
    for (let i = 0; i < headingStructure.length; i++) {
      const current = headingStructure[i];
      const previous = i > 0 ? headingStructure[i - 1] : null;

      // Check for empty headings
      if (!current.content.trim()) {
        notebookIssues.push({
          cellIndex: current.cellIndex,
          cellType: 'markdown',
          violationId: 'heading-empty',
          issueContentRaw: current.html
        });
        continue;
      }

      // Skip first heading (no previous to compare with)
      if (!previous) {
        continue;
      }

      // Check for invalid heading level skips
      // Only flag violations when skipping to lower levels (e.g., h2 to h4)
      // Allow skips when returning to higher levels (e.g., h4 to h2)
      const levelDiff = current.level - previous.level;
      if (levelDiff > 1) {
        // Only check when going to lower levels
        notebookIssues.push({
          cellIndex: current.cellIndex,
          cellType: 'markdown',
          violationId: 'heading-wrong-order',
          issueContentRaw: current.html,
          metadata: {
            previousHeadingLevel: previous.level
          }
        });
      }
    }
  } catch (error) {
    console.error('Error in heading hierarchy analysis:', error);
  } finally {
    tempDiv.remove();
  }

  return notebookIssues;
}
