import { NotebookPanel } from '@jupyterlab/notebook';
import { PageConfig } from '@jupyterlab/coreutils';
import axe from 'axe-core';
import { marked } from 'marked';
import Tesseract, { PSM } from 'tesseract.js';
import { Cell } from '@jupyterlab/cells';
import { ICellModel } from '@jupyterlab/cells';

import { ICellIssue } from './types';

export async function analyzeCellsAccessibility(
  panel: NotebookPanel
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];
  const cells = panel.content.widgets;

  // Add heading one check
  notebookIssues.push(...await detectHeadingOneIssue('', 0, 'markdown', cells));

  const tempDiv = document.createElement('div');
  document.body.appendChild(tempDiv);

  const axeConfig: axe.RunOptions = {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
  };

  try {
    // First, analyze heading hierarchy across the notebook
    const headingIssues = await analyzeHeadingHierarchy(panel);
    notebookIssues.push(...headingIssues);

    // Then analyze individual cells for other issues
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell || !cell.model) {
        console.warn(`Skipping cell ${i}: Invalid cell or model`);
        continue;
      }

      const cellType = cell.model.type;
      if (cellType === 'markdown') {
        const rawMarkdown = cell.model.sharedModel.getSource();
        if (rawMarkdown.trim()) {
          tempDiv.innerHTML = await marked.parse(rawMarkdown);

          // SUGGESTION: What if we limit axe to detect only the rules we want?
          const results = await axe.run(tempDiv, axeConfig);
          const violations = results.violations;

          // Can have multiple violations in a single cell
          if (violations.length > 0) {
            violations.forEach(violation => {
              violation.nodes.forEach(node => {
                // Customize description for various issues
                if (violation.id === 'empty-heading') {
                  violation.description = 'Ensure headings have discernible text. Headings provide essential structure for screen reader users to navigate a page. When a heading is empty, it creates confusion and disrupts this experience, so it is crucial to ensure all headings contain descriptive, accurate text.'
                }
                notebookIssues.push({
                  cellIndex: i,
                  cellType: cellType,
                  violation: {
                    id: violation.id,
                    description: violation.description,
                    descriptionUrl: violation.helpUrl
                  },
                  issueContentRaw: node.html
                });
              });
            });
          }

          // Add custom image issue detection
          const folderPath = panel.context.path.substring(
            0,
            panel.context.path.lastIndexOf('/')
          );
          notebookIssues.push(
            ...(await detectImageIssuesInCell(
              rawMarkdown,
              i,
              cellType,
              folderPath
            ))
          );
          notebookIssues.push(
            ...detectTableIssuesInCell(rawMarkdown, i, cellType)
          );
          notebookIssues.push(
            ...(await detectColorIssuesInCell(
              rawMarkdown,
              i,
              cellType,
              folderPath
            ))
          );
        }
      } else if (cellType === 'code') {
        const codeInput = cell.node.querySelector('.jp-InputArea-editor');
        const codeOutput = cell.node.querySelector('.jp-OutputArea');
        if (codeInput || codeOutput) {
          // We would have to feed this into a language model to get the suggested fix.
        }
      }
    }
  } finally {
    tempDiv.remove();
  }

  return notebookIssues;
}

// Image
export async function getTextInImage(
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

    if (confidence > 40) {
      // verifyTextBlocks(pathForTesseract);
      const result = await getColorContrastInImage(
        imagePath,
        currentDirectoryPath
      );
      console.log('From getTextInImage: ', result);
    }
    if (!text) {
      throw new Error('No text found in the image');
    }
    return { text, confidence };
  } finally {
    await worker.terminate();
  }
}

