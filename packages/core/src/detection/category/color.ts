import Tesseract, { PSM } from "tesseract.js";
import { IGeneralCell, ICellIssue, IImageProcessor } from "../../types.js";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function calculateLuminance(rgb: { r: number; g: number; b: number }): number {
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function calculateContrast(
  foregroundHex: string,
  backgroundHex: string,
): number {
  const rgb1 = hexToRgb(foregroundHex);
  const rgb2 = hexToRgb(backgroundHex);
  const L1 = calculateLuminance(rgb1);
  const L2 = calculateLuminance(rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function getColorContrastInImage(
  imagePath: string,
  currentDirectoryPath: string,
  baseUrl: string,
  imageProcessor: IImageProcessor,
  attachments?: IGeneralCell["attachments"],
): Promise<{ contrast: number; isAccessible: boolean; hasLargeText: boolean }> {
  // Determine the source for the image
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
    // Regular image path (local or remote)
    imageSource = imagePath.startsWith("http")
      ? imagePath
      : `${baseUrl}files/${currentDirectoryPath}/${imagePath}`;
  }

  // Create canvas and load image
  const img = await imageProcessor.loadImage(imageSource);

  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const canvas = imageProcessor.createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          // Create Tesseract worker
          const worker = await Tesseract.createWorker();

          // Set PSM mode to SPARSE_TEXT (11)
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          });

          // Recognize text blocks with PSM 11
          const result = await worker.recognize(canvas, {}, { blocks: true });
          if (result.data.confidence < 40) {
            // We can't analyze the image, so we return the default values
            resolve({
              contrast: 21,
              isAccessible: true,
              hasLargeText: false,
            });
            return;
          }

          let minContrast = 21; // Default to maximum contrast
          let hasLargeText = false;

          // Process each text block
          if (result.data.blocks && result.data.blocks.length > 0) {
            result.data.blocks.forEach((block) => {
              const { x0, y0, x1, y1 } = block.bbox;
              const textHeight = y1 - y0;

              // Check if text is large (>= 24px height)
              if (textHeight >= 24) {
                hasLargeText = true;
              }

              // Get colors from the block area
              const colorCount: { [key: string]: number } = {};
              const data = imageData.data;
              const width = imageData.width;

              // Sample colors from the block area
              for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                  const index = (y * width + x) * 4;
                  const r = data[index];
                  const g = data[index + 1];
                  const b = data[index + 2];

                  // Skip transparent pixels
                  if (data[index + 3] < 128) {
                    continue;
                  }

                  // Quantize colors to reduce unique values
                  const scale = 30;
                  const colorKey =
                    "#" +
                    (
                      (1 << 24) +
                      ((Math.floor(r / scale) * scale) << 16) +
                      ((Math.floor(g / scale) * scale) << 8) +
                      Math.floor(b / scale) * scale
                    )
                      .toString(16)
                      .slice(1)
                      .toUpperCase();

                  colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;
                }
              }

              // Get the two most common colors
              const sortedColors = Object.entries(colorCount).sort(
                (a, b) => b[1] - a[1],
              );
              if (sortedColors.length >= 2) {
                const bgColor = sortedColors[0][0];
                const fgColor = sortedColors[1][0];

                // Calculate contrast ratio
                const contrast = calculateContrast(fgColor, bgColor);

                // Update minimum contrast
                if (contrast < minContrast) {
                  minContrast = contrast;
                }
              }
            });
          }

          // Determine if the contrast meets WCAG standards (4.5:1 for normal text)
          const isAccessible = hasLargeText
            ? minContrast >= 3
            : minContrast >= 4.5;

          // Terminate the worker
          await worker.terminate();

          resolve({
            contrast: minContrast,
            isAccessible,
            hasLargeText,
          });
        } catch (error) {
          console.error("Error analyzing image with Tesseract:", error);
          // Fallback to analyzing the entire image
          const colorCount: { [key: string]: number } = {};
          const data = imageData.data;
          const width = imageData.width;
          const height = imageData.height;

          // Sample colors from the image (every 10th pixel to improve performance)
          for (let y = 0; y < height; y += 10) {
            for (let x = 0; x < width; x += 10) {
              const index = (y * width + x) * 4;
              const r = data[index];
              const g = data[index + 1];
              const b = data[index + 2];

              // Skip transparent pixels
              if (data[index + 3] < 128) {
                continue;
              }

              // Quantize colors to reduce unique values
              const scale = 30;
              const colorKey =
                "#" +
                (
                  (1 << 24) +
                  ((Math.floor(r / scale) * scale) << 16) +
                  ((Math.floor(g / scale) * scale) << 8) +
                  Math.floor(b / scale) * scale
                )
                  .toString(16)
                  .slice(1)
                  .toUpperCase();

              colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;
            }
          }

          // Get the two most common colors
          const sortedColors = Object.entries(colorCount).sort(
            (a, b) => b[1] - a[1],
          );
          let contrast = 21; // Default to maximum contrast

          if (sortedColors.length >= 2) {
            const bgColor = sortedColors[0][0];
            const fgColor = sortedColors[1][0];

            // Calculate contrast ratio
            contrast = calculateContrast(fgColor, bgColor);
          }

          // Determine if the contrast meets WCAG standards (4.5:1 for normal text)
          const isAccessible = contrast >= 4.5;

          resolve({
            contrast,
            isAccessible,
            hasLargeText: false, // Default to false in fallback case
          });
        }
      } catch (error) {
        console.error("Error processing image data:", error);
        reject(error);
      }
    })().catch(reject);
  });
}

