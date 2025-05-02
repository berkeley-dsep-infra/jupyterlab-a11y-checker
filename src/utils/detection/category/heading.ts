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
  //console.log('startingheading hierarchy analysis');
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
      //console.log(`Cell ${i}: Found ${headings.length} headings`);

      headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        const text = heading.textContent || '';
        //console.log(`  Level ${level} heading: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);

        headingStructure.push({
          cellIndex: i,
          level,
          content: text,
          html: heading.outerHTML
        });
      });
    }

    //console.log(`Total headings found: ${headingStructure.length}`);
    //console.log('Analyzing heading structure...');

    // Track headings by level to detect duplicates of content across a given heading level
    // Format: Map<Heading Level (h1 - h6), Map<Heading Content/Text, Array of Cell Indices where content appears>>();
    const headingsByLevel = new Map<number, Map<string, number[]>>();

    // First pass: collect all headings by level and content
    headingStructure.forEach((heading, index) => {
      if (!headingsByLevel.has(heading.level)) {
        headingsByLevel.set(heading.level, new Map());
      }

      // Level map is a map of the content of the heading and the indices of the headings that have that content
      const levelMap = headingsByLevel.get(heading.level)!;
      const normalizedContent = heading.content.trim().toLowerCase();
      if (!levelMap.has(normalizedContent)) {
        levelMap.set(normalizedContent, []);
      }
      levelMap.get(normalizedContent)!.push(index);
    });

    // Check for multiple h1 headings
    const h1Headings = headingStructure.filter(h => h.level === 1);
    if (h1Headings.length > 1) {
      // Flag all h1 headings after the first one
      h1Headings.slice(1).forEach(heading => {
        //console.log(`Found additional h1 heading at cell ${heading.cellIndex}`);
        notebookIssues.push({
          cellIndex: heading.cellIndex,
          cellType: 'markdown',
          violationId: 'heading-duplicate-h1',
          issueContentRaw: heading.html
        });
      });
    }

    // Second pass: analyze heading structure and check for duplicates
    for (let i = 0; i < headingStructure.length; i++) {
      const current = headingStructure[i];
      const previous = i > 0 ? headingStructure[i - 1] : null;

      // Skip h1 headings as they're handled separately
      if (current.level === 1) {
        continue;
      }

      // Check for empty headings
      if (!current.content.trim()) {
        //console.log(`Found empty heading at cell ${current.cellIndex}`);
        notebookIssues.push({
          cellIndex: current.cellIndex,
          cellType: 'markdown',
          violationId: 'heading-empty',
          issueContentRaw: current.html
        });
        continue;
      }

      // Check for duplicate headings at the same level
      const levelMap = headingsByLevel.get(current.level)!;
      const normalizedContent = current.content.trim().toLowerCase();
      const duplicateIndices = levelMap.get(normalizedContent)!;

      if (duplicateIndices.length > 1) {
        // Only report the first occurrence of each duplicate
        if (duplicateIndices[0] === i) {
          //console.log(`Found duplicate heading "${current.content}" at level ${current.level}`);
          notebookIssues.push({
            cellIndex: current.cellIndex,
            cellType: 'markdown',
            violationId: 'heading-duplicate',
            issueContentRaw: current.html,
            metadata: {
              previousHeadingLevel: previous?.level
            }
          });
        }
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
        //console.log(`Found heading level skip from h${previous.level} to h${current.level} at cell ${current.cellIndex}`);
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

    //console.log('Heading hierarchy analysis complete. Found issues:', notebookIssues.length);
  } catch (error) {
    console.error('Error in heading hierarchy analysis:', error);
  } finally {
    tempDiv.remove();
  }

  return notebookIssues;
}
