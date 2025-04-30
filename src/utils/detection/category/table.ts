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
  return notebookIssues;
}