/**
 * Find all markdown images using indexOf scanning (no ReDoS).
 * Matches ![...](...) patterns.
 */
function findMarkdownImages(
  text: string,
): Array<{ match: string; start: number; end: number }> {
  const results: Array<{ match: string; start: number; end: number }> = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const bangIdx = text.indexOf("![", searchFrom);
    if (bangIdx === -1) {
      break;
    }
    const bracketClose = text.indexOf("](", bangIdx + 2);
    if (bracketClose === -1) {
      searchFrom = bangIdx + 1;
      continue;
    }
    const parenClose = text.indexOf(")", bracketClose + 2);
    if (parenClose === -1) {
      searchFrom = bracketClose + 1;
      continue;
    }
    const end = parenClose + 1;
    results.push({ match: text.slice(bangIdx, end), start: bangIdx, end });
    searchFrom = end;
  }
  return results;
}

/**
 * Find all <img> tags using indexOf scanning (no ReDoS).
 */
function findHtmlImages(
  html: string,
): Array<{ match: string; start: number; end: number }> {
  const results: Array<{ match: string; start: number; end: number }> = [];
  const lower = html.toLowerCase();
  let searchFrom = 0;
  while (searchFrom < lower.length) {
    const idx = lower.indexOf("<img", searchFrom);
    if (idx === -1) {
      break;
    }
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
    let end = closeIdx + 1;
    // Also consume optional </img> closing tag
    const afterTag = lower.slice(end, end + 6);
    if (afterTag === "</img>") {
      end += 6;
    }
    results.push({ match: html.slice(idx, end), start: idx, end });
    searchFrom = end;
  }
  return results;
}

/**
 * Extract image URL from a matched image string using indexOf (no regex).
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

export async function detectColorIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  notebookPath: string,
  baseUrl: string,
  imageProcessor: IImageProcessor,
  attachments?: IGeneralCell["attachments"],
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // Find all images using indexOf-based scanning (no ReDoS)
  const allImages: Array<{ match: string; start: number; end: number }> = [
    ...findMarkdownImages(rawMarkdown),
    ...findHtmlImages(rawMarkdown),
  ];

  for (const {
    match: imageMatch,
    start: matchStart,
    end: matchEnd,
  } of allImages) {
    const imageUrl = extractImageUrl(imageMatch);

    if (imageUrl) {
      const suggestedFix: string = "";
      try {
        // getColorContrastInImage will handle both regular images and attachments
        const { contrast, isAccessible, hasLargeText } =
          await getColorContrastInImage(
            imageUrl,
            notebookPath,
            baseUrl,
            imageProcessor,
            attachments,
          );
        if (!isAccessible) {
          if (hasLargeText) {
            notebookIssues.push({
              cellIndex,
              cellType: cellType as "code" | "markdown",
              violationId: "color-insufficient-cc-large",
              customDescription: `Ensure that a text in an image has sufficient color contrast. The text contrast ratio is ${contrast.toFixed(2)}:1, which is below the required ${hasLargeText ? "3:1" : "4.5:1"} ratio for ${hasLargeText ? "large" : "normal"} text.`,
              issueContentRaw: imageMatch,
              metadata: {
                offsetStart: matchStart,
                offsetEnd: matchEnd,
              },
              suggestedFix: suggestedFix,
            });
          } else {
            notebookIssues.push({
              cellIndex,
              cellType: cellType as "code" | "markdown",
              violationId: "color-insufficient-cc-normal",
              customDescription: `Ensure that a large text in an image has sufficient color contrast. The text contrast ratio is ${contrast.toFixed(2)}:1, which is below the required ${hasLargeText ? "3:1" : "4.5:1"} ratio for ${hasLargeText ? "large" : "normal"} text.`,
              issueContentRaw: imageMatch,
              metadata: {
                offsetStart: matchStart,
                offsetEnd: matchEnd,
              },
              suggestedFix: suggestedFix,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to process image ${imageUrl}:`, error);
      }
    }
  }
  return notebookIssues;
}
