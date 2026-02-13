import Tesseract from "tesseract.js";
import { ICellIssue, IImageProcessor, IGeneralCell } from "../../types.js";

async function getTextInImage(
  imagePath: string,
  currentDirectoryPath: string,
  baseUrl: string,
  imageProcessor: IImageProcessor,
  attachments?: IGeneralCell["attachments"],
): Promise<{ text: string; confidence: number }> {
  const worker = await Tesseract.createWorker("eng");
  try {
    let imageSource: string;

    // Check if this is a JupyterLab attachment
    if (imagePath.startsWith("attachment:")) {
      if (!attachments) {
        throw new Error("Attachments required for attachment images");
      }
      const attachmentId = imagePath.substring("attachment:".length);
      const data = attachments[attachmentId];
      let dataUrl: string | null = null;

      if (data) {
        for (const mimetype in data) {
          if (mimetype.startsWith("image/")) {
            const base64 = data[mimetype];
            if (typeof base64 === "string") {
              dataUrl = `data:${mimetype};base64,${base64}`;
              break;
            }
          }
        }
      }

      if (!dataUrl) {
        throw new Error(`Could not load attachment: ${attachmentId}`);
      }
      imageSource = dataUrl;
    } else {
      imageSource = imagePath.startsWith("http")
        ? imagePath
        : baseUrl
          ? `${baseUrl}files/${currentDirectoryPath}/${imagePath}`
          : `${currentDirectoryPath}/${imagePath}`; // Simple join for CLI
    }

    // Load image using the processor (handles Browser vs Node differences)
    const img = await imageProcessor.loadImage(imageSource);

    const {
      data: { text, confidence },
    } = await worker.recognize(img);

    if (!text) {
      throw new Error("No text found in the image");
    }
    return { text, confidence };
  } finally {
    await worker.terminate();
  }
}

/**
 * Find all <img ...> tags using indexOf-based scanning (no ReDoS).
 */
function findImgTags(
  html: string,
): Array<{ tag: string; start: number; end: number }> {
  const results: Array<{ tag: string; start: number; end: number }> = [];
  const lower = html.toLowerCase();
  let searchFrom = 0;
  while (searchFrom < lower.length) {
    const idx = lower.indexOf("<img", searchFrom);
    if (idx === -1) {
      break;
    }
    // Ensure it's actually an <img tag (next char must be space, >, /)
    const charAfter = lower[idx + 4];
    if (
      charAfter !== undefined &&
      charAfter !== ">" &&
      charAfter !== " " &&
      charAfter !== "\t" &&
      charAfter !== "\n" &&
      charAfter !== "\r" &&
      charAfter !== "/"
    ) {
      searchFrom = idx + 1;
      continue;
    }
    const closeIdx = html.indexOf(">", idx + 4);
    if (closeIdx === -1) {
      break;
    }
    const end = closeIdx + 1;
    results.push({ tag: html.slice(idx, end), start: idx, end });
    searchFrom = end;
  }
  return results;
}

/**
 * Extract image URL from a matched image string (markdown or HTML).
 */
function extractImageUrl(imageStr: string): string | null {
  // Markdown: ![...](url)
  const parenOpen = imageStr.indexOf("(");
  if (parenOpen !== -1) {
    const parenClose = imageStr.indexOf(")", parenOpen + 1);
    if (parenClose !== -1) {
      return imageStr.slice(parenOpen + 1, parenClose).trim();
    }
  }
  // HTML: src="url" or src='url'
  const lower = imageStr.toLowerCase();
  const srcIdx = lower.indexOf("src=");
  if (srcIdx !== -1) {
    const quote = imageStr[srcIdx + 4];
    if (quote === '"' || quote === "'") {
      const closeQuote = imageStr.indexOf(quote, srcIdx + 5);
      if (closeQuote !== -1) {
        return imageStr.slice(srcIdx + 5, closeQuote);
      }
    }
  }
  return null;
}

export async function detectImageIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  notebookPath: string,
  baseUrl: string,
  imageProcessor: IImageProcessor,
  attachments?: IGeneralCell["attachments"],
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // Collect all images missing alt text: { matchStr, start, end }
  const missingAlt: Array<{ matchStr: string; start: number; end: number }> =
    [];

  // 1. Markdown images without alt text: ![](...) — safe regex (single quantifier)
  const mdSyntaxMissingAltRegex = /!\[\]\([^)]+\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdSyntaxMissingAltRegex.exec(rawMarkdown)) !== null) {
    missingAlt.push({
      matchStr: mdMatch[0],
      start: mdMatch.index,
      end: mdMatch.index + mdMatch[0].length,
    });
  }

  // 2. HTML <img> tags: use indexOf scanning instead of dangerous regexes
  const imgTags = findImgTags(rawMarkdown);
  for (const { tag, start, end } of imgTags) {
    // Check if alt attribute is present and non-empty
    const hasNonEmptyAlt = /\balt\s*=\s*["'][^"']+["']/i.test(tag);
    if (!hasNonEmptyAlt) {
      missingAlt.push({ matchStr: tag, start, end });
    }
  }

  // Process each image missing alt text
  for (const { matchStr, start, end } of missingAlt) {
    const imageUrl = extractImageUrl(matchStr);
    if (!imageUrl) {
      continue;
    }

    const issueId = "image-missing-alt";

    let suggestedFix: string = "";
    try {
      // Only run OCR if baseUrl is provided (Extension mode)
      // In CLI mode (baseUrl is empty), we skip OCR to avoid Tesseract/Canvas issues
      if (baseUrl) {
        const ocrResult = await getTextInImage(
          imageUrl,
          notebookPath,
          baseUrl,
          imageProcessor,
          attachments,
        );
        if (ocrResult.confidence > 40) {
          suggestedFix = ocrResult.text;
        }
      }
    } catch (error) {
      console.error(`Failed to process image ${imageUrl}:`, error);
    } finally {
      notebookIssues.push({
        cellIndex,
        cellType: cellType as "code" | "markdown",
        violationId: issueId,
        issueContentRaw: matchStr,
        suggestedFix: suggestedFix,
        metadata: {
          issueId: `cell-${cellIndex}-${issueId}-o${start}-${end}`,
          offsetStart: start,
          offsetEnd: end,
        },
      });
    }
  }
  return notebookIssues;
}
