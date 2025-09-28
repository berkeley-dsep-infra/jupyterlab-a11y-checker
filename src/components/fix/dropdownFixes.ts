import { ICellIssue } from '../../utils/types';
import { getIssueOffsets, replaceSlice } from '../../utils';
// Keep imports minimal; reanalysis now handled by base class helpers
import { analyzeTableIssues } from '../../utils/detection/category/table';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Cell, ICellModel } from '@jupyterlab/cells';
// import { NotebookPanel } from '@jupyterlab/notebook';
import { DropdownFixWidget } from './base';
import {
  analyzeHeadingHierarchy,
  detectHeadingOneIssue
} from '../../utils/detection/category/heading';
export class TableHeaderFixWidget extends DropdownFixWidget {
  protected getDescription(): string {
    return 'Choose which row or column should be used as the header:';
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
    this.dropdownText.textContent =
      this.dropdownContent
        .querySelector(`[data-value="${value}"]`)
        ?.textContent?.trim() || 'Select header type';
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

    // Wait a short delay for the cell to update
    setTimeout(async () => {
      if (this.cell.parent?.parent) {
        try {
          // Only analyze table issues
          const tableIssues = await analyzeTableIssues(
            this.cell.parent.parent as NotebookPanel
          );

          // Find the main panel widget
          const mainPanel = document
            .querySelector('.a11y-panel')
            ?.closest('.lm-Widget');
          if (mainPanel) {
            // Dispatch a custom event with just table issues
            const event = new CustomEvent('notebookReanalyzed', {
              detail: {
                issues: tableIssues,
                isTableUpdate: true
              },
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
}

export class HeadingOrderFixWidget extends DropdownFixWidget {
  protected getDescription(): string {
    return 'Choose from one of the following heading styles instead:';
  }

  private _currentLevel: number = 1; // Initialize with default value
  private previousLevel: number | undefined;
  protected selectedLevel: number | undefined;
  // private notebookPanel: NotebookPanel;

  constructor(issue: ICellIssue, cell: Cell<ICellModel>, aiEnabled: boolean) {
    super(issue, cell, aiEnabled);

    // Get reference to notebook panel
    // Keep reference in case other methods require it; not used in reanalysis anymore
    // this.notebookPanel = cell.parent?.parent as NotebookPanel;

    // Parse and set the current level immediately
    this._currentLevel = HeadingOrderFixWidget.parseHeadingLevel(
      issue.issueContentRaw
    );

    // Initialize values after super
    this.initializeValues(issue);

    // Setup apply button handler
    if (this.applyButton) {
      this.applyButton.addEventListener('click', async () => {
        if (this.selectedLevel) {
          this.applyDropdownSelection(`h${this.selectedLevel}`);
          await this.reanalyzeNotebookAndDispatch();
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
    if (!this.selectedLevel) {
      return;
    }

    const entireCellContent = this.cell.model.sharedModel.getSource();
    const target = this.issue.issueContentRaw;
    let newContent = entireCellContent;

    const offsets = getIssueOffsets(this.issue, entireCellContent.length);
    if (offsets) {
      const { offsetStart, offsetEnd } = offsets;
      const originalSlice = entireCellContent.slice(offsetStart, offsetEnd);

      let replacedSlice = originalSlice;
      // Markdown heading: starts with hashes (allow missing or multiple spaces)
      const mdMatch = originalSlice.match(/^(#{1,6})[ \t]*(.*)$/m);
      if (mdMatch) {
        const headingText = (mdMatch[2] || '').trim();
        const trailingNewline = originalSlice.endsWith('\n') ? '\n' : '';
        replacedSlice = `${'#'.repeat(this.selectedLevel)} ${headingText}${trailingNewline}`;
      } else {
        // HTML heading
        const inner =
          originalSlice.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i)?.[1] || '';
        replacedSlice = `<h${this.selectedLevel}>${inner}</h${this.selectedLevel}>`;
      }

      newContent = replaceSlice(
        entireCellContent,
        offsetStart,
        offsetEnd,
        replacedSlice
      );
    } else {
      // Fallback: use previous behavior on entire cell
      if (entireCellContent.trim().startsWith('#')) {
        const currentLevelMatch = entireCellContent.match(/^(#+)[ \t]*/);
        if (currentLevelMatch) {
          const currentMarkers = currentLevelMatch[1];
          newContent = entireCellContent.replace(
            new RegExp(`^${currentMarkers}[ \\t]*(.*)$`, 'm'),
            `${'#'.repeat(this.selectedLevel)} $1`
          );
        }
      } else if (target.match(/<h\d[^>]*>/)) {
        newContent = entireCellContent.replace(
          target,
          `<h${this.selectedLevel}>${target.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/)?.[1] || ''}</h${this.selectedLevel}>`
        );
      }
    }

    if (newContent !== entireCellContent) {
      this.cell.model.sharedModel.setSource(newContent);
      this.removeIssueWidget();
    }
  }

  private initializeValues(issue: ICellIssue): void {
    // Get previous level from metadata
    this.previousLevel = issue.metadata?.previousHeadingLevel;

    // If metadata doesn't have previous level, try to find the closest previous heading
    if (this.previousLevel === undefined) {
      this.previousLevel = this.findClosestPreviousHeading(issue.cellIndex);
    }

    // Update the dropdown text explicitly after initialization
    if (this.dropdownText) {
      this.dropdownText.textContent = this.getDefaultDropdownText();
    }

    // Force update dropdown content after initialization
    if (this.dropdownContent) {
      const validLevels = this.getValidHeadingLevels();
      this.dropdownContent.innerHTML = Array.from(validLevels)
        .sort((a, b) => a - b)
        .map(
          level => `
            <div class="dropdown-option" data-value="h${level}">
              Change to h${level}
            </div>
          `
        )
        .join('');

      // Add click handlers to the options
      const options = this.dropdownContent.querySelectorAll('.dropdown-option');
      options.forEach(option => {
        option.addEventListener('click', e => {
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
    // Try HTML heading pattern first
    const htmlMatch = rawContent.match(/<h([1-6])[^>]*>/i);
    if (htmlMatch) {
      const level = parseInt(htmlMatch[1]);
      return level;
    }

    // Try Markdown heading pattern - match # followed by space
    const mdMatch = rawContent.match(/^(#{1,6})\s+/m);
    if (mdMatch) {
      const level = mdMatch[1].length;
      return level;
    }

    return 1; // Default level
  }

  private findClosestPreviousHeading(cellIndex: number): number | undefined {
    const notebook = this.cell.parent;
    if (!notebook) {
      return undefined;
    }

    // Start from the cell before the current one and go backwards
    for (let i = cellIndex - 1; i >= 0; i--) {
      const prevCell = (notebook as any).widgets[i];
      if (!prevCell || prevCell.model.type !== 'markdown') {
        continue;
      }

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

    // Always add h2 as a valid option
    validLevels.add(2);

    if (this.previousLevel !== undefined) {
      // Special case: if previous heading is h1, current heading must be h2
      if (this.previousLevel === 1) {
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
        if (prevLevel !== this._currentLevel && prevLevel > 1) {
          // Also ensure we never include h1
          validLevels.add(prevLevel);
        }
      }
    }

    return validLevels;
  }

  // Override notebook reanalysis to run heading-wide checks
  protected async reanalyzeNotebookAndDispatch(): Promise<void> {
    const notebookPanel = this.cell.parent?.parent as NotebookPanel;
    if (!notebookPanel) {
      return;
    }
    setTimeout(async () => {
      const headingHierarchyIssues =
        await analyzeHeadingHierarchy(notebookPanel);
      const headingOneIssues = await detectHeadingOneIssue(
        '',
        0,
        'markdown',
        notebookPanel.content.widgets
      );
      const allHeadingIssues = [...headingHierarchyIssues, ...headingOneIssues];
      const mainPanel = document
        .querySelector('.a11y-panel')
        ?.closest('.lm-Widget');
      if (mainPanel) {
        const event = new CustomEvent('notebookReanalyzed', {
          detail: {
            issues: allHeadingIssues,
            isHeadingUpdate: true
          },
          bubbles: true
        });
        mainPanel.dispatchEvent(event);
      }
    }, 100);
  }
}
