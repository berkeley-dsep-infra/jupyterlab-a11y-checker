import { NotebookPanel } from '@jupyterlab/notebook';
import axe from 'axe-core';
import { ICellAccessibilityIssue } from '../utils/types';
import { marked } from 'marked';
import { detectImageIssues, detectTableIssues } from './CustomDetection';

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
