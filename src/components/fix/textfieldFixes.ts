import { ICellIssue, getIssueOffsets, replaceSlice } from '../../utils';
import {
  getImageAltSuggestion,
  getTableCaptionSuggestion,
  IModelSettings
} from '../../utils';

import { Cell, ICellModel } from '@jupyterlab/cells';
import { NotebookPanel } from '@jupyterlab/notebook';
import { TextFieldFixWidget } from './base';

export class ImageAltFixWidget extends TextFieldFixWidget {
  private visionSettings: IModelSettings;

  protected getDescription(): string {
    return 'Add or update alt text for the image:';
  }

  constructor(
    issue: ICellIssue,
    cell: Cell<ICellModel>,
    aiEnabled: boolean,
    visionSettings: IModelSettings
  ) {
    super(issue, cell, aiEnabled);
    this.visionSettings = visionSettings;
  }

  async applyTextToCell(providedAltText: string): Promise<void> {
    if (providedAltText === '') {
      return;
    }

    const entireCellContent = this.cell.model.sharedModel.getSource();
    const target = this.issue.issueContentRaw;

    // Try to parse deterministic offsets from metadata.issueId (format: cell-{idx}-image-missing-alt-o{start}-{end})
    const offsets = getIssueOffsets(this.issue, entireCellContent.length);
    const offsetStart: number | null = offsets?.offsetStart ?? null;
    const offsetEnd: number | null = offsets?.offsetEnd ?? null;

    // Offsets are already validated in getIssueOffsets

    // Handle HTML image tags
    const handleHtmlImage = (imageText: string): string => {
      // Alt attribute exists but is empty
      if (imageText.includes('alt=""') || imageText.includes("alt=''")) {
        return imageText.replace(/alt=["']\s*["']/, `alt="${providedAltText}"`);
      }
      // Alt attribute does not exist
      return imageText.replace(/\s*\/?>(?=$)/, ` alt="${providedAltText}"$&`);
    };

    // Handle markdown images
    const handleMarkdownImage = (imageText: string): string => {
      return imageText.replace(/!\[\]/, `![${providedAltText}]`);
    };

    let newContent = entireCellContent;

    if (offsetStart !== null && offsetEnd !== null) {
      const originalSlice = entireCellContent.slice(offsetStart, offsetEnd);
      let replacedSlice = originalSlice;
      if (originalSlice.startsWith('<img')) {
        replacedSlice = handleHtmlImage(originalSlice);
      } else if (originalSlice.startsWith('![')) {
        replacedSlice = handleMarkdownImage(originalSlice);
      }
      newContent = replaceSlice(
        entireCellContent,
        offsetStart,
        offsetEnd,
        replacedSlice
      );
    } else {
      // Fallback to previous behavior using the captured target
      if (target.startsWith('<img')) {
        newContent = entireCellContent.replace(target, handleHtmlImage(target));
      } else if (target.startsWith('![')) {
        newContent = entireCellContent.replace(
          target,
          handleMarkdownImage(target)
        );
      }
    }

    this.cell.model.sharedModel.setSource(newContent);

    // Remove the issue widget
    this.removeIssueWidget();

    await this.reanalyzeCellAndDispatch();
  }

  async displayAISuggestions(): Promise<void> {
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
        this.cell.node.querySelector('img')?.src || '',
        this.visionSettings
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
  private languageSettings: IModelSettings;

  protected getDescription(): string {
    return 'Add or update the caption for the table:';
  }

  constructor(
    issue: ICellIssue,
    cell: Cell<ICellModel>,
    aiEnabled: boolean,
    languageSettings: IModelSettings
  ) {
    super(issue, cell, aiEnabled);
    this.languageSettings = languageSettings;
  }

  async applyTextToCell(providedCaption: string): Promise<void> {
    if (providedCaption === '') {
      return;
    }

    const entireCellContent = this.cell.model.sharedModel.getSource();
    const target = this.issue.issueContentRaw;

    const handleHtmlTable = (tableHtml: string): string => {
      // Check if table already has a caption
      if (tableHtml.includes('<caption>')) {
        return tableHtml.replace(
          /<caption>.*?<\/caption>/,
          `<caption>${providedCaption}</caption>`
        );
      } else {
        return tableHtml.replace(
          /<table[^>]*>/,
          `$&\n  <caption>${providedCaption}</caption>`
        );
      }
    };

    let newContent = entireCellContent;

    if (target.includes('<table')) {
      const offsets = getIssueOffsets(this.issue, entireCellContent.length);
      if (offsets) {
        const { offsetStart, offsetEnd } = offsets;
        const originalSlice = entireCellContent.slice(offsetStart, offsetEnd);
        const replacedSlice = handleHtmlTable(originalSlice);
        newContent = replaceSlice(
          entireCellContent,
          offsetStart,
          offsetEnd,
          replacedSlice
        );
      } else {
        // Fallback to previous behavior
        newContent = entireCellContent.replace(target, handleHtmlTable(target));
      }
    }

    this.cell.model.sharedModel.setSource(newContent);

    // Remove the issue widget
    this.removeIssueWidget();

    await this.reanalyzeCellAndDispatch();
  }

  async displayAISuggestions(): Promise<void> {
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
        this.languageSettings
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

    // Always disable AI suggestion for missing H1 heading
    const suggestButton = this.node.querySelector(
      '.suggest-button'
    ) as HTMLButtonElement;
    if (suggestButton) {
      suggestButton.remove();
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

export class LinkTextFixWidget extends TextFieldFixWidget {
  protected getDescription(): string {
    return 'Update the link text or aria-label:';
  }

  applyTextToCell(providedText: string): void {
    if (providedText === '') {
      return;
    }

    const entireCellContent = this.cell.model.sharedModel.getSource();
    const offsets = getIssueOffsets(this.issue, entireCellContent.length);
    const offsetStart: number | null = offsets?.offsetStart ?? null;
    const offsetEnd: number | null = offsets?.offsetEnd ?? null;

    let newContent = entireCellContent;

    const replaceMarkdownLinkText = (full: string): string => {
      return full.replace(/\[[^\]]*\]/, `[${providedText}]`);
    };

    const replaceHtmlLinkTextOrAria = (full: string): string => {
      if (/aria-label=/.test(full)) {
        return full.replace(
          /aria-label=["'].*?["']/i,
          `aria-label="${providedText}"`
        );
      }
      // If there is no aria-label and no visible inner text, add aria-label
      const innerText = (
        full.replace(/<a\b[^>]*>/i, '').replace(/<\/a>/i, '') || ''
      )
        .replace(/<[^>]*>/g, '')
        .trim();
      if (innerText.length === 0) {
        return full.replace(
          /<a\b([^>]*)>/i,
          (_m, attrs) => `<a${attrs} aria-label="${providedText}">`
        );
      }
      // Otherwise, replace inner text
      return full.replace(
        /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/i,
        (_m, pre, _inner, post) => `${pre}${providedText}${post}`
      );
    };

    if (offsetStart !== null && offsetEnd !== null) {
      const originalSlice = entireCellContent.slice(offsetStart, offsetEnd);
      let replacedSlice = originalSlice;
      if (originalSlice.trim().startsWith('<a')) {
        replacedSlice = replaceHtmlLinkTextOrAria(originalSlice);
      } else if (originalSlice.trim().startsWith('[')) {
        replacedSlice = replaceMarkdownLinkText(originalSlice);
      }
      newContent = replaceSlice(
        entireCellContent,
        offsetStart,
        offsetEnd,
        replacedSlice
      );
    } else {
      const target = this.issue.issueContentRaw;
      if (target.trim().startsWith('<a')) {
        newContent = entireCellContent.replace(
          target,
          replaceHtmlLinkTextOrAria(target)
        );
      } else if (target.trim().startsWith('[')) {
        newContent = entireCellContent.replace(
          target,
          replaceMarkdownLinkText(target)
        );
      }
    }

    this.cell.model.sharedModel.setSource(newContent);
    this.removeIssueWidget();
    void this.reanalyzeCellAndDispatch();
  }

  async displayAISuggestions(): Promise<void> {
    // Not implemented for links today
    return;
  }
}
