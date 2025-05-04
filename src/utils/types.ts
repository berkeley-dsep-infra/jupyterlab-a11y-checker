export interface ICellIssue {
  cellIndex: number;
  cellType: 'markdown' | 'code';
  violationId: string;
  customDescription?: string;
  customDetailedDescription?: string;
  issueContentRaw: string;
  metadata?: {
    previousHeadingLevel?: number;
    [key: string]: any;
  };
  suggestedFix?: string;
}

export interface IIssueInformation {
  title: string;
  description: string;
  detailedDescription: string;
  descriptionUrl?: string;
}
