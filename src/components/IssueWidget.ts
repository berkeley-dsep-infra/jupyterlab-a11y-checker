import { Widget } from '@lumino/widgets';
import { ServerConnection } from '@jupyterlab/services';
import { ICellAccessibilityIssue } from '../utils/types';
import { Cell, ICellModel } from '@jupyterlab/cells';
import {
  formatPrompt,
  getFixSuggestions,
  getImageAltSuggestion
} from '../services/AIService';

export class CellIssueWidget extends Widget {
  private issue: ICellAccessibilityIssue;
  private cell: Cell<ICellModel>;
  // private aiSuggestedFix: string = '';

  constructor(issue: ICellAccessibilityIssue, cell: Cell<ICellModel>) {
    super();
    this.issue = issue;
    this.cell = cell;

    this.addClass('issue-widget');

    // Create the basic structure
    this.node.innerHTML = `
            <div class="container">
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
                        ${
                          issue.axeViolation.id !== 'image-alt'
                            ? `
                        <button class="jp-Button2 suggest-button">
                          <span class="material-icons">auto_fix_high</span>
                          <div>Get AI Suggestions</div>
                        </button>
                        `
                            : ''
                        }
                    </div>
                    <div class="fix-widget-container"></div>
                </div>
            </div>
            `;

    // Add event listeners using query selectors
    const headerButton = this.node.querySelector('.issue-header-button');
    const locateButton = this.node.querySelector('.locate-button');
    const suggestButton = this.node.querySelector('.suggest-button');
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

    // Show suggest button initially if AI is enabled
    const mainPanel = document.getElementById('a11y-sidebar') as HTMLElement;
    if (mainPanel) {
      const aiToggleButton = mainPanel.querySelector('.ai-toggle');
      if (aiToggleButton && aiToggleButton.textContent?.includes('Enabled')) {
        const suggestButtonEl = this.node.querySelector(
          '.suggest-button'
        ) as HTMLElement;
        if (suggestButtonEl) {
          suggestButtonEl.style.display = 'flex';
        }
      }
    }

    locateButton?.addEventListener('click', () => this.navigateToCell());
    if (issue.axeViolation.id === 'image-alt') {
      suggestButton?.addEventListener('click', () => this.fillInAISuggestion());
    } else {
      suggestButton?.addEventListener('click', () =>
        this.getAISuggestions(this.issue)
      );
    }

    // Dynamically add the TextFieldFixWidget if needed
    if (issue.axeViolation.id === 'image-alt') {
      const fixWidgetContainer = this.node.querySelector(
        '.fix-widget-container'
      );
      if (fixWidgetContainer) {
        const textFieldFixWidget = new ImageAltFixWidget(issue, cell);
        fixWidgetContainer.appendChild(textFieldFixWidget.node);
      }
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

  private async fillInAISuggestion(): Promise<void> {
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

  private async getAISuggestions(
    issue: ICellAccessibilityIssue
  ): Promise<void> {
    const suggestionContainer = this.node.querySelector(
      '.suggestion-container'
    ) as HTMLElement;
    const suggestionElement = this.node.querySelector(
      '.suggestion'
    ) as HTMLElement;
    const applyButton = this.node.querySelector('.apply-button') as HTMLElement;

    // Display the suggestion container before loading
    suggestionContainer.style.display = 'block';
    // Loading spinner
    suggestionElement.innerHTML = `
            <span class="material-icons loading">refresh</span> Please wait...
        `;

    try {
      const suggestion = await getFixSuggestions(
        formatPrompt(issue),
        ServerConnection.makeSettings().baseUrl + 'ollama/',
        'mistral'
      );
      //this.aiSuggestedFix = suggestion;

      if (suggestion !== 'Error') {
        suggestionElement.textContent = suggestion;
        applyButton.style.display = 'flex';
      } else {
        suggestionElement.textContent =
          'Error getting suggestions. Please try again.';
      }
    } catch (error) {
      console.error(error);
      suggestionElement.textContent =
        'Error getting suggestions. Please try again.';
    }
  }

  // private async applySuggestion(): Promise<void> {
  //   if (!this.cell || !this.aiSuggestedFix) {
  //     return;
  //   }

  //   if (this.cell?.model) {
  //     this.cell.model.sharedModel.setSource(this.aiSuggestedFix);
  //   }
  // }
}

/**
 * Base class for all fix widgets
 */
abstract class FixWidget extends Widget {
  protected issue: ICellAccessibilityIssue;
  protected cell: Cell<ICellModel>;

  constructor(issue: ICellAccessibilityIssue, cell: Cell<ICellModel>) {
    super();
    this.issue = issue;
    this.cell = cell;
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
  constructor(issue: ICellAccessibilityIssue, cell: Cell<ICellModel>) {
    super(issue, cell);

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

    // Get references to DOM elements
    const applyButton = this.node.querySelector(
      '.apply-button'
    ) as HTMLButtonElement;

    if (applyButton) {
      applyButton.addEventListener('click', () => {
        const textInput = this.node.querySelector(
          '.jp-a11y-input'
        ) as HTMLInputElement;
        this.applyText(textInput.value.trim());
      });
    }
  }

  abstract applyText(providedText: string): void;
}

class ImageAltFixWidget extends TextFieldFixWidget {
  constructor(issue: ICellAccessibilityIssue, cell: Cell<ICellModel>) {
    super(issue, cell);
  }

  applyText(providedAltText: string): void {
    if (providedAltText === '') {
      console.log('Empty alt text, returning');
      return;
    }

    const entireCellContent = this.issue.contentRaw;
    const target = this.issue.node.html;

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
}
