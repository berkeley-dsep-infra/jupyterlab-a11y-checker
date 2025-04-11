export interface ICellIssue {
  cellIndex: number;
  cellType: 'markdown' | 'code';
  violation: {
    id: string;
    description: string;
    descriptionUrl?: string;
  };
  issueContentRaw: string;
}
