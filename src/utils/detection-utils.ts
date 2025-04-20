import axe from 'axe-core';
import { marked } from 'marked';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { ICellModel } from '@jupyterlab/cells';

import { ICellIssue } from './types';

export async function analyzeCellsAccessibility(
  panel: NotebookPanel
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];
  const cells = panel.content.widgets;

  // Add heading one check
  notebookIssues.push(...detectHeadingOneIssue('', 0, 'markdown', cells));

  const tempDiv = document.createElement('div');
  document.body.appendChild(tempDiv);

  const axeConfig: axe.RunOptions = {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
  };

  try {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell || !cell.model) {
        console.warn(`Skipping cell ${i}: Invalid cell or model`);
        continue;
      }

      const cellType = cell.model.type;
      if (cellType === 'markdown') {
        const rawMarkdown = cell.model.sharedModel.getSource();
        if (rawMarkdown.trim()) {
          tempDiv.innerHTML = await marked.parse(rawMarkdown);

          const results = await axe.run(tempDiv, axeConfig);
          const violations = results.violations;

          // Can have multiple violations in a single cell
          if (violations.length > 0) {
            violations.forEach(violation => {
              violation.nodes.forEach(node => {
                // Customize description for heading-order issues
                if (violation.id === 'heading-order') {
                  violation.description = 'Ensure the order of headings is semantically correct. Please also ensure that headings are descriptive and accurate'
                }
                notebookIssues.push({
                  cellIndex: i,
                  cellType: cellType,
                  violation: {
                    id: violation.id,
                    description: violation.description,
                    descriptionUrl: violation.helpUrl
                  },
                  issueContentRaw: node.html
                });
              });
            });
          }

          // Add custom image issue detection
          notebookIssues.push(
            ...detectImageIssuesInCell(rawMarkdown, i, cellType)
          );
          notebookIssues.push(
            ...detectTableIssuesInCell(rawMarkdown, i, cellType)
          );
        }
      } else if (cellType === 'code') {
        const codeInput = cell.node.querySelector('.jp-InputArea-editor');
        const codeOutput = cell.node.querySelector('.jp-OutputArea');
        if (codeInput || codeOutput) {
          // We would have to feed this into a language model to get the suggested fix.
        }
      }
    }
  } finally {
    tempDiv.remove();
  }

  return notebookIssues;
}

// Image
function detectImageIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellIssue[] {
  const notebookIssues: ICellIssue[] = [];

  // Check for images without alt text in markdown syntax
  const mdSyntaxMissingAltRegex = /!\[\]\([^)]+\)/g;

  // Check for images without alt tag or empty alt tag in HTML syntax
  const htmlSyntaxMissingAltRegex = /<img[^>]*alt=""[^>]*>/g;
  let match;
  while (
    (match = mdSyntaxMissingAltRegex.exec(rawMarkdown)) !== null ||
    (match = htmlSyntaxMissingAltRegex.exec(rawMarkdown)) !== null
  ) {
    notebookIssues.push({
      cellIndex,
      cellType: cellType as 'code' | 'markdown',
      violation: {
        id: 'image-alt',
        description: 'Images must have alternate text',
        descriptionUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt'
      },
      issueContentRaw: match[0]
    });
  }
  return notebookIssues;
}

// Table
function detectTableIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellIssue[] {
  const notebookIssues: ICellIssue[] = [];

  // Check for tables without th tags
  const tableWithoutThRegex =
    /<table[^>]*>(?![\s\S]*?<th[^>]*>)[\s\S]*?<\/table>/gi;
  let match;
  while ((match = tableWithoutThRegex.exec(rawMarkdown)) !== null) {
    notebookIssues.push({
      cellIndex,
      cellType: cellType as 'code' | 'markdown',
      violation: {
        id: 'td-has-header',
        description: 'Tables must have header information',
        descriptionUrl:
          'https://dequeuniversity.com/rules/axe/4.10/td-has-header?application=RuleDescription'
      },
      issueContentRaw: match[0]
    });
  }

  // Check for tables without caption tags
  const tableWithoutCaptionRegex =
    /<table[^>]*>(?![\s\S]*?<caption[^>]*>)[\s\S]*?<\/table>/gi;
  while ((match = tableWithoutCaptionRegex.exec(rawMarkdown)) !== null) {
    notebookIssues.push({
      cellIndex,
      cellType: cellType as 'code' | 'markdown',
      violation: {
        id: 'table-has-caption',
        description: 'Tables must have caption information',
        descriptionUrl: ''
      },
      issueContentRaw: match[0]
    });
  }
  return notebookIssues;
}

// Heading
function detectHeadingOneIssue(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  cells: readonly Cell<ICellModel>[]
): ICellIssue[] {
  const notebookIssues: ICellIssue[] = [];
  
  // Check if any cell in the notebook has an h1 heading
  let hasH1 = false;
  for (const cell of cells) {
    if (cell.model.type === 'markdown') {
      const content = cell.model.sharedModel.getSource();
      // Check for markdown h1 (# heading) or HTML h1 (<h1>heading</h1>)
      if (content.match(/^#\s+[^\n]+/m) || content.match(/<h1[^>]*>.*?<\/h1>/)) {
        hasH1 = true;
        break;
      }
    }
  }

  if (!hasH1) {
    notebookIssues.push({
      cellIndex: 0, // We'll use the first cell for the heading
      cellType: 'markdown',
      violation: {
        id: 'page-has-heading-one',
        description: 'Ensure that the page or at least one of its frames contains a level-one heading. Please also ensure that headings are descriptive and accurate',
        descriptionUrl: 'https://dequeuniversity.com/rules/axe/4.7/page-has-heading-one'
      },
      issueContentRaw: '' // Empty since we're adding a new heading
    });
  }

  return notebookIssues;
}

// TODO: Color

// TODO: Links

// TODO: Other
