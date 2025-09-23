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

  // Check if first cell is a code cell
  if (cells.length > 0 && cells[0].model.type === 'code') {
    notebookIssues.push({
      cellIndex: 0,
      cellType: 'code',
      violationId: 'heading-missing-h1',
      issueContentRaw: ''
    });
  }

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.model.type !== 'markdown') {
      continue;
    }

    const content = cell.model.sharedModel.getSource();
    if (!content.trim()) {
      continue;
    }

    // Use marked tokens to find the first heading and offsets in source
    const tokens: any[] = marked.lexer(content) as any[];
    let searchStart = 0;
    let foundFirst = false;
    for (const token of tokens) {
      let level: number | null = null;
      let rawHeading = '';

      if ((token as any).type === 'heading') {
        level = (token as any).depth;
        rawHeading = (token as any).raw || '';
      } else if ((token as any).type === 'html') {
        const rawHtml = (token as any).raw || '';
        const m = rawHtml.match(/<h([1-6])[^>]*>[\s\S]*?<\/h\1>/i);
        if (m) {
          level = parseInt(m[1], 10);
          rawHeading = m[0];
        }
      }

      if (level !== null) {
        const start = content.indexOf(rawHeading, searchStart);
        if (start === -1) {
          continue;
        }
        const end = start + rawHeading.length;
        searchStart = end;

        firstHeadingFound = true;

        if (level !== 1) {
          notebookIssues.push({
            cellIndex: i,
            cellType: 'markdown',
            violationId: 'heading-missing-h1',
            issueContentRaw: rawHeading
          });
        }
        foundFirst = true;
        break;
      }
    }
    if (foundFirst) {
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

      // Tokenize markdown and map tokens to source offsets for headings
      const tokens: any[] = marked.lexer(content) as any[];
      let searchStart = 0;
      for (const token of tokens) {
        let level: number | null = null;
        let rawHeading = '';
        let text = '';

        if ((token as any).type === 'heading') {
          level = (token as any).depth;
          rawHeading = (token as any).raw || '';
          text = (token as any).text || '';
        } else if ((token as any).type === 'html') {
          const rawHtml = (token as any).raw || '';
          const m = rawHtml.match(/<h([1-6])[^>]*>[\s\S]*?<\/h\1>/i);
          if (m) {
            level = parseInt(m[1], 10);
            rawHeading = m[0];
            text = rawHeading.replace(/<[^>]+>/g, '');
          }
        }

        if (level !== null) {
          // Bug Check: Is the rendered h1 really h1? (Markdown Setext-heading) -> Can be improved.
          if (
            level === 1 &&
            ((text || '').match(/(?<!\\)\$\$/g) || []).length === 1
          ) {
            continue;
          }

          const start = content.indexOf(rawHeading, searchStart);
          if (start === -1) {
            continue;
          }
          const end = start + rawHeading.length;
          searchStart = end;

          headingStructure.push({
            cellIndex: i,
            level,
            content: text,
            html: rawHeading,
            offsetStart: start,
            offsetEnd: end
          } as any);
        }
      }
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
          violationId: 'heading-multiple-h1',
          issueContentRaw: heading.html,
          metadata: {
            headingStructure: headingStructure.filter(
              h => h.level === 1 || h.level === 2
            ),
            offsetStart: (heading as any).offsetStart,
            offsetEnd: (heading as any).offsetEnd
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
            violationId: 'heading-duplicate-h2',
            issueContentRaw: heading.html,
            metadata: {
              headingStructure: headingStructure.filter(
                h => h.level === 1 || h.level === 2
              ),
              offsetStart: (heading as any).offsetStart,
              offsetEnd: (heading as any).offsetEnd
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
            violationId: 'heading-duplicate-h1-h2',
            issueContentRaw: heading.html,
            metadata: {
              headingStructure: headingStructure.filter(
                h => h.level === 1 || h.level === 2
              ),
              offsetStart: (heading as any).offsetStart,
              offsetEnd: (heading as any).offsetEnd
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
          issueContentRaw: current.html,
          metadata: {
            offsetStart: (current as any).offsetStart,
            offsetEnd: (current as any).offsetEnd
          }
        });
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
            previousHeadingLevel: previous.level,
            offsetStart: (current as any).offsetStart,
            offsetEnd: (current as any).offsetEnd
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
