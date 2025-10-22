import { ICellIssue } from '../../types';

const VAGUE_PHRASES = ['click', 'here', 'link', 'more', 'read'];
const MIN_DESCRIPTIVE_CHARS = 20;

function isUrlLike(text: string): boolean {
  const t = text.trim();
  return /^(https?:\/\/|www\.)/i.test(t);
}

function containsVaguePhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return VAGUE_PHRASES.some(p => lower.includes(p));
}

function extractAttr(tag: string, attr: string): string | null {
  // Match attr='...' or attr="..."
  const m = new RegExp(attr + '=[\'"][^\'"]+[\'"]', 'i').exec(tag);
  return m
    ? m[0].split('=')[1].replace(/^['"]/, '').replace(/['"]$/, '')
    : null;
}

export function detectLinkIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellIssue[] {
  const issues: ICellIssue[] = [];

  // Markdown links: [text](url)
  const mdLink = /\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLink.exec(rawMarkdown)) !== null) {
    const full = match[0];
    const text = (match[1] || '').trim();
    const start = match.index ?? 0;
    const end = start + full.length;
    const violation = shouldFlag(text);
    if (violation) {
      issues.push({
        cellIndex,
        cellType: cellType as 'code' | 'markdown',
        violationId: 'link-discernible-text',
        issueContentRaw: full,
        metadata: {
          issueId: `cell-${cellIndex}-link-discernible-text-o${start}-${end}`,
          offsetStart: start,
          offsetEnd: end
        }
      });
    }
  }

  // HTML links: <a ...>text</a>
  const htmlLink = /<a\b[^>]*>\s*([\s\S]*?)\s*<\/a>/gi;
  while ((match = htmlLink.exec(rawMarkdown)) !== null) {
    const full = match[0];
    const inner = (match[1] || '').replace(/<[^>]*>/g, '').trim();
    const tagStart = match.index ?? 0;
    const tagEnd = tagStart + full.length;

    // Use aria-label if provided
    const openingTagMatch = /<a\b[^>]*>/i.exec(full);
    const openingTag = openingTagMatch ? openingTagMatch[0] : '';
    const aria = extractAttr(openingTag, 'aria-label');
    const label = aria && aria.trim() ? aria.trim() : inner;

    // Explicitly flag anchors with no discernible text and no aria-label
    const hasAria = !!(aria && aria.trim());
    const hasInnerText = inner.length > 0;
    if (!hasAria && !hasInnerText) {
      issues.push({
        cellIndex,
        cellType: cellType as 'code' | 'markdown',
        violationId: 'link-discernible-text',
        issueContentRaw: full,
        metadata: {
          issueId: `cell-${cellIndex}-link-discernible-text-o${tagStart}-${tagEnd}`,
          offsetStart: tagStart,
          offsetEnd: tagEnd
        }
      });
      continue;
    }

    const violation = shouldFlag(label);
    if (violation) {
      issues.push({
        cellIndex,
        cellType: cellType as 'code' | 'markdown',
        violationId: 'link-discernible-text',
        issueContentRaw: full,
        metadata: {
          issueId: `cell-${cellIndex}-link-discernible-text-o${tagStart}-${tagEnd}`,
          offsetStart: tagStart,
          offsetEnd: tagEnd
        }
      });
    }
  }

  return issues;
}

function shouldFlag(text: string): boolean {
  // Flag if entire text is a URL
  if (isUrlLike(text)) {
    return true;
  }
  // AND condition: vague phrase present AND too short
  const tooShort = text.trim().length < MIN_DESCRIPTIVE_CHARS;
  const hasVague = containsVaguePhrase(text);
  return hasVague && tooShort;
}
