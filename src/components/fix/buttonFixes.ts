// In src/components/fix/buttonFixes.ts

import { ButtonFixWidget } from './base';

export class TableScopeFixWidget extends ButtonFixWidget {
  protected getDescription(): string {
    return 'Add scope attributes to all table headers:';
  }

  protected getApplyButtonText(): string {
    return 'Apply Scope Fixes';
  }

  protected applyFix(): void {
    const entireCellContent = this.cell.model.sharedModel.getSource();
    const target = this.issue.issueContentRaw;

    // Process the table
    const processTable = (tableHtml: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(tableHtml, 'text/html');
      const table = doc.querySelector('table');

      if (!table) {
        return tableHtml;
      }

      // Get all rows
      const rows = table.querySelectorAll('tr');

      // Process each row
      rows.forEach((row, rowIndex) => {
        // Get all th elements in this row
        const headers = row.querySelectorAll('th');

        headers.forEach(header => {
          // First row gets scope="col", others get scope="row"
          const scope = rowIndex === 0 ? 'col' : 'row';

          // If scope already exists, update it
          if (header.hasAttribute('scope')) {
            header.setAttribute('scope', scope);
          } else {
            // Otherwise add scope attribute
            header.setAttribute('scope', scope);
          }
        });
      });

      return table.outerHTML;
    };

    const newContent = entireCellContent.replace(target, processTable(target));
    this.cell.model.sharedModel.setSource(newContent);
    this.removeIssueWidget();
  }
}
