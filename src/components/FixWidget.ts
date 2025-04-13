import { Widget } from '@lumino/widgets';

import { ICellIssue } from '../utils/types';
import {
  getImageAltSuggestion,
  getTableCaptionSuggestion
} from '../utils/ai-utils';

import { Cell, ICellModel } from '@jupyterlab/cells';
import { ServerConnection } from '@jupyterlab/services';

abstract class FixWidget extends Widget {
  protected issue: ICellIssue;
  protected cell: Cell<ICellModel>;
  protected aiEnabled: boolean;

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super();
    this.issue = issue;
    this.cell = cell;
    this.aiEnabled = aiEnabled;
  }

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

    this.cell.node.style.transition = 'background-color 0.5s ease';
    this.cell.node.style.backgroundColor = '#28A745';

    setTimeout(() => {
      this.cell.node.style.backgroundColor = '';
    }, 1000);
  }
}

// TextFields
abstract class TextFieldFixWidget extends FixWidget {
  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    // Simplified DOM structure
    this.node.innerHTML = `
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

    if (suggestButton) {
      suggestButton.addEventListener('click', () =>
        this.displayAISuggestions()
      );
    }
  }

  abstract applyTextToCell(providedText: string): void;

  abstract displayAISuggestions(): Promise<void>;
}

export class ImageAltFixWidget extends TextFieldFixWidget {
  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);
  }

  applyTextToCell(providedAltText: string): void {
    if (providedAltText === '') {
      console.log('Empty alt text, returning');
      return;
    }

    const entireCellContent = this.cell.model.sharedModel.getSource();
    const target = this.issue.issueContentRaw;

    // Handle HTML image tags
    const handleHtmlImage = (): string => {
      // Alt attribute exists but is empty
      if (target.includes('alt=""') || target.includes("alt=''")) {
        return entireCellContent.replace(
          target,
          target.replace(/alt=["']\s*["']/, `alt="${providedAltText}"`)
        );
      }
      // Alt attribute does not exist
      else {
        return entireCellContent.replace(
          target,
          target.replace(/>$/, ` alt="${providedAltText}">`)
        );
      }
    };

    // Handle markdown images
    const handleMarkdownImage = (): string => {
      return entireCellContent.replace(
        target,
        target.replace(/!\[\]/, `![${providedAltText}]`)
      );
    };

    let newContent = entireCellContent;

    if (target.startsWith('<img')) {
      newContent = handleHtmlImage();
    } else if (target.startsWith('![')) {
      newContent = handleMarkdownImage();
    }

    this.cell.model.sharedModel.setSource(newContent);

    // Remove the issue widget
    this.removeIssueWidget();
  }

  async displayAISuggestions(): Promise<void> {
    console.log('Getting AI suggestions');
    const altTextInput = this.node.querySelector(
      '.jp-a11y-input'
    ) as HTMLInputElement;
    if (!altTextInput) {
      return;
    }

    // Save the original placeholder text
    const originalPlaceholder = altTextInput.placeholder;

    // Create loading overlay (so we can see the loading state)
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.position = 'absolute';
    loadingOverlay.style.left = '8px'; // Matching input text padding
    loadingOverlay.style.top = '8px';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.gap = '8px';
    loadingOverlay.style.color = '#666';
    loadingOverlay.innerHTML = `
          <span class="material-icons loading">refresh</span>
          Getting AI suggestions...
      `;

    // Add relative positioning to input container and append loading overlay
    const inputContainer = altTextInput.parentElement;
    if (inputContainer) {
      inputContainer.style.position = 'relative';
      inputContainer.appendChild(loadingOverlay);
    }

    // Show loading state in the input
    altTextInput.disabled = true;
    altTextInput.style.color = 'transparent'; // Hide input text while loading
    altTextInput.placeholder = ''; // Clear placeholder while showing loading overlay

    try {
      const suggestion = await getImageAltSuggestion(
        this.issue,
        ServerConnection.makeSettings().baseUrl + 'ollama/',
        'mistral'
      );
      if (suggestion !== 'Error') {
        // Extract alt text from the suggestion, handling both single and double quotes
        const altMatch = suggestion.match(/alt=['"]([^'"]*)['"]/);
        if (altMatch && altMatch[1]) {
          altTextInput.value = altMatch[1];
        } else {
          altTextInput.value = suggestion; // Fallback to full suggestion if no alt text found
        }
      } else {
        altTextInput.placeholder =
          'Error getting suggestions. Please try again.';
      }
    } catch (error) {
      console.error(error);
      altTextInput.placeholder = 'Error getting suggestions. Please try again.';
    } finally {
      altTextInput.disabled = false;
      altTextInput.style.color = ''; // Restore text color
      loadingOverlay.remove(); // Remove loading overlay
      if (altTextInput.value) {
        altTextInput.placeholder = originalPlaceholder;
      }
    }
  }
}

export class TableCaptionFixWidget extends TextFieldFixWidget {
  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);
  }

  applyTextToCell(providedCaption: string): void {
    if (providedCaption === '') {
      console.log('Empty caption text, returning');
      return;
    }

    const entireCellContent = this.cell.model.sharedModel.getSource();
    const target = this.issue.issueContentRaw;

    const handleHtmlTable = (): string => {
      // Check if table already has a caption
      if (target.includes('<caption>')) {
        return entireCellContent.replace(
          /<caption>.*?<\/caption>/,
          `<caption>${providedCaption}</caption>`
        );
      } else {
        return entireCellContent.replace(
          /<table[^>]*>/,
          `$&\n  <caption>${providedCaption}</caption>`
        );
      }
    };

    let newContent = entireCellContent;

    if (target.includes('<table')) {
      newContent = handleHtmlTable();
    }

    this.cell.model.sharedModel.setSource(newContent);

    // Remove the issue widget
    this.removeIssueWidget();
  }

  async displayAISuggestions(): Promise<void> {
    console.log('Getting AI suggestions for table caption');
    const captionInput = this.node.querySelector(
      '.jp-a11y-input'
    ) as HTMLInputElement;
    if (!captionInput) {
      return;
    }

    // Save the original placeholder text
    const originalPlaceholder = captionInput.placeholder;

    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.position = 'absolute';
    loadingOverlay.style.left = '8px';
    loadingOverlay.style.top = '8px';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.gap = '8px';
    loadingOverlay.style.color = '#666';
    loadingOverlay.innerHTML = `
          <span class="material-icons loading">refresh</span>
          Getting AI suggestions...
      `;

    // Add relative positioning to input container and append loading overlay
    const inputContainer = captionInput.parentElement;
    if (inputContainer) {
      inputContainer.style.position = 'relative';
      inputContainer.appendChild(loadingOverlay);
    }

    // Show loading state in the input
    captionInput.disabled = true;
    captionInput.style.color = 'transparent';
    captionInput.placeholder = '';

    try {
      const suggestion = await getTableCaptionSuggestion(
        this.issue,
        ServerConnection.makeSettings().baseUrl + 'ollama/',
        'mistral'
      );
      if (suggestion !== 'Error') {
        captionInput.value = suggestion;
      } else {
        captionInput.placeholder =
          'Error getting suggestions. Please try again.';
      }
    } catch (error) {
      console.error(error);
      captionInput.placeholder = 'Error getting suggestions. Please try again.';
    } finally {
      captionInput.disabled = false;
      captionInput.style.color = '';
      loadingOverlay.remove();
      if (captionInput.value) {
        captionInput.placeholder = originalPlaceholder;
      }
    }
  }
}

// Dropdowns

abstract class DropdownFixWidget extends FixWidget {
  protected dropdownButton: HTMLButtonElement;
  protected dropdownContent: HTMLDivElement;
  protected dropdownText: HTMLSpanElement;
  protected applyButton: HTMLButtonElement;
  protected selectedOption: string = '';

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    // Simplified DOM structure
    this.node.innerHTML = `
      <div class="table-header-fix-widget">
        <div class="custom-dropdown">
          <button class="dropdown-button">
            <span class="dropdown-text">Apply a table header</span>
            <svg class="dropdown-arrow" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <div class="dropdown-content hidden">
            <div class="dropdown-option" data-value="first-row">
              The first row is a header
            </div>
            <div class="dropdown-option" data-value="first-column">
              The first column is a header
            </div>
            <div class="dropdown-option" data-value="both">
              The first row and column are headers
            </div>
          </div>
        </div>
        <button class="jp-Button2 apply-button">
            <span class="material-icons">check</span>
            <div>Apply</div>
          </button>
      </div>
    `;

    this.dropdownButton = this.node.querySelector('.dropdown-button') as HTMLButtonElement;
    this.dropdownContent = this.node.querySelector('.dropdown-content') as HTMLDivElement;
    this.dropdownText = this.node.querySelector('.dropdown-text') as HTMLSpanElement;
    this.applyButton = this.node.querySelector('.apply-button') as HTMLButtonElement;

    // Setup dropdown handlers
    this.setupDropdownHandlers();
  }

  private setupDropdownHandlers(): void {
    // Toggle dropdown
    this.dropdownButton.addEventListener('click', () => {
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
    const options = this.node.querySelectorAll('.dropdown-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const value = (option as HTMLDivElement).dataset.value || '';
        this.selectedOption = value;
        this.dropdownText.textContent = (option as HTMLDivElement).textContent?.trim() || '';
        this.dropdownContent.classList.add('hidden');
        this.dropdownButton.classList.remove('active');
        this.applyButton.style.display = 'flex';
      });
    });

    // Apply button
    this.applyButton.addEventListener('click', () => {
      if (this.selectedOption) {
        this.applyDropdownSelection(this.selectedOption);
      }
    });
  }

  abstract applyDropdownSelection(selectedValue: string): void;
}

export class TableHeaderFixWidget extends DropdownFixWidget {
  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);
  }

  applyDropdownSelection(headerType: string): void {
    const entireCellContent = this.cell.model.sharedModel.getSource();
    const target = this.issue.issueContentRaw;

    const convertToHeaderCell = (cell: string): string => {
      // Remove any existing th tags if present
      cell = cell.replace(/<\/?th[^>]*>/g, '');
      // Remove td tags if present
      cell = cell.replace(/<\/?td[^>]*>/g, '');
      // Wrap with th tags
      return `<th>${cell.trim()}</th>`;
    };

    const processTable = (tableHtml: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(tableHtml, 'text/html');
      const table = doc.querySelector('table');

      if (!table) {
        return tableHtml;
      }

      // Get all rows, filtering out empty ones
      const rows = Array.from(table.querySelectorAll('tr')).filter(
        row => row.querySelectorAll('td, th').length > 0
      );

      if (rows.length === 0) {
        return tableHtml;
      }

      switch (headerType) {
        case 'first-row': {
          // Convert first row cells to headers
          const firstRow = rows[0];
          const cells = Array.from(firstRow.querySelectorAll('td, th'));
          cells.forEach(cell => {
            const newHeader = convertToHeaderCell(cell.innerHTML);
            cell.outerHTML = newHeader;
          });
          break;
        }
        case 'first-column': {
          // Convert first column cells to headers
          rows.forEach(row => {
            const firstCell = row.querySelector('td, th');
            if (firstCell) {
              const newHeader = convertToHeaderCell(firstCell.innerHTML);
              firstCell.outerHTML = newHeader;
            }
          });
          break;
        }
        case 'both': {
          // Convert both first row and first column
          rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            cells.forEach((cell, cellIndex) => {
              if (rowIndex === 0 || cellIndex === 0) {
                const newHeader = convertToHeaderCell(cell.innerHTML);
                cell.outerHTML = newHeader;
              }
            });
          });
          break;
        }
      }

      return table.outerHTML;
    };

    const newContent = entireCellContent.replace(target, processTable(target));
    this.cell.model.sharedModel.setSource(newContent);
    this.removeIssueWidget();
  }
}
