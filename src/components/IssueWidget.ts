import { Widget } from '@lumino/widgets';
import { ICellAccessibilityIssue } from '../utils/types';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { ImageAltFixWidget } from './FixWidget';

export class CellIssueWidget extends Widget {
  private issue: ICellAccessibilityIssue;
  private cell: Cell<ICellModel>;
  private aiEnabled: boolean = false; // TODO: Create a higher order component to handle this

  constructor(
    issue: ICellAccessibilityIssue,
    cell: Cell<ICellModel>,
    aiEnabled: boolean
  ) {
    super();
    this.issue = issue;
    this.cell = cell;
    this.aiEnabled = aiEnabled;

    this.addClass('issue-widget');
    this.node.innerHTML = `
      <button class="issue-header-button">
          <h3 class="issue-header">Issue: ${issue.axeViolation.id} <span class="material-icons chevron-down">expand_more</span></h3>
      </button>
      <div class="collapsible-content" style="display: none;">
          <p class="description">
              ${issue.axeViolation.help} <a href="${issue.axeViolation.helpUrl}" target="_blank">(learn more about the issue)</a>.
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

        // Update the chevron class
        const chevron = this.node.querySelector('.chevron-down');
        if (chevron) {
          chevron.classList.toggle('chevron-up', isHidden);
        }
      }
    });

    const locateButton = this.node.querySelector('.locate-button');
    locateButton?.addEventListener('click', () => this.navigateToCell());

    // Show suggest button initially if AI is enabled
    const mainPanel = document.getElementById('a11y-sidebar') as HTMLElement;
    if (mainPanel) {
      const aiToggleButton = mainPanel.querySelector('.ai-toggle');
      if (aiToggleButton && aiToggleButton.textContent?.includes('Enabled')) {
        this.aiEnabled = true;
      } else {
        this.aiEnabled = false;
      }
    }

    // Dynamically add the TextFieldFixWidget if needed
    const fixWidgetContainer = this.node.querySelector('.fix-widget-container');
    if (fixWidgetContainer && issue.axeViolation.id === 'image-alt') {
      const textFieldFixWidget = new ImageAltFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(textFieldFixWidget.node);
    }
  }

  private navigateToCell(): void {
    this.cell.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.cell.node.style.transition = 'background-color 0.5s ease';
    this.cell.node.style.backgroundColor = '#DB3939';

    setTimeout(() => {
      this.cell.node.style.backgroundColor = '';
    }, 1000);
  }
}
