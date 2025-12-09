'use strict';
(self['webpackChunkjupyterlab_a11y_checker'] =
  self['webpackChunkjupyterlab_a11y_checker'] || []).push([
  ['core_dist_index_js'],
  {
    /***/ '../core/dist/detection/base.js':
      /*!**************************************!*\
  !*** ../core/dist/detection/base.js ***!
  \**************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ analyzeCellIssues: () =>
            /* binding */ analyzeCellIssues,
          /* harmony export */ analyzeCellsAccessibility: () =>
            /* binding */ analyzeCellsAccessibility,
          /* harmony export */ analyzeCellsAccessibilityCLI: () =>
            /* binding */ analyzeCellsAccessibilityCLI
          /* harmony export */
        });
        /* harmony import */ var axe_core__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! axe-core */ 'webpack/sharing/consume/default/axe-core/axe-core'
          );
        /* harmony import */ var axe_core__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            axe_core__WEBPACK_IMPORTED_MODULE_0__
          );
        /* harmony import */ var marked__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(
            /*! marked */ '../../node_modules/marked/lib/marked.esm.js'
          );
        /* harmony import */ var _category_heading_js__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            /*! ./category/heading.js */ '../core/dist/detection/category/heading.js'
          );
        /* harmony import */ var _category_index_js__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            /*! ./category/index.js */ '../core/dist/detection/category/index.js'
          );

        async function analyzeCellsAccessibility(
          cells,
          documentContext,
          baseUrl,
          imageProcessor,
          notebookPath = ''
        ) {
          const notebookIssues = [];
          // Add heading one check
          notebookIssues.push(
            ...(await (0,
            _category_heading_js__WEBPACK_IMPORTED_MODULE_2__.detectHeadingOneIssue)(
              '',
              0,
              'markdown',
              cells
            ))
          );
          const tempDiv = documentContext.createElement('div');
          documentContext.body.appendChild(tempDiv);
          const axeConfig = {
            runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
            rules: {
              'image-alt': { enabled: false },
              'empty-heading': { enabled: false },
              'heading-order': { enabled: false },
              'page-has-heading-one': { enabled: false },
              'link-name': { enabled: false }
            }
          };
          try {
            // First, analyze heading hierarchy across the notebook
            const headingIssues = await (0,
            _category_heading_js__WEBPACK_IMPORTED_MODULE_2__.analyzeHeadingHierarchy)(
              cells
            );
            notebookIssues.push(...headingIssues);
            // Then analyze individual cells for other issues
            for (let i = 0; i < cells.length; i++) {
              const cell = cells[i];
              if (!cell) {
                console.warn(`Skipping cell ${i}: Invalid cell or model`);
                continue;
              }
              const cellType = cell.type;
              if (cellType === 'markdown') {
                const rawMarkdown = cell.source;
                if (rawMarkdown.trim()) {
                  tempDiv.innerHTML =
                    await marked__WEBPACK_IMPORTED_MODULE_1__.marked.parse(
                      rawMarkdown
                    );
                  const results =
                    await axe_core__WEBPACK_IMPORTED_MODULE_0___default().run(
                      tempDiv,
                      axeConfig
                    );
                  const violations = results.violations;
                  // Can have multiple violations in a single cell
                  if (violations.length > 0) {
                    violations.forEach(violation => {
                      violation.nodes.forEach(node => {
                        notebookIssues.push({
                          cellIndex: i,
                          cellType: cellType,
                          violationId: violation.id,
                          issueContentRaw: node.html
                        });
                      });
                    });
                  }
                  // Image Issues
                  notebookIssues.push(
                    ...(await (0,
                    _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectImageIssuesInCell)(
                      rawMarkdown,
                      i,
                      cellType,
                      notebookPath,
                      baseUrl,
                      imageProcessor,
                      cell.attachments
                    ))
                  );
                  // Table Issues
                  notebookIssues.push(
                    ...(0,
                    _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectTableIssuesInCell)(
                      rawMarkdown,
                      i,
                      cellType
                    )
                  );
                  // Color Issues
                  notebookIssues.push(
                    ...(await (0,
                    _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectColorIssuesInCell)(
                      rawMarkdown,
                      i,
                      cellType,
                      notebookPath,
                      baseUrl,
                      imageProcessor,
                      cell.attachments
                    ))
                  );
                  // Link Issues
                  notebookIssues.push(
                    ...(0,
                    _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectLinkIssuesInCell)(
                      rawMarkdown,
                      i,
                      cellType
                    )
                  );
                }
              } else if (cellType === 'code') {
                // Code cell analysis not implemented yet
              }
            }
          } finally {
            tempDiv.remove();
          }
          return notebookIssues;
        }
        // Analyze a single cell (content-based categories only). Headings are excluded
        // because heading structure depends on the entire notebook.
        async function analyzeCellIssues(
          cell,
          documentContext,
          baseUrl,
          imageProcessor,
          notebookPath = ''
        ) {
          const issues = [];
          const cellType = cell.type;
          if (cellType !== 'markdown') {
            return issues;
          }
          const rawMarkdown = cell.source;
          if (!rawMarkdown.trim()) {
            return issues;
          }
          // Images
          issues.push(
            ...(await (0,
            _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectImageIssuesInCell)(
              rawMarkdown,
              cell.cellIndex,
              cellType,
              notebookPath,
              baseUrl,
              imageProcessor,
              cell.attachments
            ))
          );
          // Tables
          issues.push(
            ...(0,
            _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectTableIssuesInCell)(
              rawMarkdown,
              cell.cellIndex,
              cellType
            )
          );
          // Color
          issues.push(
            ...(await (0,
            _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectColorIssuesInCell)(
              rawMarkdown,
              cell.cellIndex,
              cellType,
              notebookPath,
              baseUrl,
              imageProcessor,
              cell.attachments
            ))
          );
          // Links
          issues.push(
            ...(0,
            _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectLinkIssuesInCell)(
              rawMarkdown,
              cell.cellIndex,
              cellType
            )
          );
          return issues;
        }
        /**
         * CLI-specific analysis function.
         * Excludes: axe-core (requires DOM)
         */
        async function analyzeCellsAccessibilityCLI(cells, imageProcessor) {
          const notebookIssues = [];
          // 1. Heading One Check
          notebookIssues.push(
            ...(await (0,
            _category_heading_js__WEBPACK_IMPORTED_MODULE_2__.detectHeadingOneIssue)(
              '',
              0,
              'markdown',
              cells
            ))
          );
          // 2. Heading Hierarchy
          const headingIssues = await (0,
          _category_heading_js__WEBPACK_IMPORTED_MODULE_2__.analyzeHeadingHierarchy)(
            cells
          );
          notebookIssues.push(...headingIssues);
          // 3. Per-cell checks
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (cell.type === 'markdown' && cell.source.trim()) {
              const rawMarkdown = cell.source;
              // Image Issues
              notebookIssues.push(
                ...(await (0,
                _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectImageIssuesInCell)(
                  rawMarkdown,
                  i,
                  cell.type,
                  '', // notebookPath
                  '', // baseUrl
                  imageProcessor,
                  cell.attachments
                ))
              );
              // Table Issues
              notebookIssues.push(
                ...(0,
                _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectTableIssuesInCell)(
                  rawMarkdown,
                  i,
                  cell.type
                )
              );
              // Color Issues
              /*
            notebookIssues.push(
              ...(await detectColorIssuesInCell(
                rawMarkdown,
                i,
                cell.type,
                '', // notebookPath
                '', // baseUrl
                imageProcessor,
                cell.attachments
              ))
            );
            */
              // Link Issues
              notebookIssues.push(
                ...(0,
                _category_index_js__WEBPACK_IMPORTED_MODULE_3__.detectLinkIssuesInCell)(
                  rawMarkdown,
                  i,
                  cell.type
                )
              );
            }
          }
          return notebookIssues;
        }

        /***/
      },

    /***/ '../core/dist/detection/category/color.js':
      /*!************************************************!*\
  !*** ../core/dist/detection/category/color.js ***!
  \************************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ detectColorIssuesInCell: () =>
            /* binding */ detectColorIssuesInCell
          /* harmony export */
        });
        /* harmony import */ var tesseract_js__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! tesseract.js */ '../../node_modules/tesseract.js/src/index.js'
          );
        /* harmony import */ var tesseract_js__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            tesseract_js__WEBPACK_IMPORTED_MODULE_0__
          );

        function hexToRgb(hex) {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return { r, g, b };
        }
        function calculateLuminance(rgb) {
          const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.04045
              ? v / 12.92
              : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }
        function calculateContrast(foregroundHex, backgroundHex) {
          const rgb1 = hexToRgb(foregroundHex);
          const rgb2 = hexToRgb(backgroundHex);
          const L1 = calculateLuminance(rgb1);
          const L2 = calculateLuminance(rgb2);
          const lighter = Math.max(L1, L2);
          const darker = Math.min(L1, L2);
          return (lighter + 0.05) / (darker + 0.05);
        }
        async function getColorContrastInImage(
          imagePath,
          currentDirectoryPath,
          baseUrl,
          imageProcessor,
          attachments
        ) {
          // Determine the source for the image
          let imageSource;
          // Check if this is a JupyterLab attachment
          if (imagePath.startsWith('attachment:')) {
            if (!attachments) {
              throw new Error('Attachments required for attachment images');
            }
            const attachmentId = imagePath.substring('attachment:'.length);
            const data = attachments[attachmentId];
            let dataUrl = null;
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
            // Regular image path (local or remote)
            imageSource = imagePath.startsWith('http')
              ? imagePath
              : `${baseUrl}files/${currentDirectoryPath}/${imagePath}`;
          }
          // Create canvas and load image
          const img = await imageProcessor.loadImage(imageSource);
          return new Promise((resolve, reject) => {
            (async () => {
              try {
                const canvas = imageProcessor.createCanvas(
                  img.width,
                  img.height
                );
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  reject(new Error('Could not get canvas context'));
                  return;
                }
                // Draw image
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                try {
                  // Create Tesseract worker
                  const worker =
                    await tesseract_js__WEBPACK_IMPORTED_MODULE_0___default().createWorker();
                  // Set PSM mode to SPARSE_TEXT (11)
                  await worker.setParameters({
                    tessedit_pageseg_mode:
                      tesseract_js__WEBPACK_IMPORTED_MODULE_0__.PSM.SPARSE_TEXT
                  });
                  // Recognize text blocks with PSM 11
                  const result = await worker.recognize(
                    canvas,
                    {},
                    { blocks: true }
                  );
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
                      const colorCount = {};
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
                          colorCount[colorKey] =
                            (colorCount[colorKey] || 0) + 1;
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
                  const colorCount = {};
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
                  }
                  // Determine if the contrast meets WCAG standards (4.5:1 for normal text)
                  const isAccessible = contrast >= 4.5;
                  resolve({
                    contrast,
                    isAccessible,
                    hasLargeText: false // Default to false in fallback case
                  });
                }
              } catch (error) {
                console.error('Error processing image data:', error);
                reject(error);
              }
            })().catch(reject);
          });
        }
        async function detectColorIssuesInCell(
          rawMarkdown,
          cellIndex,
          cellType,
          notebookPath,
          baseUrl,
          imageProcessor,
          attachments
        ) {
          var _a, _b, _c, _d, _e, _f;
          const notebookIssues = [];
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
              ((_a = match[0].match(/\(([^)]+)\)/)) === null || _a === void 0
                ? void 0
                : _a[1]) ||
              ((_b = match[0].match(/src="([^"]+)"/)) === null || _b === void 0
                ? void 0
                : _b[1]);
            if (imageUrl) {
              const suggestedFix = '';
              try {
                // getColorContrastInImage will handle both regular images and attachments
                const { contrast, isAccessible, hasLargeText } =
                  await getColorContrastInImage(
                    imageUrl,
                    notebookPath,
                    baseUrl,
                    imageProcessor,
                    attachments
                  );
                if (!isAccessible) {
                  if (hasLargeText) {
                    notebookIssues.push({
                      cellIndex,
                      cellType: cellType,
                      violationId: 'color-insufficient-cc-large',
                      customDescription: `Ensure that a text in an image has sufficient color contrast. The text contrast ratio is ${contrast.toFixed(2)}:1, which is below the required ${hasLargeText ? '3:1' : '4.5:1'} ratio for ${hasLargeText ? 'large' : 'normal'} text.`,
                      issueContentRaw: match[0],
                      metadata: {
                        offsetStart:
                          (_c = match.index) !== null && _c !== void 0 ? _c : 0,
                        offsetEnd:
                          ((_d = match.index) !== null && _d !== void 0
                            ? _d
                            : 0) + match[0].length
                      },
                      suggestedFix: suggestedFix
                    });
                  } else {
                    notebookIssues.push({
                      cellIndex,
                      cellType: cellType,
                      violationId: 'color-insufficient-cc-normal',
                      customDescription: `Ensure that a large text in an image has sufficient color contrast. The text contrast ratio is ${contrast.toFixed(2)}:1, which is below the required ${hasLargeText ? '3:1' : '4.5:1'} ratio for ${hasLargeText ? 'large' : 'normal'} text.`,
                      issueContentRaw: match[0],
                      metadata: {
                        offsetStart:
                          (_e = match.index) !== null && _e !== void 0 ? _e : 0,
                        offsetEnd:
                          ((_f = match.index) !== null && _f !== void 0
                            ? _f
                            : 0) + match[0].length
                      },
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

        /***/
      },

    /***/ '../core/dist/detection/category/heading.js':
      /*!**************************************************!*\
  !*** ../core/dist/detection/category/heading.js ***!
  \**************************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ analyzeHeadingHierarchy: () =>
            /* binding */ analyzeHeadingHierarchy,
          /* harmony export */ detectHeadingOneIssue: () =>
            /* binding */ detectHeadingOneIssue
          /* harmony export */
        });
        /* harmony import */ var marked__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! marked */ '../../node_modules/marked/lib/marked.esm.js'
          );

        async function detectHeadingOneIssue(
          rawMarkdown,
          cellIndex,
          cellType,
          cells
        ) {
          const notebookIssues = [];
          // If there are no cells, nothing to report
          if (!cells.length) {
            return notebookIssues;
          }
          // Check if the first cell begins with an H1 (the only case where we do NOT flag)
          const firstCell = cells[0];
          let firstCellStartsWithH1 = false;
          if (firstCell.type === 'markdown') {
            const content = firstCell.source;
            const tokens =
              marked__WEBPACK_IMPORTED_MODULE_0__.marked.lexer(content);
            const firstToken = tokens.find(
              t => t && t.type !== 'space' && (t.raw || '').trim().length > 0
            );
            if (
              firstToken &&
              firstToken.type === 'heading' &&
              firstToken.depth === 1
            ) {
              firstCellStartsWithH1 = true;
            } else if (firstToken && firstToken.type === 'html') {
              const rawHtml = firstToken.raw || '';
              firstCellStartsWithH1 = /<h1[^>]*>[\s\S]*?<\/h1>/i.test(rawHtml);
            }
          }
          if (firstCellStartsWithH1) {
            return notebookIssues;
          }
          // Emit a single top-level issue at the beginning and return
          notebookIssues.push({
            cellIndex: 0,
            cellType: firstCell.type,
            violationId: 'heading-missing-h1',
            issueContentRaw: ''
          });
          return notebookIssues;
        }
        async function analyzeHeadingHierarchy(cells) {
          const notebookIssues = [];
          try {
            // Create a complete heading structure that maps cell index to heading level and content
            // Use array to retain order of headings
            const headingStructure = [];
            // First pass: collect all headings
            for (let i = 0; i < cells.length; i++) {
              const cell = cells[i];
              if (!cell || cell.type !== 'markdown') {
                continue;
              }
              const content = cell.source;
              if (!content.trim()) {
                continue;
              }
              // Tokenize markdown and map tokens to source offsets for headings
              const tokens =
                marked__WEBPACK_IMPORTED_MODULE_0__.marked.lexer(content);
              let searchStart = 0;
              for (const token of tokens) {
                let level = null;
                let rawHeading = '';
                let text = '';
                if (token.type === 'heading') {
                  level = token.depth;
                  rawHeading = token.raw || '';
                  text = token.text || '';
                } else if (token.type === 'html') {
                  const rawHtml = token.raw || '';
                  const m = rawHtml.match(/<h([1-6])[^>]*>[\s\S]*?<\/h\1>/i);
                  if (m) {
                    level = parseInt(m[1], 10);
                    rawHeading = m[0];
                    text = rawHeading.replace(/<[^>]+>/g, '');
                  }
                }
                if (level !== null) {
                  // Bug Check: Is the rendered h1 really h1? (Markdown Setext-heading) -> Can be improved.
                  if (
                    level === 1 &&
                    ((text || '').match(/(?<!\\)\$\$/g) || []).length === 1
                  ) {
                    continue;
                  }
                  const start = content.indexOf(rawHeading, searchStart);
                  if (start === -1) {
                    continue;
                  }
                  const end = start + rawHeading.length;
                  searchStart = end;
                  headingStructure.push({
                    cellIndex: i,
                    level,
                    content: text,
                    html: rawHeading,
                    offsetStart: start,
                    offsetEnd: end
                  });
                }
              }
            }
            // Track headings by level to detect duplicates
            // Only track h1 and h2 headings
            const h1Headings = new Map();
            const h2Headings = new Map();
            // First pass: collect all h1 and h2 headings
            headingStructure.forEach((heading, index) => {
              if (heading.level === 1) {
                const normalizedContent = heading.content.trim().toLowerCase();
                if (!h1Headings.has(normalizedContent)) {
                  h1Headings.set(normalizedContent, []);
                }
                h1Headings.get(normalizedContent).push(index);
              } else if (heading.level === 2) {
                const normalizedContent = heading.content.trim().toLowerCase();
                if (!h2Headings.has(normalizedContent)) {
                  h2Headings.set(normalizedContent, []);
                }
                h2Headings.get(normalizedContent).push(index);
              }
            });
            // Check for multiple h1 headings
            // First, find all h1 headings regardless of content
            const allH1Indices = headingStructure
              .map((heading, index) => (heading.level === 1 ? index : -1))
              .filter(index => index !== -1);
            // If there are multiple h1 headings, flag all but the first one
            if (allH1Indices.length > 1) {
              allH1Indices.slice(1).forEach(index => {
                const heading = headingStructure[index];
                notebookIssues.push({
                  cellIndex: heading.cellIndex,
                  cellType: 'markdown',
                  violationId: 'heading-multiple-h1',
                  issueContentRaw: heading.html,
                  metadata: {
                    headingStructure: headingStructure.filter(
                      h => h.level === 1 || h.level === 2
                    ),
                    offsetStart: heading.offsetStart,
                    offsetEnd: heading.offsetEnd
                  }
                });
              });
            }
            // Check for duplicate h2 headings
            h2Headings.forEach((indices, content) => {
              if (indices.length > 1) {
                // Flag all h2 headings after the first one
                indices.slice(1).forEach(index => {
                  const heading = headingStructure[index];
                  notebookIssues.push({
                    cellIndex: heading.cellIndex,
                    cellType: 'markdown',
                    violationId: 'heading-duplicate-h2',
                    issueContentRaw: heading.html,
                    metadata: {
                      headingStructure: headingStructure.filter(
                        h => h.level === 1 || h.level === 2
                      ),
                      offsetStart: heading.offsetStart,
                      offsetEnd: heading.offsetEnd
                    }
                  });
                });
              }
            });
            // Check for headings that appear in both h1 and h2
            h1Headings.forEach((h1Indices, content) => {
              if (h2Headings.has(content)) {
                // Flag all h2 headings that share content with h1
                h2Headings.get(content).forEach(index => {
                  const heading = headingStructure[index];
                  notebookIssues.push({
                    cellIndex: heading.cellIndex,
                    cellType: 'markdown',
                    violationId: 'heading-duplicate-h1-h2',
                    issueContentRaw: heading.html,
                    metadata: {
                      headingStructure: headingStructure.filter(
                        h => h.level === 1 || h.level === 2
                      ),
                      offsetStart: heading.offsetStart,
                      offsetEnd: heading.offsetEnd
                    }
                  });
                });
              }
            });
            // Second pass: analyze heading structure for other issues
            for (let i = 0; i < headingStructure.length; i++) {
              const current = headingStructure[i];
              const previous = i > 0 ? headingStructure[i - 1] : null;
              // Check for empty headings
              if (!current.content.trim()) {
                notebookIssues.push({
                  cellIndex: current.cellIndex,
                  cellType: 'markdown',
                  violationId: 'heading-empty',
                  issueContentRaw: current.html,
                  metadata: {
                    offsetStart: current.offsetStart,
                    offsetEnd: current.offsetEnd
                  }
                });
              }
              // Skip first heading (no previous to compare with)
              if (!previous) {
                continue;
              }
              // Check for invalid heading level skips
              // Only flag violations when skipping to lower levels (e.g., h2 to h4)
              // Allow skips when returning to higher levels (e.g., h4 to h2)
              const levelDiff = current.level - previous.level;
              if (levelDiff > 1) {
                // Only check when going to lower levels
                notebookIssues.push({
                  cellIndex: current.cellIndex,
                  cellType: 'markdown',
                  violationId: 'heading-wrong-order',
                  issueContentRaw: current.html,
                  metadata: {
                    previousHeadingLevel: previous.level,
                    offsetStart: current.offsetStart,
                    offsetEnd: current.offsetEnd
                  }
                });
              }
            }
          } catch (error) {
            console.error('Error in heading hierarchy analysis:', error);
          }
          return notebookIssues;
        }

        /***/
      },

    /***/ '../core/dist/detection/category/image.js':
      /*!************************************************!*\
  !*** ../core/dist/detection/category/image.js ***!
  \************************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ detectImageIssuesInCell: () =>
            /* binding */ detectImageIssuesInCell
          /* harmony export */
        });
        /* harmony import */ var tesseract_js__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! tesseract.js */ '../../node_modules/tesseract.js/src/index.js'
          );
        /* harmony import */ var tesseract_js__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            tesseract_js__WEBPACK_IMPORTED_MODULE_0__
          );

        async function getTextInImage(
          imagePath,
          currentDirectoryPath,
          baseUrl,
          imageProcessor,
          attachments
        ) {
          const worker =
            await tesseract_js__WEBPACK_IMPORTED_MODULE_0___default().createWorker(
              'eng'
            );
          try {
            let imageSource;
            // Check if this is a JupyterLab attachment
            if (imagePath.startsWith('attachment:')) {
              if (!attachments) {
                throw new Error('Attachments required for attachment images');
              }
              const attachmentId = imagePath.substring('attachment:'.length);
              const data = attachments[attachmentId];
              let dataUrl = null;
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
        async function detectImageIssuesInCell(
          rawMarkdown,
          cellIndex,
          cellType,
          notebookPath,
          baseUrl,
          imageProcessor,
          attachments
        ) {
          var _a, _b, _c;
          const notebookIssues = [];
          // Check for images without alt text in markdown syntax
          const mdSyntaxMissingAltRegex = /!\[\]\([^)]+\)/g;
          // Check for images without alt tag or empty alt tag in HTML syntax
          const htmlSyntaxMissingAltRegex =
            /<img[^>]*alt=["']\s*["'][^>]*\/?>/g;
          const htmlSyntaxNoAltRegex = /<img(?![^>]*alt=)[^>]*\/?>/g;
          // Iterate a list of regexes; each scans independently over the cell content
          const regexes = [
            mdSyntaxMissingAltRegex,
            htmlSyntaxMissingAltRegex,
            htmlSyntaxNoAltRegex
          ];
          for (const regex of regexes) {
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(rawMarkdown)) !== null) {
              const imageUrl =
                ((_a = match[0].match(/\(([^)]+)\)/)) === null || _a === void 0
                  ? void 0
                  : _a[1]) ||
                ((_b = match[0].match(/src=["']([^"']+)["']/)) === null ||
                _b === void 0
                  ? void 0
                  : _b[1]);
              if (!imageUrl) {
                continue;
              }
              const issueId = 'image-missing-alt';
              const start =
                (_c = match.index) !== null && _c !== void 0 ? _c : 0;
              const end = start + match[0].length;
              let suggestedFix = '';
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
                  cellType: cellType,
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

        /***/
      },

    /***/ '../core/dist/detection/category/index.js':
      /*!************************************************!*\
  !*** ../core/dist/detection/category/index.js ***!
  \************************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ analyzeHeadingHierarchy: () =>
            /* reexport safe */ _heading_js__WEBPACK_IMPORTED_MODULE_2__.analyzeHeadingHierarchy,
          /* harmony export */ analyzeTableIssues: () =>
            /* reexport safe */ _table_js__WEBPACK_IMPORTED_MODULE_1__.analyzeTableIssues,
          /* harmony export */ detectColorIssuesInCell: () =>
            /* reexport safe */ _color_js__WEBPACK_IMPORTED_MODULE_3__.detectColorIssuesInCell,
          /* harmony export */ detectHeadingOneIssue: () =>
            /* reexport safe */ _heading_js__WEBPACK_IMPORTED_MODULE_2__.detectHeadingOneIssue,
          /* harmony export */ detectImageIssuesInCell: () =>
            /* reexport safe */ _image_js__WEBPACK_IMPORTED_MODULE_0__.detectImageIssuesInCell,
          /* harmony export */ detectLinkIssuesInCell: () =>
            /* reexport safe */ _link_js__WEBPACK_IMPORTED_MODULE_4__.detectLinkIssuesInCell,
          /* harmony export */ detectTableIssuesInCell: () =>
            /* reexport safe */ _table_js__WEBPACK_IMPORTED_MODULE_1__.detectTableIssuesInCell
          /* harmony export */
        });
        /* harmony import */ var _image_js__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! ./image.js */ '../core/dist/detection/category/image.js'
          );
        /* harmony import */ var _table_js__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(
            /*! ./table.js */ '../core/dist/detection/category/table.js'
          );
        /* harmony import */ var _heading_js__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            /*! ./heading.js */ '../core/dist/detection/category/heading.js'
          );
        /* harmony import */ var _color_js__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            /*! ./color.js */ '../core/dist/detection/category/color.js'
          );
        /* harmony import */ var _link_js__WEBPACK_IMPORTED_MODULE_4__ =
          __webpack_require__(
            /*! ./link.js */ '../core/dist/detection/category/link.js'
          );

        /***/
      },

    /***/ '../core/dist/detection/category/link.js':
      /*!***********************************************!*\
  !*** ../core/dist/detection/category/link.js ***!
  \***********************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ detectLinkIssuesInCell: () =>
            /* binding */ detectLinkIssuesInCell
          /* harmony export */
        });
        const VAGUE_PHRASES = ['click', 'here', 'link', 'more', 'read'];
        const MIN_DESCRIPTIVE_CHARS = 20;
        function isUrlLike(text) {
          const t = text.trim();
          return /^(https?:\/\/|www\.)/i.test(t);
        }
        function containsVaguePhrase(text) {
          const lower = text.toLowerCase();
          return VAGUE_PHRASES.some(p => lower.includes(p));
        }
        function extractAttr(tag, attr) {
          // Match attr='...' or attr="..."
          const m = new RegExp(attr + '=[\'"][^\'"]+[\'"]', 'i').exec(tag);
          return m
            ? m[0].split('=')[1].replace(/^['"]/, '').replace(/['"]$/, '')
            : null;
        }
        function detectLinkIssuesInCell(rawMarkdown, cellIndex, cellType) {
          var _a, _b;
          const issues = [];
          // Markdown links: [text](url)
          const mdLink = /\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g;
          let match;
          while ((match = mdLink.exec(rawMarkdown)) !== null) {
            const full = match[0];
            const text = (match[1] || '').trim();
            const start = (_a = match.index) !== null && _a !== void 0 ? _a : 0;
            const end = start + full.length;
            const violation = shouldFlag(text);
            if (violation) {
              issues.push({
                cellIndex,
                cellType: cellType,
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
            const tagStart =
              (_b = match.index) !== null && _b !== void 0 ? _b : 0;
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
                cellType: cellType,
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
                cellType: cellType,
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
        function shouldFlag(text) {
          // Flag if entire text is a URL
          if (isUrlLike(text)) {
            return true;
          }
          // AND condition: vague phrase present AND too short
          const tooShort = text.trim().length < MIN_DESCRIPTIVE_CHARS;
          const hasVague = containsVaguePhrase(text);
          return hasVague && tooShort;
        }

        /***/
      },

    /***/ '../core/dist/detection/category/table.js':
      /*!************************************************!*\
  !*** ../core/dist/detection/category/table.js ***!
  \************************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ analyzeTableIssues: () =>
            /* binding */ analyzeTableIssues,
          /* harmony export */ detectTableIssuesInCell: () =>
            /* binding */ detectTableIssuesInCell
          /* harmony export */
        });
        function detectTableIssuesInCell(rawMarkdown, cellIndex, cellType) {
          var _a, _b, _c;
          const notebookIssues = [];
          // Check for tables without th tags
          const tableWithoutThRegex =
            /<table[^>]*>(?![\s\S]*?<th[^>]*>)[\s\S]*?<\/table>/gi;
          let match;
          while ((match = tableWithoutThRegex.exec(rawMarkdown)) !== null) {
            const start = (_a = match.index) !== null && _a !== void 0 ? _a : 0;
            const end = start + match[0].length;
            notebookIssues.push({
              cellIndex,
              cellType: cellType,
              violationId: 'table-missing-header',
              issueContentRaw: match[0],
              metadata: {
                offsetStart: start,
                offsetEnd: end
              }
            });
          }
          // Check for tables without caption tags
          const tableWithoutCaptionRegex =
            /<table[^>]*>(?![\s\S]*?<caption[^>]*>)[\s\S]*?<\/table>/gi;
          while (
            (match = tableWithoutCaptionRegex.exec(rawMarkdown)) !== null
          ) {
            const start = (_b = match.index) !== null && _b !== void 0 ? _b : 0;
            const end = start + match[0].length;
            notebookIssues.push({
              cellIndex,
              cellType: cellType,
              violationId: 'table-missing-caption',
              issueContentRaw: match[0],
              metadata: {
                offsetStart: start,
                offsetEnd: end
              }
            });
          }
          // Check for tables with th tags but missing scope attributes
          // Use regex instead of DOMParser for CLI compatibility
          const tableWithThRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
          while ((match = tableWithThRegex.exec(rawMarkdown)) !== null) {
            const tableHtml = match[0];
            const start = (_c = match.index) !== null && _c !== void 0 ? _c : 0;
            const end = start + match[0].length;
            // Find all th tags within this table
            const thRegex = /<th\b([^>]*)>/gi;
            let thMatch;
            let hasMissingScope = false;
            while ((thMatch = thRegex.exec(tableHtml)) !== null) {
              const attributes = thMatch[1];
              if (!attributes.toLowerCase().includes('scope=')) {
                hasMissingScope = true;
                break; // Found one, flag the table
              }
            }
            if (hasMissingScope) {
              notebookIssues.push({
                cellIndex,
                cellType: cellType,
                violationId: 'table-missing-scope',
                issueContentRaw: tableHtml,
                metadata: {
                  offsetStart: start,
                  offsetEnd: end
                }
              });
            }
          }
          return notebookIssues;
        }
        async function analyzeTableIssues(cells) {
          const notebookIssues = [];
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (!cell || cell.type !== 'markdown') {
              continue;
            }
            const content = cell.source;
            if (!content.trim()) {
              continue;
            }
            const cellIssues = detectTableIssuesInCell(content, i, 'markdown');
            notebookIssues.push(...cellIssues);
          }
          return notebookIssues;
        }

        /***/
      },

    /***/ '../core/dist/index.js':
      /*!*****************************!*\
  !*** ../core/dist/index.js ***!
  \*****************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ analyzeCellIssues: () =>
            /* reexport safe */ _detection_base_js__WEBPACK_IMPORTED_MODULE_2__.analyzeCellIssues,
          /* harmony export */ analyzeCellsAccessibility: () =>
            /* reexport safe */ _detection_base_js__WEBPACK_IMPORTED_MODULE_2__.analyzeCellsAccessibility,
          /* harmony export */ analyzeCellsAccessibilityCLI: () =>
            /* reexport safe */ _detection_base_js__WEBPACK_IMPORTED_MODULE_2__.analyzeCellsAccessibilityCLI,
          /* harmony export */ analyzeHeadingHierarchy: () =>
            /* reexport safe */ _detection_category_heading_js__WEBPACK_IMPORTED_MODULE_8__.analyzeHeadingHierarchy,
          /* harmony export */ analyzeTableIssues: () =>
            /* reexport safe */ _detection_category_table_js__WEBPACK_IMPORTED_MODULE_7__.analyzeTableIssues,
          /* harmony export */ buildLLMReport: () =>
            /* reexport safe */ _utils_issueFormatter_js__WEBPACK_IMPORTED_MODULE_3__.buildLLMReport,
          /* harmony export */ detectHeadingOneIssue: () =>
            /* reexport safe */ _detection_category_heading_js__WEBPACK_IMPORTED_MODULE_8__.detectHeadingOneIssue,
          /* harmony export */ detectTableIssuesInCell: () =>
            /* reexport safe */ _detection_category_table_js__WEBPACK_IMPORTED_MODULE_7__.detectTableIssuesInCell,
          /* harmony export */ getImageAltSuggestion: () =>
            /* reexport safe */ _utils_ai_utils_js__WEBPACK_IMPORTED_MODULE_5__.getImageAltSuggestion,
          /* harmony export */ getIssueOffsets: () =>
            /* reexport safe */ _utils_edit_js__WEBPACK_IMPORTED_MODULE_4__.getIssueOffsets,
          /* harmony export */ getTableCaptionSuggestion: () =>
            /* reexport safe */ _utils_ai_utils_js__WEBPACK_IMPORTED_MODULE_5__.getTableCaptionSuggestion,
          /* harmony export */ issueCategoryNames: () =>
            /* reexport safe */ _utils_metadata_js__WEBPACK_IMPORTED_MODULE_6__.issueCategoryNames,
          /* harmony export */ issueToCategory: () =>
            /* reexport safe */ _utils_metadata_js__WEBPACK_IMPORTED_MODULE_6__.issueToCategory,
          /* harmony export */ issueToDescription: () =>
            /* reexport safe */ _utils_metadata_js__WEBPACK_IMPORTED_MODULE_6__.issueToDescription,
          /* harmony export */ rawIpynbToGeneralCells: () =>
            /* reexport safe */ _parsers_js__WEBPACK_IMPORTED_MODULE_1__.rawIpynbToGeneralCells,
          /* harmony export */ replaceSlice: () =>
            /* reexport safe */ _utils_edit_js__WEBPACK_IMPORTED_MODULE_4__.replaceSlice,
          /* harmony export */ sendLLMRequest: () =>
            /* reexport safe */ _utils_ai_utils_js__WEBPACK_IMPORTED_MODULE_5__.sendLLMRequest
          /* harmony export */
        });
        /* harmony import */ var _types_js__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(/*! ./types.js */ '../core/dist/types.js');
        /* harmony import */ var _parsers_js__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(/*! ./parsers.js */ '../core/dist/parsers.js');
        /* harmony import */ var _detection_base_js__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            /*! ./detection/base.js */ '../core/dist/detection/base.js'
          );
        /* harmony import */ var _utils_issueFormatter_js__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            /*! ./utils/issueFormatter.js */ '../core/dist/utils/issueFormatter.js'
          );
        /* harmony import */ var _utils_edit_js__WEBPACK_IMPORTED_MODULE_4__ =
          __webpack_require__(
            /*! ./utils/edit.js */ '../core/dist/utils/edit.js'
          );
        /* harmony import */ var _utils_ai_utils_js__WEBPACK_IMPORTED_MODULE_5__ =
          __webpack_require__(
            /*! ./utils/ai-utils.js */ '../core/dist/utils/ai-utils.js'
          );
        /* harmony import */ var _utils_metadata_js__WEBPACK_IMPORTED_MODULE_6__ =
          __webpack_require__(
            /*! ./utils/metadata.js */ '../core/dist/utils/metadata.js'
          );
        /* harmony import */ var _detection_category_table_js__WEBPACK_IMPORTED_MODULE_7__ =
          __webpack_require__(
            /*! ./detection/category/table.js */ '../core/dist/detection/category/table.js'
          );
        /* harmony import */ var _detection_category_heading_js__WEBPACK_IMPORTED_MODULE_8__ =
          __webpack_require__(
            /*! ./detection/category/heading.js */ '../core/dist/detection/category/heading.js'
          );

        // Export others if needed, using glob patterns or directories if possible, but specific files for now.

        /***/
      },

    /***/ '../core/dist/parsers.js':
      /*!*******************************!*\
  !*** ../core/dist/parsers.js ***!
  \*******************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ rawIpynbToGeneralCells: () =>
            /* binding */ rawIpynbToGeneralCells
          /* harmony export */
        });
        /**
         * Converts raw .ipynb JSON content into an environment-agnostic array of accessible cells.
         * This is for use in CLI or Node.js environments where JupyterLab widgets are not available.
         */
        function rawIpynbToGeneralCells(ipynbContent) {
          if (!ipynbContent || !Array.isArray(ipynbContent.cells)) {
            console.warn('Invalid notebook content: "cells" array is missing.');
            return [];
          }
          return ipynbContent.cells.map((cell, index) => {
            // .ipynb source is usually an array of strings, but can be a string
            let source = '';
            if (Array.isArray(cell.source)) {
              source = cell.source.join('');
            } else if (typeof cell.source === 'string') {
              source = cell.source;
            }
            // Normalize cell type
            const type =
              cell.cell_type === 'markdown' ||
              cell.cell_type === 'code' ||
              cell.cell_type === 'raw'
                ? cell.cell_type
                : 'raw'; // Fallback
            return {
              cellIndex: index,
              type,
              source,
              attachments: cell.attachments
            };
          });
        }

        /***/
      },

    /***/ '../core/dist/types.js':
      /*!*****************************!*\
  !*** ../core/dist/types.js ***!
  \*****************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);

        /***/
      },

    /***/ '../core/dist/utils/ai-utils.js':
      /*!**************************************!*\
  !*** ../core/dist/utils/ai-utils.js ***!
  \**************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ getImageAltSuggestion: () =>
            /* binding */ getImageAltSuggestion,
          /* harmony export */ getTableCaptionSuggestion: () =>
            /* binding */ getTableCaptionSuggestion,
          /* harmony export */ sendLLMRequest: () =>
            /* binding */ sendLLMRequest
          /* harmony export */
        });
        /* harmony import */ var _http_js__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(/*! ./http.js */ '../core/dist/utils/http.js');

        async function fetchImageAsBase64(imageUrl) {
          /**
           * Function that fetches image from url, converts to JPEG, and returns in base64 format.
           * Similar to the Python convert_to_jpeg_base64 function in your notebook.
           */
          const response = await _http_js__WEBPACK_IMPORTED_MODULE_0__.http.get(
            imageUrl,
            { responseType: 'blob' }
          );
          const imageBlob = response.data;
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              // Create canvas and draw image
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
              }
              // Set canvas size to image size
              canvas.width = img.width;
              canvas.height = img.height;
              // If image has transparency, fill with white background first
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              // Draw the image on canvas
              ctx.drawImage(img, 0, 0);
              // Convert to JPEG base64 (quality 95% like in the Python example)
              const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
              // Extract just the base64 part (remove "data:image/jpeg;base64,")
              const base64String = jpegDataUrl.split(',')[1];
              resolve(base64String);
            };
            img.onerror = () => {
              reject(new Error('Failed to load image'));
            };
            // Create object URL from blob and load it
            const objectUrl = URL.createObjectURL(imageBlob);
            img.src = objectUrl;
          });
        }
        async function getImageAltSuggestion(issue, imageData, visionSettings) {
          let prompt =
            'Read the provided image and respond with a short description of the image, without any explanation. Avoid using the word "image" in the description.';
          prompt += `Content: \n${issue.issueContentRaw}\n\n`;
          // New River implementation - using OpenAI Chat Completions API format
          try {
            const imageUrl = imageData.startsWith('data:image')
              ? imageData
              : `data:image/jpeg;base64,${await fetchImageAsBase64(imageData)}`;
            const body = JSON.stringify({
              model: visionSettings.model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a helpful assistant that generates alt text for images.'
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: prompt
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: imageUrl
                      }
                    }
                  ]
                }
              ],
              max_tokens: 150
            });
            const response =
              await _http_js__WEBPACK_IMPORTED_MODULE_0__.http.post(
                visionSettings.baseUrl,
                body,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${visionSettings.apiKey}`
                  }
                }
              );
            // Parse response using OpenAI Chat Completions format
            if (
              response.data.choices &&
              response.data.choices[0] &&
              response.data.choices[0].message
            ) {
              const responseText = response.data.choices[0].message.content;
              return responseText
                ? responseText.trim()
                : 'No content in response';
            } else {
              console.error('Unexpected response structure:', response.data);
              return 'Error parsing response';
            }
          } catch (error) {
            console.error('Error getting suggestions:', error);
            return 'Error';
          }
        }
        async function getTableCaptionSuggestion(issue, languageSettings) {
          const prompt = `Given this HTML table, please provide a caption for the table to be served as a title or heading for the table. Avoid using the word "table" in the caption. Here's the table:
    ${issue.issueContentRaw}`;
          // New River implementation - using OpenAI Chat Completions API format
          try {
            const body = JSON.stringify({
              model: languageSettings.model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a helpful assistant that generates captions for HTML tables.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 150
            });
            const response =
              await _http_js__WEBPACK_IMPORTED_MODULE_0__.http.post(
                languageSettings.baseUrl,
                body,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${languageSettings.apiKey}`
                  }
                }
              );
            // Parse response using OpenAI Chat Completions format
            if (
              response.data.choices &&
              response.data.choices[0] &&
              response.data.choices[0].message
            ) {
              const responseText = response.data.choices[0].message.content;
              return responseText
                ? responseText.trim()
                : 'No content in response';
            } else {
              console.error('Unexpected response structure:', response.data);
              return 'Error parsing response';
            }
          } catch (error) {
            console.error('Error getting suggestions:', error);
            return 'Error';
          }
        }
        async function sendLLMRequest(
          prompt,
          settings,
          systemMessage = 'You are a helpful assistant.'
        ) {
          try {
            const body = JSON.stringify({
              model: settings.model,
              messages: [
                {
                  role: 'system',
                  content: systemMessage
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 1500
            });
            const response =
              await _http_js__WEBPACK_IMPORTED_MODULE_0__.http.post(
                settings.baseUrl,
                body,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${settings.apiKey}`
                  }
                }
              );
            if (
              response.data.choices &&
              response.data.choices[0] &&
              response.data.choices[0].message
            ) {
              const responseText = response.data.choices[0].message.content;
              return responseText
                ? responseText.trim()
                : 'No content in response';
            } else {
              console.error('Unexpected response structure:', response.data);
              return 'Error parsing response';
            }
          } catch (error) {
            console.error('Error sending LLM request:', error);
            return 'Error';
          }
        }

        /***/
      },

    /***/ '../core/dist/utils/edit.js':
      /*!**********************************!*\
  !*** ../core/dist/utils/edit.js ***!
  \**********************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ getIssueOffsets: () =>
            /* binding */ getIssueOffsets,
          /* harmony export */ replaceSlice: () => /* binding */ replaceSlice
          /* harmony export */
        });
        function getIssueOffsets(issue, sourceLength) {
          var _a, _b, _c, _d;
          const start =
            (_b =
              (_a = issue.metadata) === null || _a === void 0
                ? void 0
                : _a.offsetStart) !== null && _b !== void 0
              ? _b
              : null;
          const end =
            (_d =
              (_c = issue.metadata) === null || _c === void 0
                ? void 0
                : _c.offsetEnd) !== null && _d !== void 0
              ? _d
              : null;
          if (
            start === null ||
            end === null ||
            isNaN(start) ||
            isNaN(end) ||
            start < 0 ||
            end > sourceLength ||
            start >= end
          ) {
            return null;
          }
          return { offsetStart: start, offsetEnd: end };
        }
        function replaceSlice(source, start, end, replacement) {
          return source.slice(0, start) + replacement + source.slice(end);
        }

        /***/
      },

    /***/ '../core/dist/utils/http.js':
      /*!**********************************!*\
  !*** ../core/dist/utils/http.js ***!
  \**********************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ get: () => /* binding */ get,
          /* harmony export */ http: () => /* binding */ http,
          /* harmony export */ post: () => /* binding */ post
          /* harmony export */
        });
        /* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! axios */ '../../node_modules/axios/lib/axios.js'
          );

        function getDataUrlPayloadBytes(dataUrl) {
          // data:[<mediatype>][;base64],<data>
          const commaIdx = dataUrl.indexOf(',');
          if (commaIdx === -1) {
            return 0;
          }
          const header = dataUrl.substring(0, commaIdx).toLowerCase();
          const payload = dataUrl.substring(commaIdx + 1);
          if (header.includes(';base64')) {
            // Base64 size: 3/4 of length, minus padding
            const len = payload.length;
            const padding = payload.endsWith('==')
              ? 2
              : payload.endsWith('=')
                ? 1
                : 0;
            return Math.floor((len * 3) / 4) - padding;
          }
          // URL-encoded payload; approximate by decoding length
          try {
            return decodeURIComponent(payload).length;
          } catch (_a) {
            return payload.length;
          }
        }
        function enforceDataUrlLimit(url, cfg) {
          var _a;
          if (!url) {
            return;
          }
          if (url.startsWith('data:')) {
            const limit =
              (_a =
                cfg === null || cfg === void 0
                  ? void 0
                  : cfg.maxDataUrlBytes) !== null && _a !== void 0
                ? _a
                : 10 * 1024 * 1024; // 10 MiB default
            const size = getDataUrlPayloadBytes(url);
            if (size > limit) {
              throw new Error(
                `Data URL exceeds limit (${size} bytes > ${limit} bytes)`
              );
            }
          }
        }
        async function get(url, config) {
          enforceDataUrlLimit(url, config);
          return axios__WEBPACK_IMPORTED_MODULE_0__['default'].get(url, config);
        }
        async function post(url, data, config) {
          enforceDataUrlLimit(url, config);
          return axios__WEBPACK_IMPORTED_MODULE_0__['default'].post(
            url,
            data,
            config
          );
        }
        const http = { get, post };

        /***/
      },

    /***/ '../core/dist/utils/issueFormatter.js':
      /*!********************************************!*\
  !*** ../core/dist/utils/issueFormatter.js ***!
  \********************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ buildLLMReport: () =>
            /* binding */ buildLLMReport
          /* harmony export */
        });
        function normalizeContent(raw) {
          if (!raw) {
            return '';
          }
          const cleaned = raw.trim().replace(/\s+/g, ' ');
          return cleaned.substring(0, 160);
        }
        function buildLLMReport(issues) {
          const issuesByViolation = {};
          const llmIssues = issues.map(issue => {
            issuesByViolation[issue.violationId] =
              (issuesByViolation[issue.violationId] || 0) + 1;
            return {
              violationId: issue.violationId,
              cellIndex: issue.cellIndex,
              cellType: issue.cellType,
              description: issue.customDescription || '',
              contentSnippet: normalizeContent(issue.issueContentRaw)
            };
          });
          const summaryItems = Object.entries(issuesByViolation).map(
            ([violationId, count]) => ({ violationId, count })
          );
          return {
            summary: {
              totalIssues: issues.length,
              issuesByViolation: summaryItems
            },
            issues: llmIssues
          };
        }

        /***/
      },

    /***/ '../core/dist/utils/metadata.js':
      /*!**************************************!*\
  !*** ../core/dist/utils/metadata.js ***!
  \**************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ issueCategoryNames: () =>
            /* binding */ issueCategoryNames,
          /* harmony export */ issueToCategory: () =>
            /* binding */ issueToCategory,
          /* harmony export */ issueToDescription: () =>
            /* binding */ issueToDescription
          /* harmony export */
        });
        const issueCategoryNames = [
          'Images',
          'Headings',
          'Lists',
          'Tables',
          'Color',
          'Links',
          'Other'
        ];
        const issueToCategory = new Map([
          // 1. Images
          ['image-missing-alt', 'Images'],
          // TODO: 2. Headings
          ['heading-missing-h1', 'Headings'],
          ['heading-multiple-h1', 'Headings'],
          ['heading-duplicate', 'Headings'],
          ['heading-duplicate-h2', 'Headings'],
          ['heading-duplicate-h1-h2', 'Headings'],
          ['heading-wrong-order', 'Headings'],
          ['heading-empty', 'Headings'],
          // TODO: 3. Tables
          ['table-missing-header', 'Tables'],
          ['table-missing-caption', 'Tables'],
          ['table-missing-scope', 'Tables'],
          // TODO: 4. Color
          ['color-insufficient-cc-normal', 'Color'],
          ['color-insufficient-cc-large', 'Color'],
          // TODO: Lists
          // TODO: Links
          ['link-discernible-text', 'Links']
          // TODO: Other
        ]);
        const issueToDescription = new Map([
          // 1. Images
          [
            'image-missing-alt',
            {
              title: 'Missing Alt Text',
              description:
                'All images must have alternate text to convey their purpose and meaning to screen reader users.',
              detailedDescription:
                "Ensure all informative images have short, descriptive alternate text. Screen readers have no way of translating an image into words that gets read to the user, even if the image only consists of text. As a result, it's necessary for images to have short, descriptive alt text so screen reader users clearly understand the image's contents and purpose",
              descriptionUrl:
                'https://dequeuniversity.com/rules/axe/4.4/image-alt'
            }
          ],
          // TODO: 2. Headings
          [
            'heading-missing-h1',
            {
              title: 'Missing H1 Heading',
              description:
                'Ensure a single H1 tag is present at the top of the notebook.',
              detailedDescription:
                'Screen reader users can use keyboard shortcuts to navigate directly to the first h1, which, in principle, should allow them to jump directly to the main content of the web page. If there is no h1, or if the h1 appears somewhere other than at the start of the main content, screen reader users must listen to more of the web page to understand its structure, making the experience confusing and frustrating. Please also ensure that headings contain descriptive, accurate text',
              descriptionUrl:
                'https://dequeuniversity.com/rules/axe/4.1/page-has-heading-one'
            }
          ],
          [
            'heading-multiple-h1',
            {
              title: 'Duplicate H1 Heading',
              description:
                'Ensure there is only one level-one heading (h1) in the notebook.',
              detailedDescription:
                'The h1 heading should be at the top of the document and serve as the main title. Additional h1 headings can confuse screen reader users about the document structure. Please also ensure that headings contain descriptive, accurate text'
            }
          ],
          [
            'heading-duplicate-h2',
            {
              title: 'Duplicate Heading h2',
              description: 'Ensure identical h2 headings are not used.',
              detailedDescription:
                'This can be confusing for screen reader users as it creates redundant landmarks in the document structure. Please consider combining the sections or using different heading text'
            }
          ],
          [
            'heading-duplicate-h1-h2',
            {
              title: 'Duplicate Heading h1 and h2',
              description:
                'Ensure h1 and h2 headings do not share the same text.',
              detailedDescription:
                'This can be confusing for screen reader users as it creates redundant landmarks in the document structure. Please use different text for h1 and h2 headings'
            }
          ],
          [
            'heading-wrong-order',
            {
              title: 'Wrong Heading Order',
              description:
                'Headings must be in a valid logical order, meaning H1 through H6 element tags must appear in a sequentially-descending order.',
              detailedDescription:
                'Ensure the order of headings is semantically correct. Headings provide essential structure for screen reader users to navigate a page. Skipping levels or using headings out of order can make the content feel disorganized or inaccessible. Please also ensure that headings contain descriptive, accurate text',
              descriptionUrl:
                'https://dequeuniversity.com/rules/axe/pdf/2.0/heading-order'
            }
          ],
          [
            'heading-empty',
            {
              title: 'Empty Heading',
              description: 'Ensure that a heading element contains content.',
              detailedDescription:
                'Ensure headings have discernible text. Headings provide essential structure for screen reader users to navigate a page. When a heading is empty, it creates confusion and disrupts this experience. Please also ensure that headings contain descriptive, accurate text',
              descriptionUrl:
                'https://dequeuniversity.com/rules/axe/4.2/empty-heading'
            }
          ],
          // TODO: 3. Tables
          [
            'table-missing-header',
            {
              title: 'Missing Table Header',
              description:
                'Ensure that a table has a row, column, or both headers.',
              detailedDescription:
                'Tables must have header cells to provide context for the data. Without headers, screen reader users cannot understand the relationship between data cells and their meaning. Please add appropriate header cells using the <th> tag'
            }
          ],
          [
            'table-missing-caption',
            {
              title: 'Missing Table Caption',
              description: 'Ensure that a table has a caption.',
              detailedDescription:
                'Tables should have captions to provide a brief description of their content. Captions help screen reader users understand the purpose and context of the table data. Please add a caption using the <caption> tag'
            }
          ],
          [
            'table-missing-scope',
            {
              title: 'Missing Table Scope',
              description: 'Ensure that a table has a scope attribute.',
              detailedDescription: 'Table headers must have scope attributes'
            }
          ],
          // TODO: 4. Color
          [
            'color-insufficient-cc-normal',
            {
              title: 'Insufficient Color Contrast',
              description:
                'Ensure that a text in an image has sufficient color contrast.',
              detailedDescription:
                'Text must have sufficient contrast with its background to be readable. For normal text, the contrast ratio should be at least 4.5:1. This ensures that users with visual impairments can read the content',
              descriptionUrl:
                'https://dequeuniversity.com/rules/axe/3.5/color-contrast'
            }
          ],
          [
            'color-insufficient-cc-large',
            {
              title: 'Insufficient Color Contrast',
              description:
                'Ensure that a large text in an image has sufficient color contrast.',
              detailedDescription:
                'Large text must have sufficient contrast with its background to be readable. For large text (18pt or 14pt bold), the contrast ratio should be at least 3:1. This ensures that users with visual impairments can read the content',
              descriptionUrl:
                'https://dequeuniversity.com/rules/axe/3.5/color-contrast'
            }
          ],
          // TODO: Lists
          // TODO: Links
          [
            'link-discernible-text',
            {
              title: 'Link Text Not Descriptive',
              description:
                'Links must have discernible, descriptive text (or aria-label) that conveys purpose without relying on surrounding context.',
              detailedDescription:
                'Avoid vague phrases like "click here" or bare URLs. Provide concise, meaningful link text that describes the destination. This helps all users, including screen reader users, understand link purpose.',
              descriptionUrl:
                'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html'
            }
          ]
          // TODO: Other
        ]);

        /***/
      }
  }
]);
//# sourceMappingURL=core_dist_index_js.09a815cfffd0783bc6fc.js.map
