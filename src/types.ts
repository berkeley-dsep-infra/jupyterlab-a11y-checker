import axe from 'axe-core';

export interface CellAccessibilityIssue {
    cellIndex: number;
    cellType: string;
    axeResults: axe.Result;
    contentRaw: string;
} 