import { Widget } from '@lumino/widgets';
import { Cell, ICellModel } from '@jupyterlab/cells';

import {
  ImageAltFixWidget,
  TableCaptionFixWidget,
  TableHeaderFixWidget,
  HeadingOneFixWidget,
  HeadingOrderFixWidget,
  TableScopeFixWidget
} from './fix';

import { issueToDescription } from '../utils/metadata';

import { ICellIssue } from '../utils/types';

export class CellIssueWidget extends Widget {
  private issue: ICellIssue;
  private cell: Cell<ICellModel>;
  private aiEnabled: boolean = false; // TODO: Create a higher order component to handle this

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super();
    this.issue = issue;
    this.cell = cell;
    this.aiEnabled = aiEnabled;

    const issueInformation = issueToDescription.get(issue.violationId);
    if (issue.customDescription) {
      issueInformation!.description = issue.customDescription;
    }
    if (issue.customDetailedDescription) {
      issueInformation!.detailedDescription = issue.customDetailedDescription;
    }

    this.addClass('issue-widget');
    this.node.innerHTML = `
      <button class="issue-header-button">
          <h3 class="issue-header"> ${issueInformation?.title || issue.violationId}</h3>
          <span class="chevron material-icons">expand_more</span>
      </button>
      <div class="collapsible-content" style="display: none;">
          <p class="description">
              ${issueInformation?.description}
          </p>
          <p class="detailed-description" style="display: none;">
              ${issueInformation?.detailedDescription || ''} (<a href="${issueInformation?.descriptionUrl || ''}" target="_blank">learn more about the issue and its impact</a>).
          </p>
          <div class="button-container">
              <button class="jp-Button2 locate-button">
                  <span class="material-icons">search</span>
                  <div>Locate</div>
              </button>
              <button class="jp-Button2 explain-button">
                  <span class="material-icons">question_mark</span>
                  <div>Learn more</div>
              </button>
          </div>
          <div class="fix-widget-container"></div>
      </div>
    `;

    // Add event listeners using query selectors
    const headerButton = this.node.querySelector('.issue-header-button');
    const collapsibleContent = this.node.querySelector(
      '.collapsible-content'
    ) as HTMLElement;

    // Toggle collapsible content when header is clicked
    headerButton?.addEventListener('click', () => {
      if (collapsibleContent) {
        const isHidden = collapsibleContent.style.display === 'none';
        collapsibleContent.style.display = isHidden ? 'block' : 'none';

        const expandIcon = this.node.querySelector('.chevron');
        expandIcon?.classList.toggle('expanded');
      }
    });

    const locateButton = this.node.querySelector('.locate-button');
    locateButton?.addEventListener('click', () => this.navigateToCell());

    const explainButton = this.node.querySelector('.explain-button');
    const detailedDescription = this.node.querySelector(
      '.detailed-description'
    ) as HTMLElement;
    explainButton?.addEventListener('click', () => {
      if (detailedDescription) {
        detailedDescription.style.display =
          detailedDescription.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Show suggest button initially if AI is enabled
    const mainPanel = document.getElementById('a11y-sidebar') as HTMLElement;
    if (mainPanel) {
      const aiToggleButton = mainPanel.querySelector('.ai-control-button');
      if (aiToggleButton && aiToggleButton.textContent?.includes('Enabled')) {
        this.aiEnabled = true;
      } else {
        this.aiEnabled = false;
      }
    }

    // Dynamically add the TextFieldFixWidget if needed
    const fixWidgetContainer = this.node.querySelector('.fix-widget-container');
    if (!fixWidgetContainer) {
      return;
    }

    if (this.issue.violationId === 'image-missing-alt') {
      const textFieldFixWidget = new ImageAltFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(textFieldFixWidget.node);
    } else if (this.issue.violationId === 'table-missing-caption') {
      console.log('Table caption issue');
      const tableCaptionFixWidget = new TableCaptionFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(tableCaptionFixWidget.node);
    } else if (this.issue.violationId === 'table-missing-header') {
      const tableHeaderFixWidget = new TableHeaderFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(tableHeaderFixWidget.node);
    } else if (this.issue.violationId === 'heading-missing-h1') {
      const headingOneFixWidget = new HeadingOneFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(headingOneFixWidget.node);
    } else if (this.issue.violationId === 'heading-wrong-order') {
      const headingOrderFixWidget = new HeadingOrderFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(headingOrderFixWidget.node);
    } else if (this.issue.violationId === 'table-missing-scope') {
      const tableScopeFixWidget = new TableScopeFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(tableScopeFixWidget.node);
    }
  }

  private navigateToCell(): void {
    this.cell.node.scrollIntoView({ behavior: 'auto', block: 'nearest' });

    requestAnimationFrame(() => {
      this.cell.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    this.cell.node.style.transition = 'background-color 0.5s ease';
    this.cell.node.style.backgroundColor = '#DB3939';

    setTimeout(() => {
      this.cell.node.style.backgroundColor = '';
    }, 1000);
  }
}
