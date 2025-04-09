import { ICellAccessibilityIssue } from '../utils/types';

// ** IMAGE ISSUES */

// Detects images without alt text in markdown content
export function detectImageIssues(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellAccessibilityIssue[] {
  const issues: ICellAccessibilityIssue[] = [];

  // Check for markdown images without alt text
  const markdownImageRegex = /!\[\]\([^)]+\)/g;
  let match;
  while ((match = markdownImageRegex.exec(rawMarkdown)) !== null) {
    issues.push(
      createImageAltIssue(cellIndex, cellType, match[0], rawMarkdown)
    );
  }

  // Check for HTML images with empty alt tags
  const emptyAltRegex = /<img[^>]*alt=""[^>]*>/g;
  while ((match = emptyAltRegex.exec(rawMarkdown)) !== null) {
    issues.push(
      createImageAltIssue(cellIndex, cellType, match[0], rawMarkdown)
    );
  }

  return issues;
}

// Creates a standardized image alt issue object
function createImageAltIssue(
  cellIndex: number,
  cellType: string,
  html: string,
  contentRaw: string
): ICellAccessibilityIssue {
  return {
    cellIndex,
    cellType,
    axeViolation: {
      id: 'image-alt',
      help: 'Images must have alternate text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
      description: 'Images must have alternate text',
      tags: ['wcag2a', 'wcag2aa'],
      nodes: []
    },
    node: {
      html,
      target: [html],
      any: [],
      all: [],
      none: []
    },
    contentRaw
  };
}

// ** TABLE ISSUES */

// Detects tables without headers
export function detectTableIssues(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellAccessibilityIssue[] {
  const issues: ICellAccessibilityIssue[] = [];

  // Check for tables without th tags
  const tableWithoutThRegex =
    /<table[^>]*>(?![\s\S]*?<th[^>]*>)[\s\S]*?<\/table>/gi;
  let match;
  while ((match = tableWithoutThRegex.exec(rawMarkdown)) !== null) {
    issues.push(createTableThIssue(cellIndex, cellType, match[0], rawMarkdown));
  }

  // Check for tables without caption tags
  const tableWithoutCaptionRegex =
    /<table[^>]*>(?![\s\S]*?<caption[^>]*>)[\s\S]*?<\/table>/gi;
  while ((match = tableWithoutCaptionRegex.exec(rawMarkdown)) !== null) {
    issues.push(
      createTableCaptionIssue(cellIndex, cellType, match[0], rawMarkdown)
    );
  }

  return issues;
}

// Creates a standardized table th issue object
function createTableThIssue(
  cellIndex: number,
  cellType: string,
  html: string,
  contentRaw: string
): ICellAccessibilityIssue {
  return {
    cellIndex,
    cellType,
    axeViolation: {
      id: 'td-has-header',
      help: 'Tables must have headers',
      helpUrl: '',
      description: 'Tables must have headers',
      tags: ['wcag2a', 'wcag2aa'],
      nodes: []
    },
    node: {
      html,
      target: [html],
      any: [],
      all: [],
      none: []
    },
    contentRaw
  };
}

function createTableCaptionIssue(
  cellIndex: number,
  cellType: string,
  html: string,
  contentRaw: string
): ICellAccessibilityIssue {
  return {
    cellIndex,
    cellType,
    axeViolation: {
      id: 'table-has-caption',
      help: 'Tables must have captions',
      helpUrl: '',
      description: 'Tables must have captions',
      tags: ['wcag2a', 'wcag2aa'],
      nodes: []
    },
    node: {
      html,
      target: [html],
      any: [],
      all: [],
      none: []
    },
    contentRaw
  };
}
