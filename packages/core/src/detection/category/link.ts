import { ICellIssue } from "../../types.js";
import { findAllHtmlTags, stripHtmlTags } from "../../utils/sanitize.js";

const VAGUE_PHRASES = ["click", "here", "link", "more", "read"];
const MIN_DESCRIPTIVE_CHARS = 20;

function isUrlLike(text: string): boolean {
  const t = text.trim();
  return /^(https?:\/\/|www\.)/i.test(t);
}

function containsVaguePhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return VAGUE_PHRASES.some((p) => lower.includes(p));
}

function extractAttr(tag: string, attr: string): string | null {
  // Match attr='...' or attr="..."
  const m = new RegExp(attr + "=['\"][^'\"]+['\"]", "i").exec(tag);
  return m
    ? m[0].split("=")[1].replace(/^['"]/, "").replace(/['"]$/, "")
    : null;
}

/**
 * Find all markdown links [text](url) using indexOf scanning (no ReDoS).
 * Skips image links that start with ![.
 */
function findMarkdownLinks(
  text: string,
): Array<{ full: string; linkText: string; start: number; end: number }> {
  const results: Array<{
    full: string;
    linkText: string;
    start: number;
    end: number;
  }> = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const bracketOpen = text.indexOf("[", searchFrom);
    if (bracketOpen === -1) {
      break;
    }
    // Skip image links: ![
    if (bracketOpen > 0 && text[bracketOpen - 1] === "!") {
      searchFrom = bracketOpen + 1;
      continue;
    }
    const bracketClose = text.indexOf("](", bracketOpen + 1);
    if (bracketClose === -1) {
      searchFrom = bracketOpen + 1;
      continue;
    }
    const parenClose = text.indexOf(")", bracketClose + 2);
    if (parenClose === -1) {
      searchFrom = bracketClose + 1;
      continue;
    }
    const end = parenClose + 1;
    const full = text.slice(bracketOpen, end);
    const linkText = text.slice(bracketOpen + 1, bracketClose);
    results.push({ full, linkText, start: bracketOpen, end });
    searchFrom = end;
  }
  return results;
}

export function detectLinkIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
): ICellIssue[] {
  const issues: ICellIssue[] = [];

  // Markdown links: [text](url) — indexOf scanning (no ReDoS)
  const mdLinks = findMarkdownLinks(rawMarkdown);
  for (const { full, linkText, start, end } of mdLinks) {
    const text = linkText.trim();
    const violation = shouldFlag(text);
    if (violation) {
      issues.push({
        cellIndex,
        cellType: cellType as "code" | "markdown",
        violationId: "link-discernible-text",
        issueContentRaw: full,
        metadata: {
          issueId: `cell-${cellIndex}-link-discernible-text-o${start}-${end}`,
          offsetStart: start,
          offsetEnd: end,
        },
      });
    }
  }

  // HTML links: <a ...>text</a> — findAllHtmlTags (indexOf-based, no ReDoS)
  const htmlLinks = findAllHtmlTags(rawMarkdown, "a");
  for (const { match: full, start: tagStart, end: tagEnd } of htmlLinks) {
    // Extract inner content between opening <a> and closing </a>
    const openClose = full.indexOf(">");
    const closeTagIdx = full.lastIndexOf("</");
    let innerHtml = "";
    if (openClose !== -1 && closeTagIdx !== -1 && openClose < closeTagIdx) {
      innerHtml = full.slice(openClose + 1, closeTagIdx);
    }
    const inner = stripHtmlTags(innerHtml).trim();

    // Extract opening tag for attribute inspection
    const openingTag = openClose !== -1 ? full.slice(0, openClose + 1) : "";
    const aria = extractAttr(openingTag, "aria-label");
    const label = aria && aria.trim() ? aria.trim() : inner;

    // Explicitly flag anchors with no discernible text and no aria-label
    const hasAria = !!(aria && aria.trim());
    const hasInnerText = inner.length > 0;
    if (!hasAria && !hasInnerText) {
      issues.push({
        cellIndex,
        cellType: cellType as "code" | "markdown",
        violationId: "link-discernible-text",
        issueContentRaw: full,
        metadata: {
          issueId: `cell-${cellIndex}-link-discernible-text-o${tagStart}-${tagEnd}`,
          offsetStart: tagStart,
          offsetEnd: tagEnd,
        },
      });
      continue;
    }

    const violation = shouldFlag(label);
    if (violation) {
      issues.push({
        cellIndex,
        cellType: cellType as "code" | "markdown",
        violationId: "link-discernible-text",
        issueContentRaw: full,
        metadata: {
          issueId: `cell-${cellIndex}-link-discernible-text-o${tagStart}-${tagEnd}`,
          offsetStart: tagStart,
          offsetEnd: tagEnd,
        },
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
