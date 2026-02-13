/**
 * Shared sanitization utilities for safe HTML handling.
 */

/**
 * Strips all HTML tags from a string by looping until stable.
 * Prevents nested tag bypass (e.g., `<scr<script>ipt>`).
 */
export function stripHtmlTags(input: string): string {
  let prev = input;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const next = prev.replace(/<[^>]*>/g, "");
    if (next === prev) {
      return next;
    }
    prev = next;
  }
}

/**
 * Escapes special characters for safe interpolation into HTML attributes.
 */
export function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escapes special characters for safe interpolation into HTML text content.
 * Only escapes characters that could create tags or break entities.
 */
export function escapeHtmlText(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Finds all `<tagName>...</tagName>` blocks using indexOf-based linear scanning.
 * No regex backtracking — safe against ReDoS on malformed input.
 */
export function findAllHtmlTags(
  html: string,
  tagName: string,
): Array<{ match: string; start: number; end: number }> {
  const results: Array<{ match: string; start: number; end: number }> = [];
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  const lowerHtml = html.toLowerCase();
  const lowerOpen = openTag.toLowerCase();
  const lowerClose = closeTag.toLowerCase();

  let searchFrom = 0;
  while (searchFrom < lowerHtml.length) {
    const openIdx = lowerHtml.indexOf(lowerOpen, searchFrom);
    if (openIdx === -1) {
      break;
    }
    // Ensure the open tag is followed by whitespace or '>' (not a longer tag name)
    const charAfter = lowerHtml[openIdx + lowerOpen.length];
    if (
      charAfter !== undefined &&
      charAfter !== ">" &&
      charAfter !== " " &&
      charAfter !== "\t" &&
      charAfter !== "\n" &&
      charAfter !== "\r" &&
      charAfter !== "/"
    ) {
      searchFrom = openIdx + 1;
      continue;
    }

    const closeIdx = lowerHtml.indexOf(lowerClose, openIdx + lowerOpen.length);
    if (closeIdx === -1) {
      // No closing tag found — skip this open tag
      searchFrom = openIdx + 1;
      continue;
    }
    const end = closeIdx + closeTag.length;
    results.push({
      match: html.slice(openIdx, end),
      start: openIdx,
      end,
    });
    searchFrom = end;
  }
  return results;
}
