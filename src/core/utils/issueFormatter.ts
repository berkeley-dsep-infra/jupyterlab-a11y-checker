import { ICellIssue } from '../types.js';

export interface ILLMIssue {
  violationId: string;
  cellIndex: number;
  cellType: 'markdown' | 'code';
  description: string;
  contentSnippet: string;
}

export interface ILLMSummaryItem {
  violationId: string;
  count: number;
}

export interface ILLMReport {
  summary: {
    totalIssues: number;
    issuesByViolation: ILLMSummaryItem[];
  };
  issues: ILLMIssue[];
}

function normalizeContent(raw?: string): string {
  if (!raw) {
    return '';
  }
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  return cleaned.substring(0, 160);
}

export function buildLLMReport(issues: ICellIssue[]): ILLMReport {
  const issuesByViolation: Record<string, number> = {};
  const llmIssues: ILLMIssue[] = issues.map(issue => {
    issuesByViolation[issue.violationId] =
      (issuesByViolation[issue.violationId] || 0) + 1;
    return {
      violationId: issue.violationId,
      cellIndex: issue.cellIndex,
      cellType: issue.cellType,
      description: issue.customDescription || '',
      contentSnippet: normalizeContent(issue.issueContentRaw)
    };
  });

  const summaryItems: ILLMSummaryItem[] = Object.entries(issuesByViolation).map(
    ([violationId, count]) => ({ violationId, count })
  );

  return {
    summary: {
      totalIssues: issues.length,
      issuesByViolation: summaryItems
    },
    issues: llmIssues
  };
}
