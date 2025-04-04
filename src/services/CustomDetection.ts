import { CellAccessibilityIssue } from '../utils/types';

/**
 * Detects images without alt text in markdown content
 */
export function detectImageIssues(rawMarkdown: string, cellIndex: number, cellType: string): CellAccessibilityIssue[] {
    const issues: CellAccessibilityIssue[] = [];
    
    // Check for markdown images without alt text
    const markdownImageRegex = /!\[\]\([^)]+\)/g;
    let match;
    while ((match = markdownImageRegex.exec(rawMarkdown)) !== null) {
        issues.push(createImageAltIssue(cellIndex, cellType, match[0], rawMarkdown));
    }

    // Check for HTML images with empty alt tags
    const emptyAltRegex = /<img[^>]*alt=""[^>]*>/g;
    while ((match = emptyAltRegex.exec(rawMarkdown)) !== null) {
        issues.push(createImageAltIssue(cellIndex, cellType, match[0], rawMarkdown));
    }

    return issues;
}

/**
 * Creates a standardized image alt issue object
 */
function createImageAltIssue(
    cellIndex: number, 
    cellType: string, 
    html: string, 
    contentRaw: string
): CellAccessibilityIssue {
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
        contentRaw,
    };
} 