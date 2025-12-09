import Tesseract from 'tesseract.js';
import { ICellIssue, IImageProcessor, IGeneralCell } from '../../types.js';

async function getTextInImage(
  imagePath: string,
  currentDirectoryPath: string,
  baseUrl: string,
  imageProcessor: IImageProcessor,
  attachments?: IGeneralCell['attachments']
): Promise<{ text: string; confidence: number }> {
  const worker = await Tesseract.createWorker('eng');
  try {
    let imageSource: string;

    // Check if this is a JupyterLab attachment
    if (imagePath.startsWith('attachment:')) {
      if (!attachments) {
        throw new Error('Attachments required for attachment images');
      }
      const attachmentId = imagePath.substring('attachment:'.length);
      const data = attachments[attachmentId];
      let dataUrl: string | null = null;

      if (data) {
        for (const mimetype in data) {
          if (mimetype.startsWith('image/')) {
            const base64 = data[mimetype];
            if (typeof base64 === 'string') {
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
      imageSource = imagePath.startsWith('http')
        ? imagePath
        : baseUrl
          ? `${baseUrl}files/${currentDirectoryPath}/${imagePath}`
          : `${currentDirectoryPath}/${imagePath}`; // Simple join for CLI
    }

    // Load image using the processor (handles Browser vs Node differences)
    const img = await imageProcessor.loadImage(imageSource);

    const {
      data: { text, confidence }
    } = await worker.recognize(img);

    if (!text) {
      throw new Error('No text found in the image');
    }
    return { text, confidence };
  } finally {
    await worker.terminate();
  }
}

export async function detectImageIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  notebookPath: string,
  baseUrl: string,
  imageProcessor: IImageProcessor,
  attachments?: IGeneralCell['attachments']
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // Check for images without alt text in markdown syntax
  const mdSyntaxMissingAltRegex = /!\[\]\([^)]+\)/g;

  // Check for images without alt tag or empty alt tag in HTML syntax
  const htmlSyntaxMissingAltRegex = /<img[^>]*alt=["']\s*["'][^>]*\/?>/g;
  const htmlSyntaxNoAltRegex = /<img(?![^>]*alt=)[^>]*\/?>/g;
  // Iterate a list of regexes; each scans independently over the cell content
  const regexes = [
    mdSyntaxMissingAltRegex,
    htmlSyntaxMissingAltRegex,
    htmlSyntaxNoAltRegex
  ];

  for (const regex of regexes) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(rawMarkdown)) !== null) {
      const imageUrl =
        match[0].match(/\(([^)]+)\)/)?.[1] ||
        match[0].match(/src=["']([^"']+)["']/)?.[1];
      if (!imageUrl) {
        continue;
      }

      const issueId = 'image-missing-alt';
      const start = match.index ?? 0;
      const end = start + match[0].length;

      let suggestedFix: string = '';
      try {
        // Only run OCR if baseUrl is provided (Extension mode)
        // In CLI mode (baseUrl is empty), we skip OCR to avoid Tesseract/Canvas issues
        if (baseUrl) {
          const ocrResult = await getTextInImage(
            imageUrl,
            notebookPath,
            baseUrl,
            imageProcessor,
            attachments
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
          cellType: cellType as 'code' | 'markdown',
          violationId: issueId,
          issueContentRaw: match[0],
          suggestedFix: suggestedFix,
          metadata: {
            issueId: `cell-${cellIndex}-${issueId}-o${start}-${end}`,
            offsetStart: start,
            offsetEnd: end
          }
        });
      }
    }
  }
  return notebookIssues;
}
