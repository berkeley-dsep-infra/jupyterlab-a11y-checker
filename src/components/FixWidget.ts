import { Widget } from '@lumino/widgets';

import { ICellIssue } from '../utils/types';
import {
  getImageAltSuggestion,
  getTableCaptionSuggestion
} from '../utils/ai-utils';

import { analyzeHeadingHierarchy } from '../utils/detection-utils';

import { Cell, ICellModel } from '@jupyterlab/cells';
import { ServerConnection } from '@jupyterlab/services';
import { NotebookPanel } from '@jupyterlab/notebook';

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

// TextFields
abstract class TextFieldFixWidget extends FixWidget {
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

export class ImageAltFixWidget extends TextFieldFixWidget {
  protected getDescription(): string {
    return "Add or update alt text for the image:";
  }

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
        'mistral:7b'
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
  protected getDescription(): string {
    return "Add or update the caption for the table:";
  }

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
    this.dropdownButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event from bubbling up
      this.dropdownContent.classList.toggle('hidden');
      this.dropdownButton.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (!this.node.contains(event.target as Node)) {
        this.dropdownContent.classList.add('hidden');
        this.dropdownButton.classList.remove('active');
      }
    });

    // Option selection
    const options = this.dropdownContent.querySelectorAll('.dropdown-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
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

export class TableHeaderFixWidget extends DropdownFixWidget {
  protected getDescription(): string {
    return "Choose which row or column should be used as the header:";
  }

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);
  }

  protected getDefaultDropdownText(): string {
    return 'Select header type';
  }

  protected getDropdownOptions(): string {
    return `
      <div class="dropdown-option" data-value="first-row">
        The first row is a header
      </div>
      <div class="dropdown-option" data-value="first-column">
        The first column is a header
      </div>
      <div class="dropdown-option" data-value="both">
        The first row and column are headers
      </div>
    `;
  }

  protected shouldShowApplyButton(): boolean {
    return true;
  }

  protected handleOptionSelect(value: string): void {
    this.dropdownText.textContent = this.dropdownContent.querySelector(`[data-value="${value}"]`)?.textContent?.trim() || 'Select header type';
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

export class HeadingOneFixWidget extends TextFieldFixWidget {
  protected getDescription(): string {
    return "Add a new level one (h1) heading to the top of the notebook:";
  }

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);
    
    const input = this.node.querySelector('.jp-a11y-input') as HTMLInputElement;
    if (input) {
      input.placeholder = "Input h1 heading text...";
    }
  }

  protected removeIssueWidget(): void {
    const issueWidget = this.node.closest('.issue-widget');
    if (issueWidget) {
      const category = issueWidget.closest('.category');
      issueWidget.remove();
      if (category && !category.querySelector('.issue-widget')) {
        category.remove();
      }
    }

    // Highlight the first cell instead of the current cell
    const notebookPanel = this.cell.parent?.parent as NotebookPanel;
    if (notebookPanel) {
      const firstCell = notebookPanel.content.widgets[0];
      if (firstCell) {
        firstCell.node.style.transition = 'background-color 0.5s ease';
        firstCell.node.style.backgroundColor = '#28A745';
        setTimeout(() => {
          firstCell.node.style.backgroundColor = '';
        }, 1000);
      }
    }
  }

  applyTextToCell(providedHeading: string): void {
    if (providedHeading === '') {
      console.log('Empty heading text, returning');
      return;
    }

    // Get the notebook panel from the cell's parent hierarchy
    const notebookPanel = this.cell.parent?.parent as NotebookPanel;
    if (!notebookPanel) {
      console.error('Could not find notebook panel');
      return;
    }

    // Create a new markdown cell with the h1 heading
    const newContent = `# ${providedHeading}`;
    
    // Insert a new cell at the top of the notebook
    const sharedModel = notebookPanel.content.model?.sharedModel;
    if (sharedModel) {
      sharedModel.insertCell(0, {
        cell_type: 'markdown',
        source: newContent
      });
    }

    // Remove the issue widget
    this.removeIssueWidget();
  }

  async displayAISuggestions(): Promise<void> {
    console.log('Getting AI suggestions for heading');
    const headingInput = this.node.querySelector('.jp-a11y-input') as HTMLInputElement;
    if (!headingInput) {
      return;
    }

    // Save the original placeholder text
    const originalPlaceholder = headingInput.placeholder;

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
    const inputContainer = headingInput.parentElement;
    if (inputContainer) {
      inputContainer.style.position = 'relative';
      inputContainer.appendChild(loadingOverlay);
    }

    // Show loading state in the input
    headingInput.disabled = true;
    headingInput.style.color = 'transparent';
    headingInput.placeholder = '';

    try {
      // TODO: Implement AI suggestion??? Is it needed?
      headingInput.value = "Notebook Title"; 
    } catch (error) {
      console.error(error);
      headingInput.placeholder = 'Error getting suggestions. Please try again.';
    } finally {
      headingInput.disabled = false;
      headingInput.style.color = '';
      loadingOverlay.remove();
      if (headingInput.value) {
        headingInput.placeholder = originalPlaceholder;
      }
    }
  }
}

