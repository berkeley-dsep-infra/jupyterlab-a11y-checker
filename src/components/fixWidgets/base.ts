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
    this.cell.node.style.backgroundColor = '#28A745';
    setTimeout(() => {
      this.cell.node.style.backgroundColor = '';
    }, 1000);
  }
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/><path fill="#fff" d="M19 19a1 1 0 0 1 .117 1.993L19 21h-7a1 1 0 0 1-.117-1.993L12 19zm.631-14.632a2.5 2.5 0 0 1 0 3.536L8.735 18.8a1.5 1.5 0 0 1-.44.305l-3.804 1.729c-.842.383-1.708-.484-1.325-1.326l1.73-3.804a1.5 1.5 0 0 1 .304-.44L16.096 4.368a2.5 2.5 0 0 1 3.535 0m-2.12 1.414L6.677 16.614l-.589 1.297l1.296-.59L18.217 6.49a.5.5 0 1 0-.707-.707M6 1a1 1 0 0 1 .946.677l.13.378a3 3 0 0 0 1.869 1.87l.378.129a1 1 0 0 1 0 1.892l-.378.13a3 3 0 0 0-1.87 1.869l-.129.378a1 1 0 0 1-1.892 0l-.13-.378a3 3 0 0 0-1.869-1.87l-.378-.129a1 1 0 0 1 0-1.892l.378-.13a3 3 0 0 0 1.87-1.869l.129-.378A1 1 0 0 1 6 1m0 3.196A5 5 0 0 1 5.196 5q.448.355.804.804q.355-.448.804-.804A5 5 0 0 1 6 4.196"/></g></svg>
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