async function detectImageIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  notebookPath: string
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // Check for images without alt text in markdown syntax
  const mdSyntaxMissingAltRegex = /!\[\]\([^)]+\)/g;

  // Check for images without alt tag or empty alt tag in HTML syntax
  const htmlSyntaxMissingAltRegex = /<img[^>]*alt=""[^>]*>/g;
  let match;
  while (
    (match = mdSyntaxMissingAltRegex.exec(rawMarkdown)) !== null ||
    (match = htmlSyntaxMissingAltRegex.exec(rawMarkdown)) !== null
  ) {
    const imageUrl =
      match[0].match(/\(([^)]+)\)/)?.[1] ||
      match[0].match(/src="([^"]+)"/)?.[1];
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
    notebookIssues.push({
      cellIndex,
      cellType: cellType as 'code' | 'markdown',
      violation: {
        id: 'image-alt',
            description: 'Images must have alternative text',
            descriptionUrl:
              'https://dequeuniversity.com/rules/axe/4.7/image-alt'
      },
          issueContentRaw: match[0],
          suggestedFix: suggestedFix
    });
      }
    }
  }
  return notebookIssues;
}

// Table
function detectTableIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string
): ICellIssue[] {
  const notebookIssues: ICellIssue[] = [];

  // Check for tables without th tags
  const tableWithoutThRegex =
    /<table[^>]*>(?![\s\S]*?<th[^>]*>)[\s\S]*?<\/table>/gi;
  let match;
  while ((match = tableWithoutThRegex.exec(rawMarkdown)) !== null) {
    notebookIssues.push({
      cellIndex,
      cellType: cellType as 'code' | 'markdown',
      violation: {
        id: 'td-has-header',
        description: 'Tables must have header information',
        descriptionUrl:
          'https://dequeuniversity.com/rules/axe/4.10/td-has-header?application=RuleDescription'
      },
      issueContentRaw: match[0]
    });
  }

  // Check for tables without caption tags
  const tableWithoutCaptionRegex =
    /<table[^>]*>(?![\s\S]*?<caption[^>]*>)[\s\S]*?<\/table>/gi;
  while ((match = tableWithoutCaptionRegex.exec(rawMarkdown)) !== null) {
    notebookIssues.push({
      cellIndex,
      cellType: cellType as 'code' | 'markdown',
      violation: {
        id: 'table-has-caption',
        description: 'Tables must have caption information',
        descriptionUrl: ''
      },
      issueContentRaw: match[0]
    });
  }
  return notebookIssues;
}

// Heading
async function detectHeadingOneIssue(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  cells: readonly Cell<ICellModel>[]
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];
  const tempDiv = document.createElement('div');
  
  // Find the first heading in the notebook
  let firstHeadingFound = false;
  let firstHeadingContent = '';

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.model.type !== 'markdown') continue;

    const content = cell.model.sharedModel.getSource();
    if (!content.trim()) continue;

    // Parse markdown to HTML
    tempDiv.innerHTML = await marked.parse(content);
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length > 0) {
      firstHeadingFound = true;
      firstHeadingContent = headings[0].outerHTML;
      
      // Check if first heading is not h1
      const level = parseInt(headings[0].tagName[1]);
      if (level !== 1) {
        notebookIssues.push({
          cellIndex: i,
          cellType: 'markdown',
          violation: {
            id: 'page-has-heading-one',
            description: 'Ensure that the page or at least one of its frames contains a level-one heading. A missing level-one heading can leave screen reader users without a clear starting point, making it harder to understand the main purpose or content of the page. Please also ensure that headings contain descriptive, accurate text',
            descriptionUrl: 'https://dequeuniversity.com/rules/axe/4.7/page-has-heading-one'
          },
          issueContentRaw: firstHeadingContent
        });
      }
      break;
    }
  }

  // If no headings found at all, suggest adding h1 at the top
  if (!firstHeadingFound) {
    notebookIssues.push({
      cellIndex: 0,
      cellType: 'markdown',
      violation: {
        id: 'page-has-heading-one',
        description: 'Ensure that the page or at least one of its frames contains a level-one heading. A missing level-one heading can leave screen reader users without a clear starting point, making it harder to understand the main purpose or content of the page. Please also ensure that headings contain descriptive, accurate text',
        descriptionUrl: 'https://dequeuniversity.com/rules/axe/4.7/page-has-heading-one'
      },
      issueContentRaw: ''
    });
  }

  tempDiv.remove();
  return notebookIssues;
}