export class HeadingOrderFixWidget extends DropdownFixWidget {
  protected getDescription(): string {
    return "Choose from one of the following heading styles instead:";
  }

  private _currentLevel: number = 1;  // Initialize with default value
  private previousLevel: number | undefined;
  protected selectedLevel: number | undefined;
  private notebookPanel: NotebookPanel;

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);
    
    // Get reference to notebook panel
    this.notebookPanel = cell.parent?.parent as NotebookPanel;
    
    // Parse and set the current level immediately
    this._currentLevel = HeadingOrderFixWidget.parseHeadingLevel(issue.issueContentRaw);
    
    // Initialize values after super
    this.initializeValues(issue);

    // Setup apply button handler
    if (this.applyButton) {
      this.applyButton.addEventListener('click', async () => {
        console.log('Apply button clicked');
        if (this.selectedLevel) {
          this.applyDropdownSelection(`h${this.selectedLevel}`);
          
          // Wait a short delay for the cell to update
          // Allow UI to update before reanalyzing
          setTimeout(async () => {
            if (this.notebookPanel) {
              try {                
                // Only analyze heading hierarchy
                const headingIssues = await analyzeHeadingHierarchy(this.notebookPanel);
                
                // Find the main panel widget
                const mainPanel = document.querySelector('.a11y-panel')?.closest('.lm-Widget');
                if (mainPanel) {
                  // Dispatch a custom event with just heading issues
                  const event = new CustomEvent('notebookReanalyzed', {
                    detail: { issues: headingIssues },
                    bubbles: true
                  });
                  mainPanel.dispatchEvent(event);
                }
              } catch (error) {
                console.error('Error reanalyzing notebook:', error);
              }
            }
          }, 100); // Small delay to ensure cell content is updated
        }
      });
    }
  }

  protected shouldShowApplyButton(): boolean {
    return true;
  }

  protected getDefaultDropdownText(): string {
    return `Current: h${this._currentLevel}`;
  }

  protected getDropdownOptions(): string {
    return ''; // Options are set in constructor after initialization
  }

  protected handleOptionSelect(value: string): void {
    const level = parseInt(value.replace('h', ''));
    this.selectedLevel = level;
    this.dropdownText.textContent = `Change to h${level}`;
    
    // Hide the dropdown content
    if (this.dropdownContent) {
      this.dropdownContent.classList.add('hidden');
      this.dropdownButton.classList.remove('active');
    }

    // Show the apply button
    if (this.applyButton) {
      this.applyButton.style.display = 'flex';
    }
  }

  applyDropdownSelection(selectedValue: string): void {
    console.log('applyDropdownSelection called with:', selectedValue);
    if (!this.selectedLevel) {
      console.log('No level selected');
      return;
    }

    console.log('Applying heading level change to:', this.selectedLevel);
    const entireCellContent = this.cell.model.sharedModel.getSource();
    const target = this.issue.issueContentRaw;
    let newContent = entireCellContent;

    // Check if the content is in Markdown format (starts with #)
    if (entireCellContent.trim().startsWith('#')) {
      console.log('Processing Markdown heading');
      const currentLevelMatch = entireCellContent.match(/^(#+)\s/);
      if (currentLevelMatch) {
        const currentMarkers = currentLevelMatch[1];
        newContent = entireCellContent.replace(
          new RegExp(`^${currentMarkers}\\s(.+)$`, 'm'),
          `${'#'.repeat(this.selectedLevel)} $1`
        );
        console.log('New content:', newContent);
      }
    }
    // Handle HTML headings
    else if (target.match(/<h\d[^>]*>/)) {
      console.log('Processing HTML heading');
      console.log('Target content:', target);
      console.log('Entire cell content:', entireCellContent);
      
      // Replace the heading in the entire cell content
      newContent = entireCellContent.replace(
        target,
        `<h${this.selectedLevel}>${target.match(/<h\d[^>]*>(.*?)<\/h\d>/)?.[1] || ''}</h${this.selectedLevel}>`
      );
      console.log('New content:', newContent);
    }

    if (newContent !== entireCellContent) {
      console.log('Updating cell content');
      this.cell.model.sharedModel.setSource(newContent);
      this.removeIssueWidget();
    } else {
      console.log('No changes made to content');
    }
  }

  private initializeValues(issue: ICellIssue): void {
    // Get previous level from metadata
    this.previousLevel = issue.metadata?.previousHeadingLevel;
    
    // If metadata doesn't have previous level, try to find the closest previous heading
    if (this.previousLevel === undefined) {
      this.previousLevel = this.findClosestPreviousHeading(issue.cellIndex);
      console.log('Found closest previous heading level:', this.previousLevel);
    }
    
    console.log('Current level set to:', this._currentLevel);
    console.log('Previous level:', this.previousLevel);

    // Update the dropdown text explicitly after initialization
    if (this.dropdownText) {
      this.dropdownText.textContent = this.getDefaultDropdownText();
    }

    // Force update dropdown content after initialization
    if (this.dropdownContent) {
      const validLevels = this.getValidHeadingLevels();
      console.log('Populating dropdown with levels:', Array.from(validLevels));
      this.dropdownContent.innerHTML = Array.from(validLevels)
        .sort((a, b) => a - b)
        .map(level => `
          <div class="dropdown-option" data-value="h${level}">
            Change to h${level}
          </div>
        `).join('');

      // Add click handlers to the options
      const options = this.dropdownContent.querySelectorAll('.dropdown-option');
      options.forEach(option => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          const value = (option as HTMLElement).dataset.value;
          if (value) {
            this.handleOptionSelect(value);
          }
        });
      });
    }
  }

  // Static helper method to parse heading level
  private static parseHeadingLevel(rawContent: string): number {
    console.log('Raw content:', rawContent);
    
    // Try HTML heading pattern first
    let htmlMatch = rawContent.match(/<h([1-6])[^>]*>/i);
    if (htmlMatch) {
      console.log('HTML match found:', htmlMatch);
      const level = parseInt(htmlMatch[1]);
      console.log('Current level set to:', level);
      return level;
    }
    
    // Try Markdown heading pattern - match # followed by space
    let mdMatch = rawContent.match(/^(#{1,6})\s+/m);
    if (mdMatch) {
      console.log('Markdown match found:', mdMatch);
      const level = mdMatch[1].length;
      console.log('Current level set to:', level);
      return level;
    }
    
    return 1; // Default level
  }

  private findClosestPreviousHeading(cellIndex: number): number | undefined {
    const notebook = this.cell.parent;
    if (!notebook) return undefined;

    // Start from the cell before the current one and go backwards
    for (let i = cellIndex - 1; i >= 0; i--) {
      const prevCell = (notebook as any).widgets[i];
      if (!prevCell || prevCell.model.type !== 'markdown') continue;

      const content = prevCell.model.sharedModel.getSource();
      // Check for markdown heading (# syntax)
      const mdMatch = content.match(/^(#{1,6})\s+/m);
      if (mdMatch) {
        return mdMatch[1].length;
      }
      // Check for HTML heading
      const htmlMatch = content.match(/<h([1-6])[^>]*>/i);
      if (htmlMatch) {
        return parseInt(htmlMatch[1]);
      }
    }
    return undefined;
  }

  private getValidHeadingLevels(): Set<number> {
    const validLevels = new Set<number>();
    
    if (this.previousLevel !== undefined) {
      // Special case: if previous heading is h1, current heading must be h2
      if (this.previousLevel === 1) {
        validLevels.add(2);
        console.log('Previous heading is h1, only allowing h2 as option');
        return validLevels;
      }

      // Can stay at the same level as the previous heading (but not if it's the current level)
      if (this.previousLevel !== this._currentLevel) {
        validLevels.add(this.previousLevel);
      }
      
      // Can go exactly one level deeper than the previous heading (but not if it's the current level)
      if (this.previousLevel < 6) {
        const nextLevel = this.previousLevel + 1;
        if (nextLevel !== this._currentLevel) {
          validLevels.add(nextLevel);
        }
      }

      // Can go exactly one level higher than the previous heading (but not if it's the current level)
      if (this.previousLevel > 1) {
        const prevLevel = this.previousLevel - 1;
        if (prevLevel !== this._currentLevel && prevLevel > 1) { // Also ensure we never include h1
          validLevels.add(prevLevel);
        }
      }

      console.log('Valid heading levels based on previous level:', this.previousLevel, Array.from(validLevels));
    } else {
      // If no previous level is found, only allow h2 (never h1)
      validLevels.add(2);
      console.log('No previous level found, defaulting to h2 option');
    }

    return validLevels;
  }
}

