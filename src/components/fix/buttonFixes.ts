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
    //const target = this.issue.issueContentRaw;

    //console.log('Processing table for scope fix:', target);

    // Process the table
    const processTable = (tableHtml: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(tableHtml, 'text/html');
      const table = doc.querySelector('table');

      if (!table) {
        return tableHtml;
      }

      // Get all rows, handling both direct tr children and tr children of tbody
      const rows = Array.from(table.querySelectorAll('tr'));
      //console.log('Found rows:', rows.length);

      if (rows.length === 0) {
        //console.log('No rows found in table');
        return tableHtml;
      }

      // Create new table structure
      const newTable = doc.createElement('table');

      // Copy all attributes from original table
      Array.from(table.attributes).forEach(attr => {
        newTable.setAttribute(attr.name, attr.value);
      });

      // Copy caption if it exists
      const existingCaption = table.querySelector('caption');
      if (existingCaption) {
        //console.log('Found existing caption:', existingCaption.textContent);
        newTable.appendChild(existingCaption.cloneNode(true));
      }

      // Process header row
      const headerRow = rows[0];
      const headerCells = headerRow.querySelectorAll('th, td');
      //console.log('Header cells found:', headerCells.length);

      if (headerCells.length > 0) {
        const thead = doc.createElement('thead');
        const newHeaderRow = doc.createElement('tr');

        headerCells.forEach(cell => {
          // Convert td to th if it's in the header row
          const newCell = doc.createElement('th');
          newCell.innerHTML = cell.innerHTML;
          newCell.setAttribute('scope', 'col');
          newHeaderRow.appendChild(newCell);
        });

        thead.appendChild(newHeaderRow);
        newTable.appendChild(thead);
      }

      // Process remaining rows
      const tbody = doc.createElement('tbody');
      rows.slice(1).forEach(row => {
        const newRow = doc.createElement('tr');
        const cells = row.querySelectorAll('td, th');

        cells.forEach((cell, index) => {
          const newCell = cell.cloneNode(true) as HTMLTableCellElement;
          if (cell.tagName.toLowerCase() === 'th') {
            newCell.setAttribute('scope', 'row');
          }
          newRow.appendChild(newCell);
        });

        tbody.appendChild(newRow);
      });

      newTable.appendChild(tbody);

      // Format the table HTML with proper indentation
      const formatTable = (table: HTMLElement): string => {
        const indent = '  '; // 2 spaces for indentation
        let result = '<table';

        // Add attributes
        Array.from(table.attributes).forEach(attr => {
          result += ` ${attr.name}="${attr.value}"`;
        });
        result += '>\n';

        // Add caption if it exists
        const caption = table.querySelector('caption');
        if (caption) {
          result += `${indent}<caption>${caption.textContent}</caption>\n`;
        }

        // Add thead if it exists
        const thead = table.querySelector('thead');
        if (thead) {
          result += `${indent}<thead>\n`;
          const headerRow = thead.querySelector('tr');
          if (headerRow) {
            result += `${indent}${indent}<tr>\n`;
            Array.from(headerRow.children).forEach(cell => {
              result += `${indent}${indent}${indent}${cell.outerHTML}\n`;
            });
            result += `${indent}${indent}</tr>\n`;
          }
          result += `${indent}</thead>\n`;
        }

        // Add tbody
        const tbody = table.querySelector('tbody');
        if (tbody) {
          result += `${indent}<tbody>\n`;
          Array.from(tbody.children).forEach(row => {
            result += `${indent}${indent}<tr>\n`;
            Array.from(row.children).forEach(cell => {
              result += `${indent}${indent}${indent}${cell.outerHTML}\n`;
            });
            result += `${indent}${indent}</tr>\n`;
          });
          result += `${indent}</tbody>\n`;
        }

        result += '</table>';
        return result;
      };

      const result = formatTable(newTable);
      return result;
    };

    // Find the table in the cell content
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/;
    const match = entireCellContent.match(tableRegex);

    if (match) {
      const newContent = entireCellContent.replace(
        match[0],
        processTable(match[0])
      );
      this.cell.model.sharedModel.setSource(newContent);
    }

    this.removeIssueWidget();
  }
}
