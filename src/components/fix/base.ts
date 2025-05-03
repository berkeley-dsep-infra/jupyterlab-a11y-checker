import { Widget } from '@lumino/widgets';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { ICellIssue } from '../../utils/types';

abstract class FixWidget extends Widget {
  protected issue: ICellIssue;
  protected cell: Cell<ICellModel>;
  protected aiEnabled: boolean;
  protected currentPath: string = '';

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
}

export abstract class ButtonFixWidget extends FixWidget {
  protected applyButton: HTMLButtonElement;

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    this.node.innerHTML = `
      <div class="fix-description">${this.getDescription()}</div>
      <div class="button-container">
        <button class="jp-Button2 button-fix-button">
          <span class="material-icons">check</span>
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
                  <span class="material-icons">auto_awesome</span>
                  <div>Get AI Suggestions</div>
              </button>
              <button class="jp-Button2 apply-button">
                  <span class="material-icons">check</span>
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

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    // Simplified DOM structure with customizable text
    this.node.innerHTML = `
      <div class="fix-description">${this.getDescription()}</div>
      <div class="dropdown-fix-widget">
        <div class="custom-dropdown">
          <button class="dropdown-button">
            <span class="dropdown-text"></span>
            <svg class="dropdown-arrow" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <div class="dropdown-content hidden">
          </div>
        </div>
        <button class="jp-Button2 apply-button" style="${this.shouldShowApplyButton() ? '' : 'display: none;'}">
          <span class="material-icons">check</span>
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
      this.dropdownContent.classList.toggle('hidden');
      this.dropdownButton.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', event => {
      if (!this.node.contains(event.target as Node)) {
        this.dropdownContent.classList.add('hidden');
        this.dropdownButton.classList.remove('active');
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

  // Abstract methods that must be implemented by child classes
  protected abstract getDefaultDropdownText(): string;
  protected abstract getDropdownOptions(): string;
  protected abstract shouldShowApplyButton(): boolean;
  protected abstract handleOptionSelect(value: string): void;
  abstract applyDropdownSelection(selectedValue: string): void;
}
