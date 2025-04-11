import { Widget } from '@lumino/widgets';

import { ICellIssue } from '../utils/types';
import { getImageAltSuggestion } from '../utils/ai-utils';

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

abstract class TextFieldFixWidget extends FixWidget {
  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    // Simplified DOM structure
    this.node.innerHTML = `
        <div class="textfield-fix-widget">
          <input type="text" class="jp-a11y-input" placeholder="Input text here...">
          <div class="textfield-buttons">
              <button class="jp-Button2 suggest-button">
                  <span class="material-icons">auto_fix_high</span>
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
