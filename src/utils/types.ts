import axe from 'axe-core';

export interface CellAccessibilityIssue {
    cellIndex: number;
    cellType: string;
    axeViolation: axe.Result;
    node: axe.NodeResult;
    contentRaw: string;
} 