import axe from 'axe-core';

export interface ICellAccessibilityIssue {
  cellIndex: number;
  cellType: string;
  axeViolation: axe.Result;
  node: axe.NodeResult;
  contentRaw: string;
}

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
