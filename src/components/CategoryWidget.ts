import { NotebookPanel } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';
import { ICellAccessibilityIssue } from '../utils/types';
import { CellIssueWidget } from './IssueWidget';

export class CellCategoryWidget extends Widget {
  constructor(
    notebook: NotebookPanel,
    categoryTitle: string,
    issues: ICellAccessibilityIssue[]
  ) {
    super();
    this.addClass('category');

    // Create the basic structure
    this.node.innerHTML = `
            <h2 class="category-title">${categoryTitle}</h2>
            <hr>
            <div class="issues-list"></div>
        `;

    // Get the issues-list container
    const issuesList = this.node.querySelector('.issues-list');

    // Create and append each CellIssueWidget
    issues.forEach(issue => {
      const issueWidget = new CellIssueWidget(
        issue,
        notebook.content.widgets[issue.cellIndex]
      );
      if (issuesList) {
        issuesList.appendChild(issueWidget.node);
      }
    });
  }
}
