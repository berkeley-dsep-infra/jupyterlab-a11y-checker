import { Widget } from '@lumino/widgets';
import { Cell, ICellModel } from '@jupyterlab/cells';

import {
  ImageAltFixWidget,
  TableCaptionFixWidget,
  TableHeaderFixWidget,
  HeadingOneFixWidget,
  HeadingOrderFixWidget,
  TableScopeFixWidget,
  LinkTextFixWidget
} from './fix';

import { issueToDescription } from '@berkeley-dsep-infra/a11y-checker-core';

import { ICellIssue } from '@berkeley-dsep-infra/a11y-checker-core';
import { MainPanelWidget } from './mainpanelWidget.js';

export class CellIssueWidget extends Widget {
  private issue: ICellIssue;
  private cell: Cell<ICellModel>;
  private aiEnabled: boolean = false;
  private mainPanel: MainPanelWidget;

  /** Track the child fix widget so we can dispose it. */
  private _fixWidget: Widget | null = null;

  constructor(
    issue: ICellIssue,
    cell: Cell<ICellModel>,
    aiEnabled: boolean,
    mainPanel: MainPanelWidget
  ) {
    super();
    this.issue = issue;
    this.cell = cell;
    this.aiEnabled = aiEnabled;
    this.mainPanel = mainPanel;

    const issueInformation = issueToDescription.get(issue.violationId);
    if (issue.customDescription && issueInformation) {
      issueInformation.description = issue.customDescription;
    }

    const severity = issueInformation?.severity || 'violation';
    const severityClass =
      severity === 'violation'
        ? 'severity-violation'
        : 'severity-best-practice';
    const severityLabel =
      severity === 'violation' ? 'WCAG Violation' : 'Best Practice';

    this.addClass('issue-widget');
    // Tag widget with identifiers so the panel can selectively update
    this.node.setAttribute('data-cell-index', String(issue.cellIndex));
    this.node.setAttribute('data-violation-id', issue.violationId);

    // Build the issue title safely
    const issueTitle = issueInformation?.title || issue.violationId;

    this.node.innerHTML = `
      <div class="badge-row">
        <span class="severity-badge ${severityClass}">${severityLabel}</span>
      </div>
      <button class="issue-header-button" aria-expanded="false">
          <h3 class="issue-header"> ${issueTitle}</h3>
          <span class="chevron material-icons" aria-hidden="true">expand_more</span>
      </button>
      <div class="collapsible-content" style="display: none;">
          <p class="description"></p>
          <p class="detailed-description" style="display: none;"></p>
          <div class="button-container">
              <button class="jp-Button2 locate-button">
                  <span class="material-icons" aria-hidden="true">search</span>
                  <div>Locate</div>
              </button>
              <button class="jp-Button2 explain-button" aria-expanded="false">
                  <span class="material-icons" aria-hidden="true">question_mark</span>
                  <div>Learn more</div>
              </button>
          </div>
          <div class="offending-content-block">
              <div class="offending-title">Original content:</div>
              <pre class="offending-snippet" style="white-space: pre-wrap; max-height: 200px; overflow: auto; background: var(--jp-layout-color2); padding: 8px; border-radius: 4px; border: 1px solid var(--jp-border-color2);"></pre>
          </div>
          <div class="fix-widget-container"></div>
      </div>
    `;

    // Populate description and detailed description as textContent to prevent XSS
    const descriptionEl = this.node.querySelector(
      '.description'
    ) as HTMLElement;
    if (descriptionEl) {
      descriptionEl.textContent = issueInformation?.description || '';
    }

    const detailedDescriptionEl = this.node.querySelector(
      '.detailed-description'
    ) as HTMLElement;
    if (detailedDescriptionEl && issueInformation) {
      // Build the detailed description with a safe link
      detailedDescriptionEl.textContent =
        (issueInformation.detailedDescription || '') + ' (';
      const link = document.createElement('a');
      link.href = issueInformation.descriptionUrl || '';
      link.target = '_blank';
      link.textContent = 'learn more about the issue and its impact';
      detailedDescriptionEl.appendChild(link);
      detailedDescriptionEl.appendChild(document.createTextNode(').'));

      // Show detection source for axe-core issues
      if (issue.detectedBy === 'axe-core') {
        const axeLine = document.createElement('p');
        axeLine.className = 'detected-by-axe';
        axeLine.textContent = 'Detected by axe-core';
        detailedDescriptionEl.appendChild(axeLine);
      }
    }

    // Add event listeners using query selectors
    const headerButton = this.node.querySelector(
      '.issue-header-button'
    ) as HTMLButtonElement;
    const collapsibleContent = this.node.querySelector(
      '.collapsible-content'
    ) as HTMLElement;

    // Toggle collapsible content when header is clicked
    headerButton?.addEventListener('click', () => {
      if (collapsibleContent) {
        const isHidden = collapsibleContent.style.display === 'none';
        collapsibleContent.style.display = isHidden ? 'block' : 'none';
        headerButton.setAttribute('aria-expanded', String(isHidden));

        const expandIcon = this.node.querySelector('.chevron');
        expandIcon?.classList.toggle('expanded');
      }
    });

    const locateButton = this.node.querySelector('.locate-button');
    locateButton?.addEventListener('click', () => this.navigateToCell());

    const explainButton = this.node.querySelector(
      '.explain-button'
    ) as HTMLButtonElement;
    explainButton?.addEventListener('click', () => {
      if (detailedDescriptionEl) {
        const isHidden = detailedDescriptionEl.style.display === 'none';
        detailedDescriptionEl.style.display = isHidden ? 'block' : 'none';
        explainButton.setAttribute('aria-expanded', String(isHidden));
      }
    });

    // Populate offending content as plain text (not rendered)
    const offendingSnippet = this.node.querySelector(
      '.offending-snippet'
    ) as HTMLElement;
    if (offendingSnippet) {
      offendingSnippet.textContent = `${this.issue.issueContentRaw || ''}`;
    }

    // Show suggest button initially if AI is enabled
    const mainPanelElement = document.getElementById(
      'a11y-sidebar'
    ) as HTMLElement;
    if (mainPanelElement) {
      const aiToggleButton =
        mainPanelElement.querySelector('.ai-control-button');
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
      this._fixWidget = new ImageAltFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled,
        this.mainPanel.getVisionModelSettings()
      );
      fixWidgetContainer.appendChild(this._fixWidget.node);
    } else if (this.issue.violationId === 'table-missing-caption') {
      this._fixWidget = new TableCaptionFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled,
        this.mainPanel.getLanguageModelSettings()
      );
      fixWidgetContainer.appendChild(this._fixWidget.node);
    } else if (this.issue.violationId === 'table-missing-header') {
      this._fixWidget = new TableHeaderFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(this._fixWidget.node);
    } else if (this.issue.violationId === 'heading-missing-h1') {
      this._fixWidget = new HeadingOneFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(this._fixWidget.node);
    } else if (this.issue.violationId === 'heading-wrong-order') {
      this._fixWidget = new HeadingOrderFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(this._fixWidget.node);
    } else if (this.issue.violationId === 'table-missing-scope') {
      this._fixWidget = new TableScopeFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(this._fixWidget.node);
    } else if (this.issue.violationId === 'link-discernible-text') {
      this._fixWidget = new LinkTextFixWidget(
        this.issue,
        this.cell,
        this.aiEnabled
      );
      fixWidgetContainer.appendChild(this._fixWidget.node);
    }
  }

  dispose(): void {
    if (this._fixWidget) {
      this._fixWidget.dispose();
      this._fixWidget = null;
    }
    super.dispose();
  }

  private navigateToCell(): void {
    this.cell.node.scrollIntoView({ behavior: 'auto', block: 'nearest' });

    requestAnimationFrame(() => {
      this.cell.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    this.cell.node.style.transition = 'background-color 0.5s ease';
    this.cell.node.style.backgroundColor = 'var(--error-red)';

    setTimeout(() => {
      this.cell.node.style.backgroundColor = '';
    }, 1000);
  }
}
