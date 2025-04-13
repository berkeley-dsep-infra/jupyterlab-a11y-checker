import { Widget } from '@lumino/widgets';
import { Cell, ICellModel } from '@jupyterlab/cells';

import {
  ImageAltFixWidget,
  TableCaptionFixWidget,
  TableHeaderFixWidget
} from './FixWidget';
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

    this.addClass('issue-widget');
    this.node.innerHTML = `
      <button class="issue-header-button">
          <h3 class="issue-header">Issue: ${issue.violation.id} <span class="chevron material-icons">expand_more</span></h3>
      </button>
      <div class="collapsible-content" style="display: none;">
          <p class="description">
              ${issue.violation.description} <a href="${issue.violation.descriptionUrl}" target="_blank">(learn more about the issue)</a>.
          </p>
          <div class="button-container">
              <button class="jp-Button2 locate-button">
                  <span class="material-icons">search</span>
                  <div>Locate</div>
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

    if (this.issue.violation.id === 'image-alt') {
      const textFieldFixWidget = new ImageAltFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(textFieldFixWidget.node);
    } else if (this.issue.violation.id === 'table-has-caption') {
      console.log('Table caption issue');
      const tableCaptionFixWidget = new TableCaptionFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(tableCaptionFixWidget.node);
    } else if (this.issue.violation.id === 'td-has-header') {
      const tableHeaderFixWidget = new TableHeaderFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(tableHeaderFixWidget.node);
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
