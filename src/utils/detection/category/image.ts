import { PageConfig } from '@jupyterlab/coreutils';
import Tesseract from 'tesseract.js';
import { ICellIssue } from '../../types';

async function getTextInImage(
  imagePath: string,
  currentDirectoryPath: string
): Promise<{ text: string; confidence: number }> {
  const worker = await Tesseract.createWorker('eng');
  try {
    const pathForTesseract = imagePath.startsWith('http')
      ? imagePath
      : `${PageConfig.getBaseUrl()}files/${currentDirectoryPath}/${imagePath}`;

    const {
      data: { text, confidence }
    } = await worker.recognize(pathForTesseract);

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
  notebookPath: string
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // Check for images without alt text in markdown syntax
  const mdSyntaxMissingAltRegex = /!\[\]\([^)]+\)/g;

  // Check for images without alt tag or empty alt tag in HTML syntax
  const htmlSyntaxMissingAltRegex = /<img[^>]*alt=["']\s*["'][^>]*>/g;
  const htmlSyntaxNoAltRegex = /<img(?!.*alt=)[^>]*>/g;
  let match;
  while (
    (match = mdSyntaxMissingAltRegex.exec(rawMarkdown)) !== null ||
    (match = htmlSyntaxMissingAltRegex.exec(rawMarkdown)) !== null ||
    (match = htmlSyntaxNoAltRegex.exec(rawMarkdown)) !== null
  ) {
    const imageUrl =
      match[0].match(/\(([^)]+)\)/)?.[1] ||
      match[0].match(/src=["']([^"']+)["']/)?.[1];
    if (imageUrl) {
      let suggestedFix: string = '';
      try {
        const ocrResult = await getTextInImage(imageUrl, notebookPath);
        if (ocrResult.confidence > 40) {
          suggestedFix = ocrResult.text;
        }
        console.log(ocrResult);
      } catch (error) {
        console.error(`Failed to process image ${imageUrl}:`, error);
      } finally {
        const issueId = 'image-missing-alt';
        notebookIssues.push({
          cellIndex,
          cellType: cellType as 'code' | 'markdown',
          violationId: issueId,
          issueContentRaw: match[0],
          suggestedFix: suggestedFix
        });
      }
    }
  }
  return notebookIssues;
}
