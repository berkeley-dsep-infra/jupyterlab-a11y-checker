import { Widget } from '@lumino/widgets';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { ICellIssue } from '@berkeley-dsep-infra/a11y-checker-core';
import { NotebookPanel } from '@jupyterlab/notebook';
import { analyzeCellIssues } from '@berkeley-dsep-infra/a11y-checker-core';
import { notebookToGeneralCells } from '../../adapter.js';
import { PageConfig } from '@jupyterlab/coreutils';
// Intentionally keep base free of category-specific analysis. Widgets can override.
import { BrowserImageProcessor } from '../../image-processor.js';

/** Delay (ms) before dispatching re-analysis after a fix is applied. */
const REANALYSIS_DELAY_MS = 100;

abstract class FixWidget extends Widget {
  protected issue: ICellIssue;
  protected cell: Cell<ICellModel>;
  protected aiEnabled: boolean;
  protected currentPath: string = '';

  /** Timer ID for the pending re-analysis, used to cancel overlapping calls. */
  private _reanalysisTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super();
    this.issue = issue;
    this.cell = cell;
    this.aiEnabled = aiEnabled;
    this.addClass('a11y-fix-widget');
  }

  protected abstract getDescription(): string;

  // Method to remove the widget from the DOM
  protected removeIssueWidget(): void {
    const issueWidget = this.node.closest('.issue-widget');
    if (issueWidget) {
      const category = issueWidget.closest('.category');
      issueWidget.remove();
      if (category && !category.querySelector('.issue-widget')) {
        category.remove();
      }
    }

    // For all fixes, highlight the current cell
    this.cell.node.style.transition = 'background-color 0.5s ease';
    this.cell.node.style.backgroundColor = 'var(--success-green)';
    setTimeout(() => {
      this.cell.node.style.backgroundColor = '';
    }, 1000);
  }

  // Re-run content-based detectors for this cell only and dispatch an update
  protected async reanalyzeCellAndDispatch(): Promise<void> {
    const notebookPanel = this.cell.parent?.parent as NotebookPanel;
    if (!notebookPanel) {
      return;
    }
    const cellIndex =
      (this.cell as any).parent?.widgets.indexOf(this.cell) ?? -1;
    if (cellIndex < 0) {
      return;
    }

    // Cancel any pending re-analysis to prevent overlapping dispatches
    if (this._reanalysisTimer !== null) {
      clearTimeout(this._reanalysisTimer);
    }

    this._reanalysisTimer = setTimeout(async () => {
      this._reanalysisTimer = null;
      const accessibleCells = notebookToGeneralCells(notebookPanel);
      const targetCell = accessibleCells[cellIndex];
      const issues = await analyzeCellIssues(
        targetCell,
        document,
        PageConfig.getBaseUrl(),
        new BrowserImageProcessor(),
        notebookPanel.context.path
      );
      const event = new CustomEvent('notebookReanalyzed', {
        detail: { issues, isCellUpdate: true },
        bubbles: true,
        composed: true
      } as any);
      const mainPanelEl = document.getElementById('a11y-sidebar');
      if (mainPanelEl) {
        mainPanelEl.dispatchEvent(event);
      }
    }, REANALYSIS_DELAY_MS);
  }

  // Generic notebook reanalysis hook. By default, just reanalyze this cell.
  // Widgets with notebook-wide effects (e.g., headings) should override.
  protected async reanalyzeNotebookAndDispatch(): Promise<void> {
    await this.reanalyzeCellAndDispatch();
  }

  dispose(): void {
    // Cancel any pending re-analysis timer
    if (this._reanalysisTimer !== null) {
      clearTimeout(this._reanalysisTimer);
      this._reanalysisTimer = null;
    }
    super.dispose();
  }
}

export abstract class ButtonFixWidget extends FixWidget {
  protected applyButton: HTMLButtonElement;

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    this.node.innerHTML = `
      <div class="fix-description">${this.getDescription()}</div>
      <div class="button-container">
        <button class="jp-Button2 button-fix-button">
          <span class="material-icons" aria-hidden="true">check</span>
          <div>${this.getApplyButtonText()}</div>
        </button>
      </div>
    `;

    this.applyButton = this.node.querySelector(
      '.button-fix-button'
    ) as HTMLButtonElement;
    this.applyButton.addEventListener('click', () => this.applyFix());
  }

  protected abstract getApplyButtonText(): string;
  protected abstract applyFix(): void;
}

export abstract class TextFieldFixWidget extends FixWidget {
  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    // Simplified DOM structure
    this.node.innerHTML = `
        <div class="fix-description">${this.getDescription()}</div>
        <div class="textfield-fix-widget">
          <input type="text" class="jp-a11y-input" placeholder="Input text here...">
          <div class="textfield-buttons">
              <button class="jp-Button2 suggest-button">
                  <span class="material-icons" aria-hidden="true">auto_awesome</span>
                  <div>Get AI Suggestions</div>
              </button>
              <button class="jp-Button2 apply-button">
                  <span class="material-icons" aria-hidden="true">check</span>
                  <div>Apply</div>
              </button>
          </div>
        </div>
      `;

    // Apply Button
    const applyButton = this.node.querySelector(
      '.apply-button'
    ) as HTMLButtonElement;

