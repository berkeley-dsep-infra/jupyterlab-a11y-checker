import { NotebookPanel } from '@jupyterlab/notebook';
// import axe from 'axe-core';
import { marked } from 'marked';
import { ICellIssue } from '../types';
import {
  detectHeadingOneIssue,
  analyzeHeadingHierarchy
} from './category/heading';
import { detectImageIssuesInCell } from './category';
import { detectTableIssuesInCell } from './category';
import { detectColorIssuesInCell } from './category';

export async function analyzeCellsAccessibility(
  panel: NotebookPanel
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];
  const cells = panel.content.widgets;

  // Add heading one check
  notebookIssues.push(
    ...(await detectHeadingOneIssue('', 0, 'markdown', cells))
  );

  const tempDiv = document.createElement('div');
  document.body.appendChild(tempDiv);

  // const axeConfig: axe.RunOptions = {
  //   runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
  // };

  try {
    // First, analyze heading hierarchy across the notebook
    const headingIssues = await analyzeHeadingHierarchy(panel);
    notebookIssues.push(...headingIssues);

    // Then analyze individual cells for other issues
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

          // TODO: Currently disabled axe
          // const results = await axe.run(tempDiv, axeConfig);
          // const violations = results.violations;

          // // Can have multiple violations in a single cell
          // if (violations.length > 0) {
          //   violations.forEach(violation => {
          //     violation.nodes.forEach(node => {
          //       notebookIssues.push({
          //         cellIndex: i,
          //         cellType: cellType,
          //         violationId: violation.id,
          //         issueContentRaw: node.html
          //       });
          //     });
          //   });
          // }

          // Add custom image issue detection
          const folderPath = panel.context.path.substring(
            0,
            panel.context.path.lastIndexOf('/')
          );

          // Image Issues
          notebookIssues.push(
            ...(await detectImageIssuesInCell(
              rawMarkdown,
              i,
              cellType,
              folderPath
            ))
          );

          // Table Issues
          notebookIssues.push(
            ...detectTableIssuesInCell(rawMarkdown, i, cellType)
          );

          // Color Issues
          notebookIssues.push(
            ...(await detectColorIssuesInCell(
              rawMarkdown,
              i,
              cellType,
              folderPath,
              panel // Pass panel for attachment handling
            ))
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