export async function analyzeHeadingHierarchy(panel: NotebookPanel): Promise<ICellIssue[]> {
  //console.log('startingheading hierarchy analysis');
  const notebookIssues: ICellIssue[] = [];
  const cells = panel.content.widgets;
  const tempDiv = document.createElement('div');
  document.body.appendChild(tempDiv);

  try {
    // Create a complete heading structure that maps cell index to heading level and content
    // Use array to retain order of headings
    const headingStructure: Array<{
      cellIndex: number;
      level: number;
      content: string;
      html: string;
    }> = [];

    // First pass: collect all headings
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell || !cell.model || cell.model.type !== 'markdown') {
        continue;
      }

      const content = cell.model.sharedModel.getSource();
      if (!content.trim()) continue;

      // Parse markdown to HTML
      tempDiv.innerHTML = await marked.parse(content);
      
      // Find all headings in the cell
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
      //console.log(`Cell ${i}: Found ${headings.length} headings`);
      
      headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        const text = heading.textContent || '';
        //console.log(`  Level ${level} heading: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
        
        headingStructure.push({
          cellIndex: i,
          level,
          content: text,
          html: heading.outerHTML
        });
      });
    }

    //console.log(`Total headings found: ${headingStructure.length}`);
    //console.log('Analyzing heading structure...');

    // Track headings by level to detect duplicates
    const headingsByLevel = new Map<number, Map<string, number[]>>();
    
    // First pass: collect all headings by level and content
    headingStructure.forEach((heading, index) => {
      if (!headingsByLevel.has(heading.level)) {
        headingsByLevel.set(heading.level, new Map());
      }

      // Level map is a map of the content of the heading and the indices of the headings that have that content
      const levelMap = headingsByLevel.get(heading.level)!;
      const normalizedContent = heading.content.trim().toLowerCase();
      if (!levelMap.has(normalizedContent)) {
        levelMap.set(normalizedContent, []);
      }
      levelMap.get(normalizedContent)!.push(index);
    });

    // Check for multiple h1 headings
    const h1Headings = headingStructure.filter(h => h.level === 1);
    if (h1Headings.length > 1) {
      // Flag all h1 headings after the first one
      h1Headings.slice(1).forEach(heading => {
        //console.log(`Found additional h1 heading at cell ${heading.cellIndex}`);
        notebookIssues.push({
          cellIndex: heading.cellIndex,
          cellType: 'markdown',
          violation: {
            id: 'duplicate-heading-one',
            description: 'Ensure there is only one level-one heading (h1) in the notebook. The h1 heading should be at the top of the document and serve as the main title. Additional h1 headings can confuse screen reader users about the document structure. Please also ensure that headings contain descriptive, accurate text',
            descriptionUrl: ''
          },
          issueContentRaw: heading.html
        });
      });
    }

    // Second pass: analyze heading structure and check for duplicates
    for (let i = 0; i < headingStructure.length; i++) {
      const current = headingStructure[i];
      const previous = i > 0 ? headingStructure[i - 1] : null;

      // Skip h1 headings as they're handled separately
      if (current.level === 1) {
        continue;
      }

      // Check for empty headings
      if (!current.content.trim()) {
        //console.log(`Found empty heading at cell ${current.cellIndex}`);
        notebookIssues.push({
          cellIndex: current.cellIndex,
          cellType: 'markdown',
          violation: {
            id: 'empty-heading',
            description: 'Ensure headings have discernible text. Headings provide essential structure for screen reader users to navigate a page. When a heading is empty, it creates confusion and disrupts this experience, so it is crucial to ensure all headings contain descriptive, accurate text.',
            descriptionUrl: ''
          },
          issueContentRaw: current.html
        });
        continue;
      }

      // Check for duplicate headings at the same level
      const levelMap = headingsByLevel.get(current.level)!;
      const normalizedContent = current.content.trim().toLowerCase();
      const duplicateIndices = levelMap.get(normalizedContent)!;
      
      if (duplicateIndices.length > 1) {
        // Only report the first occurrence of each duplicate
        if (duplicateIndices[0] === i) {
          //console.log(`Found duplicate heading "${current.content}" at level ${current.level}`);
          notebookIssues.push({
            cellIndex: current.cellIndex,
            cellType: 'markdown',
            violation: {
              id: 'duplicate-heading',
              description: 'Ensure identical headings are not used at the same level. This can be confusing for screen reader users as it creates redundant landmarks in the document structure. Please consider combining the sections or using different heading text',
              descriptionUrl: ''
            },
            issueContentRaw: current.html,
            metadata: {
              previousHeadingLevel: previous?.level
            }
          });
        }
      }

      // Skip first heading (no previous to compare with)
      if (!previous) continue;

      // Check for invalid heading level skips
      // Only flag violations when skipping to lower levels (e.g., h2 to h4)
      // Allow skips when returning to higher levels (e.g., h4 to h2)
      const levelDiff = current.level - previous.level;
      if (levelDiff > 1) {  // Only check when going to lower levels
        //console.log(`Found heading level skip from h${previous.level} to h${current.level} at cell ${current.cellIndex}`);
        notebookIssues.push({
          cellIndex: current.cellIndex,
          cellType: 'markdown',
          violation: {
            id: 'heading-order',
            description: 'Ensure the order of headings is semantically correct. Headings provide essential structure for screen reader users to navigate a page. Skipping levels or using headings out of order can make the content feel disorganized or inaccessible. Please also ensure headings contain descriptive, accurate text',
            descriptionUrl: ''
          },
          issueContentRaw: current.html,
          metadata: {
            previousHeadingLevel: previous.level
          }
        });
      }
    }

    //console.log('Heading hierarchy analysis complete. Found issues:', notebookIssues.length);

  } catch (error) {
    console.error('Error in heading hierarchy analysis:', error);
  } finally {
    tempDiv.remove();
  }

  return notebookIssues;
}