    if (applyButton) {
      applyButton.addEventListener('click', () => {
        const textInput = this.node.querySelector(
          '.jp-a11y-input'
        ) as HTMLInputElement;
        this.applyTextToCell(textInput.value.trim());
      });
    }

    // Suggest Button
    const suggestButton = this.node.querySelector(
      '.suggest-button'
    ) as HTMLButtonElement;

    suggestButton.style.display = aiEnabled ? 'flex' : 'none';

    suggestButton.addEventListener('click', () => this.displayAISuggestions());

    // Textfield Value
    const textFieldValue = this.node.querySelector(
      '.jp-a11y-input'
    ) as HTMLInputElement;

    if (this.issue.suggestedFix) {
      textFieldValue.value = this.issue.suggestedFix;
    }
  }

  abstract applyTextToCell(providedText: string): void;

  abstract displayAISuggestions(): Promise<void>;
}

export abstract class DropdownFixWidget extends FixWidget {
  protected dropdownButton: HTMLButtonElement;
  protected dropdownContent: HTMLDivElement;
  protected dropdownText: HTMLSpanElement;
  protected applyButton: HTMLButtonElement;
  protected selectedOption: string = '';

  /** Bound reference to the document click handler so it can be removed. */
  private _outsideClickHandler: ((event: MouseEvent) => void) | null = null;

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    // Simplified DOM structure with customizable text
    this.node.innerHTML = `
      <div class="fix-description">${this.getDescription()}</div>
      <div class="dropdown-fix-widget">
        <div class="custom-dropdown">
          <button class="dropdown-button" aria-haspopup="listbox" aria-expanded="false">
            <span class="dropdown-text"></span>
            <svg class="dropdown-arrow" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path fill="currentColor" d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <div class="dropdown-content hidden" role="listbox">
          </div>
        </div>
        <button class="jp-Button2 apply-button" style="${this.shouldShowApplyButton() ? '' : 'display: none;'}">
          <span class="material-icons" aria-hidden="true">check</span>
          <div>Apply</div>
        </button>
      </div>
    `;

    this.dropdownButton = this.node.querySelector(
      '.dropdown-button'
    ) as HTMLButtonElement;
    this.dropdownContent = this.node.querySelector(
      '.dropdown-content'
    ) as HTMLDivElement;
    this.dropdownText = this.node.querySelector(
      '.dropdown-text'
    ) as HTMLSpanElement;
    this.applyButton = this.node.querySelector(
      '.apply-button'
    ) as HTMLButtonElement;

    // Set initial text
    if (this.dropdownText) {
      this.dropdownText.textContent = this.getDefaultDropdownText();
    }

    // Populate dropdown options
    if (this.dropdownContent) {
      this.dropdownContent.innerHTML = this.getDropdownOptions();
    }

    // Setup dropdown handlers
    this.setupDropdownHandlers();
  }

  protected setupDropdownHandlers(): void {
    // Toggle dropdown
    this.dropdownButton.addEventListener('click', e => {
      e.stopPropagation(); // Prevent event from bubbling up
      const isExpanded = !this.dropdownContent.classList.contains('hidden');
      this.dropdownContent.classList.toggle('hidden');
      this.dropdownButton.classList.toggle('active');
      this.dropdownButton.setAttribute('aria-expanded', String(!isExpanded));
    });

    // Close dropdown when clicking outside — store reference for cleanup
    this._outsideClickHandler = (event: MouseEvent) => {
      if (!this.node.contains(event.target as Node)) {
        this.dropdownContent.classList.add('hidden');
        this.dropdownButton.classList.remove('active');
        this.dropdownButton.setAttribute('aria-expanded', 'false');
      }
    };
    document.addEventListener('click', this._outsideClickHandler);

    // Keyboard navigation on the dropdown
    this.dropdownButton.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.dropdownContent.classList.add('hidden');
        this.dropdownButton.classList.remove('active');
        this.dropdownButton.setAttribute('aria-expanded', 'false');
      }
    });

    // Option selection
    const options = this.dropdownContent.querySelectorAll('.dropdown-option');
    options.forEach(option => {
      option.addEventListener('click', e => {
        e.stopPropagation(); // Prevent event from bubbling up
        const value = (option as HTMLDivElement).dataset.value || '';
        this.selectedOption = value;
        this.handleOptionSelect(value);
        this.dropdownText.textContent =
          (option as HTMLDivElement).textContent?.trim() || '';
        this.dropdownContent.classList.add('hidden');
        this.dropdownButton.classList.remove('active');
        this.dropdownButton.setAttribute('aria-expanded', 'false');
        if (this.shouldShowApplyButton()) {
          this.applyButton.style.display = 'flex';
        }
      });
    });

    // Apply button
    this.applyButton.addEventListener('click', () => {
      if (this.selectedOption) {
        this.applyDropdownSelection(this.selectedOption);
      }
    });
  }

  dispose(): void {
    // Remove the global document click listener to prevent memory leaks
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler);
      this._outsideClickHandler = null;
    }
    super.dispose();
  }

  // Abstract methods that must be implemented by child classes
  protected abstract getDefaultDropdownText(): string;
  protected abstract getDropdownOptions(): string;
  protected abstract shouldShowApplyButton(): boolean;
  protected abstract handleOptionSelect(value: string): void;
  abstract applyDropdownSelection(selectedValue: string): void;
}
