import { NotebookPanel } from '@jupyterlab/notebook';
import { PageConfig } from '@jupyterlab/coreutils';
import Tesseract, { PSM } from 'tesseract.js';
import { ICellIssue } from '../../types';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function calculateLuminance(rgb: { r: number; g: number; b: number }): number {
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function calculateContrast(
  foregroundHex: string,
  backgroundHex: string
): number {
  const rgb1 = hexToRgb(foregroundHex);
  const rgb2 = hexToRgb(backgroundHex);
  const L1 = calculateLuminance(rgb1);
  const L2 = calculateLuminance(rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extract image data from a JupyterLab attachment
 * @param attachmentId The ID of the attachment (e.g., 'c6533816-e12f-47fb-8896-af4065f8a12f.png')
 * @param panel The notebook panel containing the attachment
 * @param cellIndex The index of the cell containing the attachment
 * @returns Data URL for the image or null if not found
 */
async function getAttachmentDataUrl(
  attachmentId: string,
  panel: NotebookPanel,
  cellIndex: number
): Promise<string | null> {
  try {
    // Extract filename from attachment ID
    console.log('Looking for attachment:', attachmentId, 'in cell:', cellIndex);

    if (!panel.model) {
      console.warn('No notebook model available');
      return null;
    }

    const cell = panel.content.widgets[cellIndex];

    if (!cell || !cell.model) {
      console.warn(`Cell at index ${cellIndex} is not available`);
      return null;
    }

    try {
      // Access the cell data directly
      const cellData = cell.model.toJSON() as any;
      if (
        cellData &&
        cellData.attachments &&
        cellData.attachments[attachmentId]
      ) {
        console.log('Found attachment in cell widget');
        const data = cellData.attachments[attachmentId];

        // Get the base64 data
        if (data && typeof data === 'object') {
          for (const mimetype in data) {
            if (mimetype.startsWith('image/')) {
              const base64 = data[mimetype];
              if (typeof base64 === 'string') {
                return `data:${mimetype};base64,${base64}`;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error accessing cell widget data:', e);
    }
    return null;
  } catch (error) {
    console.error('Error extracting attachment:', error);
    return null;
  }
}

async function getColorContrastInImage(
  imagePath: string,
  currentDirectoryPath: string,
  panel?: NotebookPanel,
  cellIndex?: number
): Promise<{ contrast: number; isAccessible: boolean; hasLargeText: boolean }> {
  // Determine the source for the image
  let imageSource: string;

  // Check if this is a JupyterLab attachment
  if (imagePath.startsWith('attachment:')) {
    if (!panel || cellIndex === undefined) {
      throw new Error(
        'NotebookPanel and cellIndex required for attachment images'
      );
    }
    const attachmentId = imagePath.substring('attachment:'.length);
    const dataUrl = await getAttachmentDataUrl(attachmentId, panel, cellIndex);

    if (!dataUrl) {
      throw new Error(`Could not load attachment: ${attachmentId}`);
    }
    imageSource = dataUrl;
  } else {
    // Regular image path (local or remote)
    imageSource = imagePath.startsWith('http')
      ? imagePath
      : `${PageConfig.getBaseUrl()}files/${currentDirectoryPath}/${imagePath}`;
  }

  // Create canvas and load image
  const img = new Image();
  img.crossOrigin = 'Anonymous';

  img.src = imageSource;

  return new Promise((resolve, reject) => {
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
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
          tessedit_pageseg_mode: PSM.SPARSE_TEXT
        });

        // Recognize text blocks with PSM 11
        const result = await worker.recognize(canvas, {}, { blocks: true });
        console.log('result', result);
        if (result.data.confidence < 40) {
          // We can't analyze the image, so we return the default values
          resolve({
            contrast: 21,
            isAccessible: true,
            hasLargeText: false
          });
          return;
        }

        let minContrast = 21; // Default to maximum contrast
        let hasLargeText = false;

        // Process each text block
        if (result.data.blocks && result.data.blocks.length > 0) {
          result.data.blocks.forEach(block => {
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
                  '#' +
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
              (a, b) => b[1] - a[1]
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

        console.log('Contrast:', minContrast);

        resolve({
          contrast: minContrast,
          isAccessible,
          hasLargeText
        });
      } catch (error) {
        console.error('Error analyzing image with Tesseract:', error);
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
              '#' +
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
          (a, b) => b[1] - a[1]
        );
        let contrast = 21; // Default to maximum contrast

        if (sortedColors.length >= 2) {
          const bgColor = sortedColors[0][0];
          const fgColor = sortedColors[1][0];

          // Calculate contrast ratio
          contrast = calculateContrast(fgColor, bgColor);
          console.log(
            `Image contrast: ${contrast.toFixed(2)}:1 (${fgColor} vs ${bgColor})`
          );
        }

        // Determine if the contrast meets WCAG standards (4.5:1 for normal text)
        const isAccessible = contrast >= 4.5;

        resolve({
          contrast,
          isAccessible,
          hasLargeText: false // Default to false in fallback case
        });
      }
    };

    img.onerror = e => {
      console.error('Image load error:', e);
      reject(new Error('Failed to load image'));
    };
  });
}

export async function detectColorIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  notebookPath: string,
  panel?: NotebookPanel
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // Check for all images in markdown syntax (this will also catch attachment syntax)
  const mdSyntaxImageRegex = /!\[[^\]]*\]\([^)]+\)/g;

  // Check for all images in HTML syntax
  const htmlSyntaxImageRegex = /<img[^>]*>(?:<\/img>)?/g;

  let match;
  while (
    (match = mdSyntaxImageRegex.exec(rawMarkdown)) !== null ||
    (match = htmlSyntaxImageRegex.exec(rawMarkdown)) !== null
  ) {
    const imageUrl =
      match[0].match(/\(([^)]+)\)/)?.[1] ||
      match[0].match(/src="([^"]+)"/)?.[1];

    if (imageUrl) {
      const suggestedFix: string = '';
      try {
        // getColorContrastInImage will handle both regular images and attachments
        const { contrast, isAccessible, hasLargeText } =
          await getColorContrastInImage(
            imageUrl,
            notebookPath,
            panel,
            cellIndex
          );
        if (!isAccessible) {
          if (hasLargeText) {
            notebookIssues.push({
              cellIndex,
              cellType: cellType as 'code' | 'markdown',
              violationId: 'color-insufficient-cc-normal',
              customDescription: `Ensure that a text in an image has sufficient color contrast. The text contrast ratio is ${contrast.toFixed(2)}:1, which is below the required ${hasLargeText ? '3:1' : '4.5:1'} ratio for ${hasLargeText ? 'large' : 'normal'} text.`,
              issueContentRaw: match[0],
              suggestedFix: suggestedFix
            });
          } else {
            notebookIssues.push({
              cellIndex,
              cellType: cellType as 'code' | 'markdown',
              violationId: 'color-insufficient-cc-large',
              customDescription: `Ensure that a large text in an image has sufficient color contrast. The text contrast ratio is ${contrast.toFixed(2)}:1, which is below the required ${hasLargeText ? '3:1' : '4.5:1'} ratio for ${hasLargeText ? 'large' : 'normal'} text.`,
              issueContentRaw: match[0],
              suggestedFix: suggestedFix
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