// Color
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

async function getColorContrastInImage(
  imagePath: string,
  currentDirectoryPath: string
): Promise<{ contrast: number; isAccessible: boolean; hasLargeText: boolean }> {
  // Create canvas and load image
  const img = new Image();
  img.crossOrigin = 'anonymous';

  // Determine the path for the image
  const pathForTesseract = imagePath.startsWith('http')
    ? imagePath
    : `${PageConfig.getBaseUrl()}files/${currentDirectoryPath}/${imagePath}`;

  console.log('Using path for contrast analysis:', pathForTesseract);

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

    img.src = pathForTesseract;
  });
}

async function detectColorIssuesInCell(
  rawMarkdown: string,
  cellIndex: number,
  cellType: string,
  notebookPath: string
): Promise<ICellIssue[]> {
  const notebookIssues: ICellIssue[] = [];

  // Check for images without alt text in markdown syntax
  const mdSyntaxMissingAltRegex = /!\[\]\([^)]+\)/g;

  // Check for images without alt tag or empty alt tag in HTML syntax
  const htmlSyntaxMissingAltRegex = /<img[^>]*alt=""[^>]*>/g;
  let match;
  while (
    (match = mdSyntaxMissingAltRegex.exec(rawMarkdown)) !== null ||
    (match = htmlSyntaxMissingAltRegex.exec(rawMarkdown)) !== null
  ) {
    const imageUrl =
      match[0].match(/\(([^)]+)\)/)?.[1] ||
      match[0].match(/src="([^"]+)"/)?.[1];
    if (imageUrl) {
      const suggestedFix: string = '';
      try {
        const { contrast, isAccessible, hasLargeText } =
          await getColorContrastInImage(imageUrl, notebookPath);
        if (!isAccessible) {
          if (hasLargeText) {
            notebookIssues.push({
              cellIndex,
              cellType: cellType as 'code' | 'markdown',
              violation: {
                id: 'detect-cc-large',
                description: `Large text in images have a contrast ratio of 3:1 and text contrast in general. Currently, the contrast ratio is ${contrast.toFixed(2)}:1.`,
                descriptionUrl: ''
              },
              issueContentRaw: match[0],
              suggestedFix: suggestedFix
            });
          } else {
            notebookIssues.push({
              cellIndex,
              cellType: cellType as 'code' | 'markdown',
              violation: {
                id: 'detect-cc-normal',
                description: `Normal text in images have a contrast ratio of 4.5:1 and text contrast in general. Currently, the contrast ratio is ${contrast.toFixed(2)}:1.`,
                descriptionUrl: ''
              },
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

// TODO: Links

// TODO: Other
