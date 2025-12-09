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

export interface IGeneralCell {
  cellIndex: number;
  type: 'markdown' | 'code' | 'raw';
  source: string;
  attachments?: { [key: string]: { [mimeType: string]: string } };
}

export interface IIssueInformation {
  title: string;
  description: string;
  detailedDescription: string;
  descriptionUrl?: string;
}

export interface IImageProcessor {
  loadImage(src: string): Promise<any>;
  createCanvas(width: number, height: number): any;
}
