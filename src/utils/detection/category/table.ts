import { ICellIssue } from '../../types';

export function detectTableIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellIssue[] {
  const notebookIssues: ICellIssue[] = [];

  // Check for tables without th tags
  const tableWithoutThRegex =
    /<table[^>]*>(?![\s\S]*?<th[^>]*>)[\s\S]*?<\/table>/gi;
  let match;
  while ((match = tableWithoutThRegex.exec(rawMarkdown)) !== null) {
    notebookIssues.push({
      cellIndex,
      cellType: cellType as 'code' | 'markdown',
      violation: {
        id: 'table-missing-header',
        description: 'Tables must have header information',
        descriptionUrl:
          'https://dequeuniversity.com/rules/axe/4.10/td-has-header?application=RuleDescription'
      },
      issueContentRaw: match[0]
    });
  }

  // Check for tables without caption tags
  const tableWithoutCaptionRegex =
    /<table[^>]*>(?![\s\S]*?<caption[^>]*>)[\s\S]*?<\/table>/gi;
  while ((match = tableWithoutCaptionRegex.exec(rawMarkdown)) !== null) {
    notebookIssues.push({
      cellIndex,
      cellType: cellType as 'code' | 'markdown',
      violation: {
        id: 'table-missing-caption',
        description: 'Tables must have caption information',
        descriptionUrl: ''
      },
      issueContentRaw: match[0]
    });
  }

  // Check for tables with th tags but missing scope attributes
  const tableWithThRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
  while ((match = tableWithThRegex.exec(rawMarkdown)) !== null) {
    const tableHtml = match[0];
    const parser = new DOMParser();
    const doc = parser.parseFromString(tableHtml, 'text/html');
    const table = doc.querySelector('table');
    
    if (table) {
      const thElements = table.querySelectorAll('th');
      let hasMissingScope = false;
      
      thElements.forEach(th => {
        if (!th.hasAttribute('scope')) {
          hasMissingScope = true;
        }
      });
      
      if (hasMissingScope) {
        notebookIssues.push({
          cellIndex,
          cellType: cellType as 'code' | 'markdown',
          violation: {
            id: 'table-missing-scope',
            description: 'Table headers must have scope attributes',
            descriptionUrl: ''
          },
          issueContentRaw: tableHtml
        });
      }
    }
  }

  return notebookIssues;
}
