import { NotebookPanel } from '@jupyterlab/notebook';
import axe from 'axe-core';
import { ICellAccessibilityIssue } from '@utils/types';
import { marked } from 'marked';

export async function analyzeCellsAccessibility(
  panel: NotebookPanel
): Promise<ICellAccessibilityIssue[]> {
  const issues: ICellAccessibilityIssue[] = [];

  const tempDiv = document.createElement('div');
  document.body.appendChild(tempDiv);

  const axeConfig: axe.RunOptions = {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
  };

  try {
    const cells = panel.content.widgets;
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
          // Parse markdown to HTML using marked
          tempDiv.innerHTML = await marked.parse(rawMarkdown);

          // Run axe analysis on our clean HTML
          const results = await axe.run(tempDiv, axeConfig);
          const violations = results.violations;

          if (violations.length > 0) {
            violations.forEach(violation => {
              violation.nodes.forEach(node => {
                issues.push({
                  cellIndex: i,
                  cellType: cellType,
                  axeViolation: violation,
                  node: node,
                  contentRaw: rawMarkdown
                });
              });
            });
          }

          // Add custom image issue detection
          issues.push(...detectImageIssues(rawMarkdown, i, cellType));
          issues.push(...detectTableIssues(rawMarkdown, i, cellType));
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

  return issues;
}

// ** IMAGE ISSUES */

// Detects images without alt text in markdown content
export function detectImageIssues(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellAccessibilityIssue[] {
  const issues: ICellAccessibilityIssue[] = [];

  // Check for markdown images without alt text
  const markdownImageRegex = /!\[\]\([^)]+\)/g;
  let match;
  while ((match = markdownImageRegex.exec(rawMarkdown)) !== null) {
    issues.push(
      createImageAltIssue(cellIndex, cellType, match[0], rawMarkdown)
    );
  }

  // Check for HTML images with empty alt tags
  const emptyAltRegex = /<img[^>]*alt=""[^>]*>/g;
  while ((match = emptyAltRegex.exec(rawMarkdown)) !== null) {
    issues.push(
      createImageAltIssue(cellIndex, cellType, match[0], rawMarkdown)
    );
  }

  return issues;
}

// Creates a standardized image alt issue object
function createImageAltIssue(
  cellIndex: number,
  cellType: string,
  html: string,
  contentRaw: string
): ICellAccessibilityIssue {
  return {
    cellIndex,
    cellType,
    axeViolation: {
      id: 'image-alt',
      help: 'Images must have alternate text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
      description: 'Images must have alternate text',
      tags: ['wcag2a', 'wcag2aa'],
      nodes: []
    },
    node: {
      html,
      target: [html],
      any: [],
      all: [],
      none: []
    },
    contentRaw
  };
}

// ** TABLE ISSUES */

// Detects tables without headers
export function detectTableIssues(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellAccessibilityIssue[] {
  const issues: ICellAccessibilityIssue[] = [];

  // Check for tables without th tags
  const tableWithoutThRegex =
    /<table[^>]*>(?![\s\S]*?<th[^>]*>)[\s\S]*?<\/table>/gi;
  let match;
  while ((match = tableWithoutThRegex.exec(rawMarkdown)) !== null) {
    issues.push(createTableThIssue(cellIndex, cellType, match[0], rawMarkdown));
  }

  // Check for tables without caption tags
  const tableWithoutCaptionRegex =
    /<table[^>]*>(?![\s\S]*?<caption[^>]*>)[\s\S]*?<\/table>/gi;
  while ((match = tableWithoutCaptionRegex.exec(rawMarkdown)) !== null) {
    issues.push(
      createTableCaptionIssue(cellIndex, cellType, match[0], rawMarkdown)
    );
  }

  return issues;
}

// Creates a standardized table th issue object
function createTableThIssue(
  cellIndex: number,
  cellType: string,
  html: string,
  contentRaw: string
): ICellAccessibilityIssue {
  return {
    cellIndex,
    cellType,
    axeViolation: {
      id: 'td-has-header',
      help: 'Tables must have headers',
      helpUrl: '',
      description: 'Tables must have headers',
      tags: ['wcag2a', 'wcag2aa'],
      nodes: []
    },
    node: {
      html,
      target: [html],
      any: [],
      all: [],
      none: []
    },
    contentRaw
  };
}

function createTableCaptionIssue(
  cellIndex: number,
  cellType: string,
  html: string,
  contentRaw: string
): ICellAccessibilityIssue {
  return {
    cellIndex,
    cellType,
    axeViolation: {
      id: 'table-has-caption',
      help: 'Tables must have captions',
      helpUrl: '',
      description: 'Tables must have captions',
      tags: ['wcag2a', 'wcag2aa'],
      nodes: []
    },
    node: {
      html,
      target: [html],
      any: [],
      all: [],
      none: []
    },
    contentRaw
  };
}
