import { ICellIssue } from '../../utils';
import { getImageAltSuggestion, getTableCaptionSuggestion } from '../../utils';

import { Cell, ICellModel } from '@jupyterlab/cells';
import { ServerConnection } from '@jupyterlab/services';
import { NotebookPanel } from '@jupyterlab/notebook';
import { TextFieldFixWidget } from './base';

export class ImageAltFixWidget extends TextFieldFixWidget {
  protected getDescription(): string {
    return 'Add or update alt text for the image:';
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
    loadingOverlay.className = 'loading-overlay';
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
    return 'Add or update the caption for the table:';
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
    loadingOverlay.className = 'loading-overlay';
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

export class HeadingOneFixWidget extends TextFieldFixWidget {
  protected getDescription(): string {
    return 'Add a new level one (h1) heading to the top of the notebook:';
  }

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    const input = this.node.querySelector('.jp-a11y-input') as HTMLInputElement;
    if (input) {
      input.placeholder = 'Input h1 heading text...';
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
    const headingInput = this.node.querySelector(
      '.jp-a11y-input'
    ) as HTMLInputElement;
    if (!headingInput) {
      return;
    }

    // Save the original placeholder text
    const originalPlaceholder = headingInput.placeholder;

    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
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
      headingInput.value = 'Notebook Title';
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
