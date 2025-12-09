'use strict';
(self['webpackChunkjupyterlab_a11y_checker'] =
  self['webpackChunkjupyterlab_a11y_checker'] || []).push([
  ['lib_index_js'],
  {
    /***/ './lib/adapter.js':
      /*!************************!*\
  !*** ./lib/adapter.js ***!
  \************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ notebookToGeneralCells: () =>
            /* binding */ notebookToGeneralCells
          /* harmony export */
        });
        /**
         * Converts JupyterLab NotebookPanel widgets into an environment-agnostic array of accessible cells.
         * This allows detection logic to run on pure data without depending on JupyterLab UI widgets.
         */
        function notebookToGeneralCells(panel) {
          return panel.content.widgets.map((cell, index) => {
            // Get source from shared model for latest content (real-time/unsaved changes)
            const source = cell.model.sharedModel.getSource();
            // Cast type explicitly to match our strict union type
            const type = cell.model.type;
            // Extract attachments if they exist
            // cell.model.toJSON() returns an ICell object which might have attachments
            const cellData = cell.model.toJSON();
            const attachments = cellData.attachments;
            return {
              cellIndex: index,
              type,
              source,
              attachments
            };
          });
        }

        /***/
      },

    /***/ './lib/components/fix/base.js':
      /*!************************************!*\
  !*** ./lib/components/fix/base.js ***!
  \************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ ButtonFixWidget: () =>
            /* binding */ ButtonFixWidget,
          /* harmony export */ DropdownFixWidget: () =>
            /* binding */ DropdownFixWidget,
          /* harmony export */ TextFieldFixWidget: () =>
            /* binding */ TextFieldFixWidget
          /* harmony export */
        });
        /* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! @lumino/widgets */ 'webpack/sharing/consume/default/@lumino/widgets'
          );
        /* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(
            /*! @berkeley-dsep-infra/a11y-checker-core */ 'webpack/sharing/consume/default/@berkeley-dsep-infra/a11y-checker-core/@berkeley-dsep-infra/a11y-checker-core'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_1___default =
          /*#__PURE__*/ __webpack_require__.n(
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_1__
          );
        /* harmony import */ var _adapter_js__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(/*! ../../adapter.js */ './lib/adapter.js');
        /* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            /*! @jupyterlab/coreutils */ 'webpack/sharing/consume/default/@jupyterlab/coreutils'
          );
        /* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_2___default =
          /*#__PURE__*/ __webpack_require__.n(
            _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_2__
          );
        /* harmony import */ var _image_processor_js__WEBPACK_IMPORTED_MODULE_4__ =
          __webpack_require__(
            /*! ../../image-processor.js */ './lib/image-processor.js'
          );

        // Intentionally keep base free of category-specific analysis. Widgets can override.

        class FixWidget
          extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget
        {
          constructor(issue, cell, aiEnabled) {
            super();
            this.currentPath = '';
            this.issue = issue;
            this.cell = cell;
            this.aiEnabled = aiEnabled;
            this.addClass('a11y-fix-widget');
          }
          // Method to remove the widget from the DOM
          removeIssueWidget() {
            const issueWidget = this.node.closest('.issue-widget');
            if (issueWidget) {
              const category = issueWidget.closest('.category');
              issueWidget.remove();
              if (category && !category.querySelector('.issue-widget')) {
                category.remove();
              }
            }
            // For all fixes, highlight the current cell
            this.cell.node.style.transition = 'background-color 0.5s ease';
            this.cell.node.style.backgroundColor = 'var(--success-green)';
            setTimeout(() => {
              this.cell.node.style.backgroundColor = '';
            }, 1000);
          }
          // Re-run content-based detectors for this cell only and dispatch an update
          async reanalyzeCellAndDispatch() {
            var _a, _b, _c;
            const notebookPanel =
              (_a = this.cell.parent) === null || _a === void 0
                ? void 0
                : _a.parent;
            if (!notebookPanel) {
              return;
            }
            // Find cell index within the notebook (TODO: Include cellIndex at the first place)
            const cellIndex =
              (_c =
                (_b = this.cell.parent) === null || _b === void 0
                  ? void 0
                  : _b.widgets.indexOf(this.cell)) !== null && _c !== void 0
                ? _c
                : -1;
            if (cellIndex < 0) {
              return;
            }
            setTimeout(async () => {
              const accessibleCells = (0,
              _adapter_js__WEBPACK_IMPORTED_MODULE_3__.notebookToGeneralCells)(
                notebookPanel
              );
              const targetCell = accessibleCells[cellIndex];
              const issues = await (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_1__.analyzeCellIssues)(
                targetCell,
                document,
                _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_2__.PageConfig.getBaseUrl(),
                new _image_processor_js__WEBPACK_IMPORTED_MODULE_4__.BrowserImageProcessor(),
                notebookPanel.context.path
              );
              const event = new CustomEvent('notebookReanalyzed', {
                detail: { issues, isCellUpdate: true },
                bubbles: true,
                composed: true
              });
              // Dispatch from this widget's node so it bubbles up to the main panel
              //this.node.dispatchEvent(event);
              // Also dispatch directly on the main panel root for robustness
              const mainPanelEl = document.getElementById('a11y-sidebar');
              if (mainPanelEl) {
                mainPanelEl.dispatchEvent(event);
              }
            }, 100);
          }
          // Generic notebook reanalysis hook. By default, just reanalyze this cell.
          // Widgets with notebook-wide effects (e.g., headings) should override.
          async reanalyzeNotebookAndDispatch() {
            await this.reanalyzeCellAndDispatch();
          }
        }
        class ButtonFixWidget extends FixWidget {
          constructor(issue, cell, aiEnabled) {
            super(issue, cell, aiEnabled);
            this.node.innerHTML = `
      <div class="fix-description">${this.getDescription()}</div>
      <div class="button-container">
        <button class="jp-Button2 button-fix-button">
          <span class="material-icons">check</span>
          <div>${this.getApplyButtonText()}</div>
        </button>
      </div>
    `;
            this.applyButton = this.node.querySelector('.button-fix-button');
            this.applyButton.addEventListener('click', () => this.applyFix());
          }
        }
        class TextFieldFixWidget extends FixWidget {
          constructor(issue, cell, aiEnabled) {
            super(issue, cell, aiEnabled);
            // Simplified DOM structure
            this.node.innerHTML = `
        <div class="fix-description">${this.getDescription()}</div>
        <div class="textfield-fix-widget">
          <input type="text" class="jp-a11y-input" placeholder="Input text here...">
          <div class="textfield-buttons">
              <button class="jp-Button2 suggest-button">
                  <span class="material-icons">auto_awesome</span>
                  <div>Get AI Suggestions</div>
              </button>
              <button class="jp-Button2 apply-button">
                  <span class="material-icons">check</span>
                  <div>Apply</div>
              </button>
          </div>
        </div>
      `;
            // Apply Button
            const applyButton = this.node.querySelector('.apply-button');
            if (applyButton) {
              applyButton.addEventListener('click', () => {
                const textInput = this.node.querySelector('.jp-a11y-input');
                this.applyTextToCell(textInput.value.trim());
              });
            }
            // Suggest Button
            const suggestButton = this.node.querySelector('.suggest-button');
            suggestButton.style.display = aiEnabled ? 'flex' : 'none';
            suggestButton.addEventListener('click', () =>
              this.displayAISuggestions()
            );
            // Textfield Value
            const textFieldValue = this.node.querySelector('.jp-a11y-input');
            if (this.issue.suggestedFix) {
              textFieldValue.value = this.issue.suggestedFix;
            }
          }
        }
        class DropdownFixWidget extends FixWidget {
          constructor(issue, cell, aiEnabled) {
            super(issue, cell, aiEnabled);
            this.selectedOption = '';
            // Simplified DOM structure with customizable text
            this.node.innerHTML = `
      <div class="fix-description">${this.getDescription()}</div>
      <div class="dropdown-fix-widget">
        <div class="custom-dropdown">
          <button class="dropdown-button">
            <span class="dropdown-text"></span>
            <svg class="dropdown-arrow" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <div class="dropdown-content hidden">
          </div>
        </div>
        <button class="jp-Button2 apply-button" style="${this.shouldShowApplyButton() ? '' : 'display: none;'}">
          <span class="material-icons">check</span>
          <div>Apply</div>
        </button>
      </div>
    `;
            this.dropdownButton = this.node.querySelector('.dropdown-button');
            this.dropdownContent = this.node.querySelector('.dropdown-content');
            this.dropdownText = this.node.querySelector('.dropdown-text');
            this.applyButton = this.node.querySelector('.apply-button');
            // Set initial text
            if (this.dropdownText) {
              this.dropdownText.textContent = this.getDefaultDropdownText();
            }
            // Populate dropdown options
            if (this.dropdownContent) {
              this.dropdownContent.innerHTML = this.getDropdownOptions();
            }
            // Setup dropdown handlers
            this.setupDropdownHandlers();
          }
          setupDropdownHandlers() {
            // Toggle dropdown
            this.dropdownButton.addEventListener('click', e => {
              e.stopPropagation(); // Prevent event from bubbling up
              this.dropdownContent.classList.toggle('hidden');
              this.dropdownButton.classList.toggle('active');
            });
            // Close dropdown when clicking outside
            document.addEventListener('click', event => {
              if (!this.node.contains(event.target)) {
                this.dropdownContent.classList.add('hidden');
                this.dropdownButton.classList.remove('active');
              }
            });
            // Option selection
            const options =
              this.dropdownContent.querySelectorAll('.dropdown-option');
            options.forEach(option => {
              option.addEventListener('click', e => {
                var _a;
                e.stopPropagation(); // Prevent event from bubbling up
                const value = option.dataset.value || '';
                this.selectedOption = value;
                this.handleOptionSelect(value);
                this.dropdownText.textContent =
                  ((_a = option.textContent) === null || _a === void 0
                    ? void 0
                    : _a.trim()) || '';
                this.dropdownContent.classList.add('hidden');
                this.dropdownButton.classList.remove('active');
                if (this.shouldShowApplyButton()) {
                  this.applyButton.style.display = 'flex';
                }
              });
            });
            // Apply button
            this.applyButton.addEventListener('click', () => {
              if (this.selectedOption) {
                this.applyDropdownSelection(this.selectedOption);
              }
            });
          }
        }

        /***/
      },

    /***/ './lib/components/fix/buttonFixes.js':
      /*!*******************************************!*\
  !*** ./lib/components/fix/buttonFixes.js ***!
  \*******************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ TableScopeFixWidget: () =>
            /* binding */ TableScopeFixWidget
          /* harmony export */
        });
        /* harmony import */ var _base_js__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(/*! ./base.js */ './lib/components/fix/base.js');
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! @berkeley-dsep-infra/a11y-checker-core */ 'webpack/sharing/consume/default/@berkeley-dsep-infra/a11y-checker-core/@berkeley-dsep-infra/a11y-checker-core'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__
          );
        // In src/components/fix/buttonFixes.ts

        class TableScopeFixWidget
          extends _base_js__WEBPACK_IMPORTED_MODULE_1__.ButtonFixWidget
        {
          getDescription() {
            return 'Add scope attributes to all table headers:';
          }
          getApplyButtonText() {
            return 'Apply Scope Fixes';
          }
          async applyFix() {
            const entireCellContent = this.cell.model.sharedModel.getSource();
            //console.log('Processing table for scope fix:', target);
            // Process the table
            const processTable = tableHtml => {
              const parser = new DOMParser();
              const doc = parser.parseFromString(tableHtml, 'text/html');
              const table = doc.querySelector('table');
              if (!table) {
                return tableHtml;
              }
              // Get all rows, handling both direct tr children and tr children of tbody
              const rows = Array.from(table.querySelectorAll('tr'));
              //console.log('Found rows:', rows.length);
              if (rows.length === 0) {
                //console.log('No rows found in table');
                return tableHtml;
              }
              // Create new table structure
              const newTable = doc.createElement('table');
              // Copy all attributes from original table
              Array.from(table.attributes).forEach(attr => {
                newTable.setAttribute(attr.name, attr.value);
              });
              // Copy caption if it exists
              const existingCaption = table.querySelector('caption');
              if (existingCaption) {
                //console.log('Found existing caption:', existingCaption.textContent);
                newTable.appendChild(existingCaption.cloneNode(true));
              }
              // Process header row
              const headerRow = rows[0];
              const headerCells = headerRow.querySelectorAll('th, td');
              //console.log('Header cells found:', headerCells.length);
              if (headerCells.length > 0) {
                const thead = doc.createElement('thead');
                const newHeaderRow = doc.createElement('tr');
                headerCells.forEach(cell => {
                  // Convert td to th if it's in the header row
                  const newCell = doc.createElement('th');
                  newCell.innerHTML = cell.innerHTML;
                  newCell.setAttribute('scope', 'col');
                  newHeaderRow.appendChild(newCell);
                });
                thead.appendChild(newHeaderRow);
                newTable.appendChild(thead);
              }
              // Process remaining rows
              const tbody = doc.createElement('tbody');
              rows.slice(1).forEach(row => {
                const newRow = doc.createElement('tr');
                const cells = row.querySelectorAll('td, th');
                cells.forEach((cell, index) => {
                  const newCell = cell.cloneNode(true);
                  if (cell.tagName.toLowerCase() === 'th') {
                    newCell.setAttribute('scope', 'row');
                  }
                  newRow.appendChild(newCell);
                });
                tbody.appendChild(newRow);
              });
              newTable.appendChild(tbody);
              // Format the table HTML with proper indentation
              const formatTable = table => {
                const indent = '  '; // 2 spaces for indentation
                let result = '<table';
                // Add attributes
                Array.from(table.attributes).forEach(attr => {
                  result += ` ${attr.name}="${attr.value}"`;
                });
                result += '>\n';
                // Add caption if it exists
                const caption = table.querySelector('caption');
                if (caption) {
                  result += `${indent}<caption>${caption.textContent}</caption>\n`;
                }
                // Add thead if it exists
                const thead = table.querySelector('thead');
                if (thead) {
                  result += `${indent}<thead>\n`;
                  const headerRow = thead.querySelector('tr');
                  if (headerRow) {
                    result += `${indent}${indent}<tr>\n`;
                    Array.from(headerRow.children).forEach(cell => {
                      result += `${indent}${indent}${indent}${cell.outerHTML}\n`;
                    });
                    result += `${indent}${indent}</tr>\n`;
                  }
                  result += `${indent}</thead>\n`;
                }
                // Add tbody
                const tbody = table.querySelector('tbody');
                if (tbody) {
                  result += `${indent}<tbody>\n`;
                  Array.from(tbody.children).forEach(row => {
                    result += `${indent}${indent}<tr>\n`;
                    Array.from(row.children).forEach(cell => {
                      result += `${indent}${indent}${indent}${cell.outerHTML}\n`;
                    });
                    result += `${indent}${indent}</tr>\n`;
                  });
                  result += `${indent}</tbody>\n`;
                }
                result += '</table>';
                return result;
              };
              const result = formatTable(newTable);
              return result;
            };
            // Prefer precise slice replacement using detector-provided offsets
            const offsets = (0,
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.getIssueOffsets)(
              this.issue,
              entireCellContent.length
            );
            if (offsets) {
              const { offsetStart, offsetEnd } = offsets;
              const originalSlice = entireCellContent.slice(
                offsetStart,
                offsetEnd
              );
              const replacedSlice = processTable(originalSlice);
              const newContent = (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.replaceSlice)(
                entireCellContent,
                offsetStart,
                offsetEnd,
                replacedSlice
              );
              this.cell.model.sharedModel.setSource(newContent);
            } else {
              // Fallback: find and replace first table occurrence
              const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/;
              const match = entireCellContent.match(tableRegex);
              if (match) {
                const newContent = entireCellContent.replace(
                  match[0],
                  processTable(match[0])
                );
                this.cell.model.sharedModel.setSource(newContent);
              }
            }
            await this.reanalyzeCellAndDispatch();
            this.removeIssueWidget();
          }
        }

        /***/
      },

    /***/ './lib/components/fix/dropdownFixes.js':
      /*!*********************************************!*\
  !*** ./lib/components/fix/dropdownFixes.js ***!
  \*********************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ HeadingOrderFixWidget: () =>
            /* binding */ HeadingOrderFixWidget,
          /* harmony export */ TableHeaderFixWidget: () =>
            /* binding */ TableHeaderFixWidget
          /* harmony export */
        });
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! @berkeley-dsep-infra/a11y-checker-core */ 'webpack/sharing/consume/default/@berkeley-dsep-infra/a11y-checker-core/@berkeley-dsep-infra/a11y-checker-core'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__
          );
        /* harmony import */ var _base_js__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(/*! ./base.js */ './lib/components/fix/base.js');
        /* harmony import */ var _adapter_js__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(/*! ../../adapter.js */ './lib/adapter.js');

        class TableHeaderFixWidget
          extends _base_js__WEBPACK_IMPORTED_MODULE_1__.DropdownFixWidget
        {
          getDescription() {
            return 'Choose which row or column should be used as the header:';
          }
          constructor(issue, cell, aiEnabled) {
            super(issue, cell, aiEnabled);
          }
          getDefaultDropdownText() {
            return 'Select header type';
          }
          getDropdownOptions() {
            return `
        <div class="dropdown-option" data-value="first-row">
          The first row is a header
        </div>
        <div class="dropdown-option" data-value="first-column">
          The first column is a header
        </div>
        <div class="dropdown-option" data-value="both">
          The first row and column are headers
        </div>
      `;
          }
          shouldShowApplyButton() {
            return true;
          }
          handleOptionSelect(value) {
            var _a, _b;
            this.dropdownText.textContent =
              ((_b =
                (_a = this.dropdownContent.querySelector(
                  `[data-value="${value}"]`
                )) === null || _a === void 0
                  ? void 0
                  : _a.textContent) === null || _b === void 0
                ? void 0
                : _b.trim()) || 'Select header type';
          }
          applyDropdownSelection(headerType) {
            const entireCellContent = this.cell.model.sharedModel.getSource();
            const target = this.issue.issueContentRaw;
            const convertToHeaderCell = cell => {
              // Remove any existing th tags if present
              cell = cell.replace(/<\/?th[^>]*>/g, '');
              // Remove td tags if present
              cell = cell.replace(/<\/?td[^>]*>/g, '');
              // Wrap with th tags
              return `<th>${cell.trim()}</th>`;
            };
            const processTable = tableHtml => {
              const parser = new DOMParser();
              const doc = parser.parseFromString(tableHtml, 'text/html');
              const table = doc.querySelector('table');
              if (!table) {
                return tableHtml;
              }
              // Get all rows, filtering out empty ones
              const rows = Array.from(table.querySelectorAll('tr')).filter(
                row => row.querySelectorAll('td, th').length > 0
              );
              if (rows.length === 0) {
                return tableHtml;
              }
              switch (headerType) {
                case 'first-row': {
                  // Convert first row cells to headers
                  const firstRow = rows[0];
                  const cells = Array.from(firstRow.querySelectorAll('td, th'));
                  cells.forEach(cell => {
                    const newHeader = convertToHeaderCell(cell.innerHTML);
                    cell.outerHTML = newHeader;
                  });
                  break;
                }
                case 'first-column': {
                  // Convert first column cells to headers
                  rows.forEach(row => {
                    const firstCell = row.querySelector('td, th');
                    if (firstCell) {
                      const newHeader = convertToHeaderCell(
                        firstCell.innerHTML
                      );
                      firstCell.outerHTML = newHeader;
                    }
                  });
                  break;
                }
                case 'both': {
                  // Convert both first row and first column
                  rows.forEach((row, rowIndex) => {
                    const cells = Array.from(row.querySelectorAll('td, th'));
                    cells.forEach((cell, cellIndex) => {
                      if (rowIndex === 0 || cellIndex === 0) {
                        const newHeader = convertToHeaderCell(cell.innerHTML);
                        cell.outerHTML = newHeader;
                      }
                    });
                  });
                  break;
                }
              }
              return table.outerHTML;
            };
            const newContent = entireCellContent.replace(
              target,
              processTable(target)
            );
            this.cell.model.sharedModel.setSource(newContent);
            this.removeIssueWidget();
            // Wait a short delay for the cell to update
            setTimeout(async () => {
              var _a, _b;
              if (
                (_a = this.cell.parent) === null || _a === void 0
                  ? void 0
                  : _a.parent
              ) {
                try {
                  // Only analyze table issues
                  const accessibleCells = (0,
                  _adapter_js__WEBPACK_IMPORTED_MODULE_2__.notebookToGeneralCells)(
                    this.cell.parent.parent
                  );
                  const tableIssues = await (0,
                  _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.analyzeTableIssues)(
                    accessibleCells
                  );
                  // Find the main panel widget
                  const mainPanel =
                    (_b = document.querySelector('.a11y-panel')) === null ||
                    _b === void 0
                      ? void 0
                      : _b.closest('.lm-Widget');
                  if (mainPanel) {
                    // Dispatch a custom event with just table issues
                    const event = new CustomEvent('notebookReanalyzed', {
                      detail: {
                        issues: tableIssues,
                        isTableUpdate: true
                      },
                      bubbles: true
                    });
                    mainPanel.dispatchEvent(event);
                  }
                } catch (error) {
                  console.error('Error reanalyzing notebook:', error);
                }
              }
            }, 100); // Small delay to ensure cell content is updated
          }
        }
        class HeadingOrderFixWidget
          extends _base_js__WEBPACK_IMPORTED_MODULE_1__.DropdownFixWidget
        {
          getDescription() {
            return 'Choose from one of the following heading styles instead:';
          }
          // private notebookPanel: NotebookPanel;
          constructor(issue, cell, aiEnabled) {
            super(issue, cell, aiEnabled);
            this._currentLevel = 1; // Initialize with default value
            // Get reference to notebook panel
            // Keep reference in case other methods require it; not used in reanalysis anymore
            // this.notebookPanel = cell.parent?.parent as NotebookPanel;
            // Parse and set the current level immediately
            this._currentLevel = HeadingOrderFixWidget.parseHeadingLevel(
              issue.issueContentRaw
            );
            // Initialize values after super
            this.initializeValues(issue);
            // Setup apply button handler
            if (this.applyButton) {
              this.applyButton.addEventListener('click', async () => {
                if (this.selectedLevel) {
                  this.applyDropdownSelection(`h${this.selectedLevel}`);
                  await this.reanalyzeNotebookAndDispatch();
                }
              });
            }
          }
          shouldShowApplyButton() {
            return true;
          }
          getDefaultDropdownText() {
            return `Current: h${this._currentLevel}`;
          }
          getDropdownOptions() {
            return ''; // Options are set in constructor after initialization
          }
          handleOptionSelect(value) {
            const level = parseInt(value.replace('h', ''));
            this.selectedLevel = level;
            this.dropdownText.textContent = `Change to h${level}`;
            // Hide the dropdown content
            if (this.dropdownContent) {
              this.dropdownContent.classList.add('hidden');
              this.dropdownButton.classList.remove('active');
            }
            // Show the apply button
            if (this.applyButton) {
              this.applyButton.style.display = 'flex';
            }
          }
          applyDropdownSelection(selectedValue) {
            var _a, _b;
            if (!this.selectedLevel) {
              return;
            }
            const entireCellContent = this.cell.model.sharedModel.getSource();
            const target = this.issue.issueContentRaw;
            let newContent = entireCellContent;
            const offsets = (0,
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.getIssueOffsets)(
              this.issue,
              entireCellContent.length
            );
            if (offsets) {
              const { offsetStart, offsetEnd } = offsets;
              const originalSlice = entireCellContent.slice(
                offsetStart,
                offsetEnd
              );
              let replacedSlice = originalSlice;
              // Markdown heading: starts with hashes (allow missing or multiple spaces)
              const mdMatch = originalSlice.match(/^(#{1,6})[ \t]*(.*)$/m);
              if (mdMatch) {
                const headingText = (mdMatch[2] || '').trim();
                const trailingNewline = originalSlice.endsWith('\n')
                  ? '\n'
                  : '';
                replacedSlice = `${'#'.repeat(this.selectedLevel)} ${headingText}${trailingNewline}`;
              } else {
                // HTML heading
                const inner =
                  ((_a = originalSlice.match(
                    /<h\d[^>]*>([\s\S]*?)<\/h\d>/i
                  )) === null || _a === void 0
                    ? void 0
                    : _a[1]) || '';
                replacedSlice = `<h${this.selectedLevel}>${inner}</h${this.selectedLevel}>`;
              }
              newContent = (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.replaceSlice)(
                entireCellContent,
                offsetStart,
                offsetEnd,
                replacedSlice
              );
            } else {
              // Fallback: use previous behavior on entire cell
              if (entireCellContent.trim().startsWith('#')) {
                const currentLevelMatch =
                  entireCellContent.match(/^(#+)[ \t]*/);
                if (currentLevelMatch) {
                  const currentMarkers = currentLevelMatch[1];
                  newContent = entireCellContent.replace(
                    new RegExp(`^${currentMarkers}[ \\t]*(.*)$`, 'm'),
                    `${'#'.repeat(this.selectedLevel)} $1`
                  );
                }
              } else if (target.match(/<h\d[^>]*>/)) {
                newContent = entireCellContent.replace(
                  target,
                  `<h${this.selectedLevel}>${((_b = target.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/)) === null || _b === void 0 ? void 0 : _b[1]) || ''}</h${this.selectedLevel}>`
                );
              }
            }
            if (newContent !== entireCellContent) {
              this.cell.model.sharedModel.setSource(newContent);
              this.removeIssueWidget();
            }
          }
          initializeValues(issue) {
            var _a;
            // Get previous level from metadata
            this.previousLevel =
              (_a = issue.metadata) === null || _a === void 0
                ? void 0
                : _a.previousHeadingLevel;
            // If metadata doesn't have previous level, try to find the closest previous heading
            if (this.previousLevel === undefined) {
              this.previousLevel = this.findClosestPreviousHeading(
                issue.cellIndex
              );
            }
            // Update the dropdown text explicitly after initialization
            if (this.dropdownText) {
              this.dropdownText.textContent = this.getDefaultDropdownText();
            }
            // Force update dropdown content after initialization
            if (this.dropdownContent) {
              const validLevels = this.getValidHeadingLevels();
              this.dropdownContent.innerHTML = Array.from(validLevels)
                .sort((a, b) => a - b)
                .map(
                  level => `
            <div class="dropdown-option" data-value="h${level}">
              Change to h${level}
            </div>
          `
                )
                .join('');
              // Add click handlers to the options
              const options =
                this.dropdownContent.querySelectorAll('.dropdown-option');
              options.forEach(option => {
                option.addEventListener('click', e => {
                  e.stopPropagation();
                  const value = option.dataset.value;
                  if (value) {
                    this.handleOptionSelect(value);
                  }
                });
              });
            }
          }
          // Static helper method to parse heading level
          static parseHeadingLevel(rawContent) {
            // Try HTML heading pattern first
            const htmlMatch = rawContent.match(/<h([1-6])[^>]*>/i);
            if (htmlMatch) {
              const level = parseInt(htmlMatch[1]);
              return level;
            }
            // Try Markdown heading pattern - match # followed by space
            const mdMatch = rawContent.match(/^(#{1,6})\s+/m);
            if (mdMatch) {
              const level = mdMatch[1].length;
              return level;
            }
            return 1; // Default level
          }
          findClosestPreviousHeading(cellIndex) {
            const notebook = this.cell.parent;
            if (!notebook) {
              return undefined;
            }
            // Start from the cell before the current one and go backwards
            for (let i = cellIndex - 1; i >= 0; i--) {
              const prevCell = notebook.widgets[i];
              if (!prevCell || prevCell.model.type !== 'markdown') {
                continue;
              }
              const content = prevCell.model.sharedModel.getSource();
              // Check for markdown heading (# syntax)
              const mdMatch = content.match(/^(#{1,6})\s+/m);
              if (mdMatch) {
                return mdMatch[1].length;
              }
              // Check for HTML heading
              const htmlMatch = content.match(/<h([1-6])[^>]*>/i);
              if (htmlMatch) {
                return parseInt(htmlMatch[1]);
              }
            }
            return undefined;
          }
          getValidHeadingLevels() {
            const validLevels = new Set();
            // Always add h2 as a valid option
            validLevels.add(2);
            if (this.previousLevel !== undefined) {
              // Special case: if previous heading is h1, current heading must be h2
              if (this.previousLevel === 1) {
                return validLevels;
              }
              // Can stay at the same level as the previous heading (but not if it's the current level)
              if (this.previousLevel !== this._currentLevel) {
                validLevels.add(this.previousLevel);
              }
              // Can go exactly one level deeper than the previous heading (but not if it's the current level)
              if (this.previousLevel < 6) {
                const nextLevel = this.previousLevel + 1;
                if (nextLevel !== this._currentLevel) {
                  validLevels.add(nextLevel);
                }
              }
              // Can go exactly one level higher than the previous heading (but not if it's the current level)
              if (this.previousLevel > 1) {
                const prevLevel = this.previousLevel - 1;
                if (prevLevel !== this._currentLevel && prevLevel > 1) {
                  // Also ensure we never include h1
                  validLevels.add(prevLevel);
                }
              }
            }
            return validLevels;
          }
          // Override notebook reanalysis to run heading-wide checks
          async reanalyzeNotebookAndDispatch() {
            var _a;
            const notebookPanel =
              (_a = this.cell.parent) === null || _a === void 0
                ? void 0
                : _a.parent;
            if (!notebookPanel) {
              return;
            }
            setTimeout(async () => {
              var _a;
              const accessibleCells = (0,
              _adapter_js__WEBPACK_IMPORTED_MODULE_2__.notebookToGeneralCells)(
                notebookPanel
              );
              const headingHierarchyIssues = await (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.analyzeHeadingHierarchy)(
                accessibleCells
              );
              const headingOneIssues = await (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.detectHeadingOneIssue)(
                '',
                0,
                'markdown',
                accessibleCells
              );
              const allHeadingIssues = [
                ...headingHierarchyIssues,
                ...headingOneIssues
              ];
              const mainPanel =
                (_a = document.querySelector('.a11y-panel')) === null ||
                _a === void 0
                  ? void 0
                  : _a.closest('.lm-Widget');
              if (mainPanel) {
                const event = new CustomEvent('notebookReanalyzed', {
                  detail: {
                    issues: allHeadingIssues,
                    isHeadingUpdate: true
                  },
                  bubbles: true
                });
                mainPanel.dispatchEvent(event);
              }
            }, 100);
          }
        }

        /***/
      },

    /***/ './lib/components/fix/textfieldFixes.js':
      /*!**********************************************!*\
  !*** ./lib/components/fix/textfieldFixes.js ***!
  \**********************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ HeadingOneFixWidget: () =>
            /* binding */ HeadingOneFixWidget,
          /* harmony export */ ImageAltFixWidget: () =>
            /* binding */ ImageAltFixWidget,
          /* harmony export */ LinkTextFixWidget: () =>
            /* binding */ LinkTextFixWidget,
          /* harmony export */ TableCaptionFixWidget: () =>
            /* binding */ TableCaptionFixWidget
          /* harmony export */
        });
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! @berkeley-dsep-infra/a11y-checker-core */ 'webpack/sharing/consume/default/@berkeley-dsep-infra/a11y-checker-core/@berkeley-dsep-infra/a11y-checker-core'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__
          );
        /* harmony import */ var _base_js__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(/*! ./base.js */ './lib/components/fix/base.js');

        class ImageAltFixWidget
          extends _base_js__WEBPACK_IMPORTED_MODULE_1__.TextFieldFixWidget
        {
          getDescription() {
            return 'Add or update alt text for the image:';
          }
          constructor(issue, cell, aiEnabled, visionSettings) {
            super(issue, cell, aiEnabled);
            this.visionSettings = visionSettings;
          }
          async applyTextToCell(providedAltText) {
            var _a, _b;
            if (providedAltText === '') {
              return;
            }
            const entireCellContent = this.cell.model.sharedModel.getSource();
            const target = this.issue.issueContentRaw;
            // Try to parse deterministic offsets from metadata.issueId (format: cell-{idx}-image-missing-alt-o{start}-{end})
            const offsets = (0,
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.getIssueOffsets)(
              this.issue,
              entireCellContent.length
            );
            const offsetStart =
              (_a =
                offsets === null || offsets === void 0
                  ? void 0
                  : offsets.offsetStart) !== null && _a !== void 0
                ? _a
                : null;
            const offsetEnd =
              (_b =
                offsets === null || offsets === void 0
                  ? void 0
                  : offsets.offsetEnd) !== null && _b !== void 0
                ? _b
                : null;
            // Offsets are already validated in getIssueOffsets
            // Handle HTML image tags
            const handleHtmlImage = imageText => {
              // Alt attribute exists but is empty
              if (
                imageText.includes('alt=""') ||
                imageText.includes("alt=''")
              ) {
                return imageText.replace(
                  /alt=["']\s*["']/,
                  `alt = "${providedAltText}"`
                );
              }
              // Alt attribute does not exist
              return imageText.replace(
                /\s*\/?>(?=$)/,
                ` alt = "${providedAltText}"$ & `
              );
            };
            // Handle markdown images
            const handleMarkdownImage = imageText => {
              return imageText.replace(/!\[\]/, `![${providedAltText}]`);
            };
            let newContent = entireCellContent;
            if (offsetStart !== null && offsetEnd !== null) {
              const originalSlice = entireCellContent.slice(
                offsetStart,
                offsetEnd
              );
              let replacedSlice = originalSlice;
              if (originalSlice.startsWith('<img')) {
                replacedSlice = handleHtmlImage(originalSlice);
              } else if (originalSlice.startsWith('![')) {
                replacedSlice = handleMarkdownImage(originalSlice);
              }
              newContent = (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.replaceSlice)(
                entireCellContent,
                offsetStart,
                offsetEnd,
                replacedSlice
              );
            } else {
              // Fallback to previous behavior using the captured target
              if (target.startsWith('<img')) {
                newContent = entireCellContent.replace(
                  target,
                  handleHtmlImage(target)
                );
              } else if (target.startsWith('![')) {
                newContent = entireCellContent.replace(
                  target,
                  handleMarkdownImage(target)
                );
              }
            }
            this.cell.model.sharedModel.setSource(newContent);
            // Remove the issue widget
            this.removeIssueWidget();
            await this.reanalyzeCellAndDispatch();
          }
          async displayAISuggestions() {
            var _a;
            const altTextInput = this.node.querySelector('.jp-a11y-input');
            if (!altTextInput) {
              return;
            }
            // Save the original placeholder text
            const originalPlaceholder = altTextInput.placeholder;
            // Create loading overlay (so we can see the loading state)
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
        <span class="material-icons loading">refresh</span>
        Getting AI suggestions...
`;
            // Add relative positioning to input container and append loading overlay
            const inputContainer = altTextInput.parentElement;
            if (inputContainer) {
              inputContainer.style.position = 'relative';
              inputContainer.appendChild(loadingOverlay);
            }
            // Show loading state in the input
            altTextInput.disabled = true;
            altTextInput.style.color = 'transparent'; // Hide input text while loading
            altTextInput.placeholder = ''; // Clear placeholder while showing loading overlay
            try {
              const suggestion = await (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.getImageAltSuggestion)(
                this.issue,
                ((_a = this.cell.node.querySelector('img')) === null ||
                _a === void 0
                  ? void 0
                  : _a.src) || '',
                this.visionSettings
              );
              if (suggestion !== 'Error') {
                // Extract alt text from the suggestion, handling both single and double quotes
                const altMatch = suggestion.match(/alt=['"]([^'"]*)['"]/);
                if (altMatch && altMatch[1]) {
                  altTextInput.value = altMatch[1];
                } else {
                  altTextInput.value = suggestion; // Fallback to full suggestion if no alt text found
                }
              } else {
                altTextInput.placeholder =
                  'Error getting suggestions. Please try again.';
              }
            } catch (error) {
              console.error(error);
              altTextInput.placeholder =
                'Error getting suggestions. Please try again.';
            } finally {
              altTextInput.disabled = false;
              altTextInput.style.color = ''; // Restore text color
              loadingOverlay.remove(); // Remove loading overlay
              if (altTextInput.value) {
                altTextInput.placeholder = originalPlaceholder;
              }
            }
          }
        }
        class TableCaptionFixWidget
          extends _base_js__WEBPACK_IMPORTED_MODULE_1__.TextFieldFixWidget
        {
          getDescription() {
            return 'Add or update the caption for the table:';
          }
          constructor(issue, cell, aiEnabled, languageSettings) {
            super(issue, cell, aiEnabled);
            this.languageSettings = languageSettings;
          }
          async applyTextToCell(providedCaption) {
            if (providedCaption === '') {
              return;
            }
            const entireCellContent = this.cell.model.sharedModel.getSource();
            const target = this.issue.issueContentRaw;
            const handleHtmlTable = tableHtml => {
              // Check if table already has a caption
              if (tableHtml.includes('<caption>')) {
                return tableHtml.replace(
                  /<caption>.*?<\/caption>/,
                  `< caption > ${providedCaption} </caption>`
                );
              } else {
                return tableHtml.replace(
                  /<table[^>]*>/,
                  `$&\n  <caption>${providedCaption}</caption>`
                );
              }
            };
            let newContent = entireCellContent;
            if (target.includes('<table')) {
              const offsets = (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.getIssueOffsets)(
                this.issue,
                entireCellContent.length
              );
              if (offsets) {
                const { offsetStart, offsetEnd } = offsets;
                const originalSlice = entireCellContent.slice(
                  offsetStart,
                  offsetEnd
                );
                const replacedSlice = handleHtmlTable(originalSlice);
                newContent = (0,
                _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.replaceSlice)(
                  entireCellContent,
                  offsetStart,
                  offsetEnd,
                  replacedSlice
                );
              } else {
                // Fallback to previous behavior
                newContent = entireCellContent.replace(
                  target,
                  handleHtmlTable(target)
                );
              }
            }
            this.cell.model.sharedModel.setSource(newContent);
            // Remove the issue widget
            this.removeIssueWidget();
            await this.reanalyzeCellAndDispatch();
          }
          async displayAISuggestions() {
            const captionInput = this.node.querySelector('.jp-a11y-input');
            if (!captionInput) {
              return;
            }
            // Save the original placeholder text
            const originalPlaceholder = captionInput.placeholder;
            // Create loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
            <span class="material-icons loading">refresh</span>
            Getting AI suggestions...
        `;
            // Add relative positioning to input container and append loading overlay
            const inputContainer = captionInput.parentElement;
            if (inputContainer) {
              inputContainer.style.position = 'relative';
              inputContainer.appendChild(loadingOverlay);
            }
            // Show loading state in the input
            captionInput.disabled = true;
            captionInput.style.color = 'transparent';
            captionInput.placeholder = '';
            try {
              const suggestion = await (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.getTableCaptionSuggestion)(
                this.issue,
                this.languageSettings
              );
              if (suggestion !== 'Error') {
                captionInput.value = suggestion;
              } else {
                captionInput.placeholder =
                  'Error getting suggestions. Please try again.';
              }
            } catch (error) {
              console.error(error);
              captionInput.placeholder =
                'Error getting suggestions. Please try again.';
            } finally {
              captionInput.disabled = false;
              captionInput.style.color = '';
              loadingOverlay.remove();
              if (captionInput.value) {
                captionInput.placeholder = originalPlaceholder;
              }
            }
          }
        }
        class HeadingOneFixWidget
          extends _base_js__WEBPACK_IMPORTED_MODULE_1__.TextFieldFixWidget
        {
          getDescription() {
            return 'Add a new level one (h1) heading to the top of the notebook:';
          }
          constructor(issue, cell, aiEnabled) {
            super(issue, cell, aiEnabled);
            const input = this.node.querySelector('.jp-a11y-input');
            if (input) {
              input.placeholder = 'Input h1 heading text...';
            }
            // Always disable AI suggestion for missing H1 heading
            const suggestButton = this.node.querySelector('.suggest-button');
            if (suggestButton) {
              suggestButton.remove();
            }
          }
          removeIssueWidget() {
            var _a;
            const issueWidget = this.node.closest('.issue-widget');
            if (issueWidget) {
              const category = issueWidget.closest('.category');
              issueWidget.remove();
              if (category && !category.querySelector('.issue-widget')) {
                category.remove();
              }
            }
            // Highlight the first cell instead of the current cell
            const notebookPanel =
              (_a = this.cell.parent) === null || _a === void 0
                ? void 0
                : _a.parent;
            if (notebookPanel) {
              const firstCell = notebookPanel.content.widgets[0];
              if (firstCell) {
                firstCell.node.style.transition = 'background-color 0.5s ease';
                firstCell.node.style.backgroundColor = '#28A745';
                setTimeout(() => {
                  firstCell.node.style.backgroundColor = '';
                }, 1000);
              }
            }
          }
          applyTextToCell(providedHeading) {
            var _a, _b;
            if (providedHeading === '') {
              return;
            }
            // Get the notebook panel from the cell's parent hierarchy
            const notebookPanel =
              (_a = this.cell.parent) === null || _a === void 0
                ? void 0
                : _a.parent;
            if (!notebookPanel) {
              console.error('Could not find notebook panel');
              return;
            }
            // Create a new markdown cell with the h1 heading
            const newContent = `# ${providedHeading}`;
            // Insert a new cell at the top of the notebook
            const sharedModel =
              (_b = notebookPanel.content.model) === null || _b === void 0
                ? void 0
                : _b.sharedModel;
            if (sharedModel) {
              sharedModel.insertCell(0, {
                cell_type: 'markdown',
                source: newContent
              });
            }
            // Remove the issue widget
            this.removeIssueWidget();
          }
          async displayAISuggestions() {
            const headingInput = this.node.querySelector('.jp-a11y-input');
            if (!headingInput) {
              return;
            }
            // Save the original placeholder text
            const originalPlaceholder = headingInput.placeholder;
            // Create loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
        <span class="material-icons loading">refresh</span>
        Getting AI suggestions...
      `;
            // Add relative positioning to input container and append loading overlay
            const inputContainer = headingInput.parentElement;
            if (inputContainer) {
              inputContainer.style.position = 'relative';
              inputContainer.appendChild(loadingOverlay);
            }
            // Show loading state in the input
            headingInput.disabled = true;
            headingInput.style.color = 'transparent';
            headingInput.placeholder = '';
            try {
              // TODO: Implement AI suggestion??? Is it needed?
              headingInput.value = 'Notebook Title';
            } catch (error) {
              console.error(error);
              headingInput.placeholder =
                'Error getting suggestions. Please try again.';
            } finally {
              headingInput.disabled = false;
              headingInput.style.color = '';
              loadingOverlay.remove();
              if (headingInput.value) {
                headingInput.placeholder = originalPlaceholder;
              }
            }
          }
        }
        class LinkTextFixWidget
          extends _base_js__WEBPACK_IMPORTED_MODULE_1__.TextFieldFixWidget
        {
          getDescription() {
            return 'Update the link text or aria-label:';
          }
          applyTextToCell(providedText) {
            var _a, _b;
            if (providedText === '') {
              return;
            }
            const entireCellContent = this.cell.model.sharedModel.getSource();
            const offsets = (0,
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.getIssueOffsets)(
              this.issue,
              entireCellContent.length
            );
            const offsetStart =
              (_a =
                offsets === null || offsets === void 0
                  ? void 0
                  : offsets.offsetStart) !== null && _a !== void 0
                ? _a
                : null;
            const offsetEnd =
              (_b =
                offsets === null || offsets === void 0
                  ? void 0
                  : offsets.offsetEnd) !== null && _b !== void 0
                ? _b
                : null;
            let newContent = entireCellContent;
            const replaceMarkdownLinkText = full => {
              return full.replace(/\[[^\]]*\]/, `[${providedText}]`);
            };
            const replaceHtmlLinkTextOrAria = full => {
              if (/aria-label=/.test(full)) {
                return full.replace(
                  /aria-label=["'].*?["']/i,
                  `aria-label="${providedText}"`
                );
              }
              // If there is no aria-label and no visible inner text, add aria-label
              const innerText = (
                full.replace(/<a\b[^>]*>/i, '').replace(/<\/a>/i, '') || ''
              )
                .replace(/<[^>]*>/g, '')
                .trim();
              if (innerText.length === 0) {
                return full.replace(
                  /<a\b([^>]*)>/i,
                  (_m, attrs) => `<a${attrs} aria-label="${providedText}">`
                );
              }
              // Otherwise, replace inner text
              return full.replace(
                /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/i,
                (_m, pre, _inner, post) => `${pre}${providedText}${post}`
              );
            };
            if (offsetStart !== null && offsetEnd !== null) {
              const originalSlice = entireCellContent.slice(
                offsetStart,
                offsetEnd
              );
              let replacedSlice = originalSlice;
              if (originalSlice.trim().startsWith('<a')) {
                replacedSlice = replaceHtmlLinkTextOrAria(originalSlice);
              } else if (originalSlice.trim().startsWith('[')) {
                replacedSlice = replaceMarkdownLinkText(originalSlice);
              }
              newContent = (0,
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_0__.replaceSlice)(
                entireCellContent,
                offsetStart,
                offsetEnd,
                replacedSlice
              );
            } else {
              const target = this.issue.issueContentRaw;
              if (target.trim().startsWith('<a')) {
                newContent = entireCellContent.replace(
                  target,
                  replaceHtmlLinkTextOrAria(target)
                );
              } else if (target.trim().startsWith('[')) {
                newContent = entireCellContent.replace(
                  target,
                  replaceMarkdownLinkText(target)
                );
              }
            }
            this.cell.model.sharedModel.setSource(newContent);
            this.removeIssueWidget();
            void this.reanalyzeCellAndDispatch();
          }
          async displayAISuggestions() {
            // Not implemented for links today
            return;
          }
        }

        /***/
      },

    /***/ './lib/components/issueWidget.js':
      /*!***************************************!*\
  !*** ./lib/components/issueWidget.js ***!
  \***************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ CellIssueWidget: () =>
            /* binding */ CellIssueWidget
          /* harmony export */
        });
        /* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! @lumino/widgets */ 'webpack/sharing/consume/default/@lumino/widgets'
          );
        /* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__
          );
        /* harmony import */ var _fix__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            /*! ./fix */ './lib/components/fix/textfieldFixes.js'
          );
        /* harmony import */ var _fix__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            /*! ./fix */ './lib/components/fix/dropdownFixes.js'
          );
        /* harmony import */ var _fix__WEBPACK_IMPORTED_MODULE_4__ =
          __webpack_require__(
            /*! ./fix */ './lib/components/fix/buttonFixes.js'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(
            /*! @berkeley-dsep-infra/a11y-checker-core */ 'webpack/sharing/consume/default/@berkeley-dsep-infra/a11y-checker-core/@berkeley-dsep-infra/a11y-checker-core'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_1___default =
          /*#__PURE__*/ __webpack_require__.n(
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_1__
          );

        class CellIssueWidget
          extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget
        {
          constructor(issue, cell, aiEnabled, mainPanel) {
            var _a;
            super();
            this.aiEnabled = false; // TODO: Create a higher order component to handle this
            this.issue = issue;
            this.cell = cell;
            this.aiEnabled = aiEnabled;
            this.mainPanel = mainPanel;
            const issueInformation =
              _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_1__.issueToDescription.get(
                issue.violationId
              );
            if (issue.customDescription) {
              issueInformation.description = issue.customDescription;
            }
            if (issue.customDetailedDescription) {
              issueInformation.detailedDescription =
                issue.customDetailedDescription;
            }
            this.addClass('issue-widget');
            // Tag widget with identifiers so the panel can selectively update
            this.node.setAttribute('data-cell-index', String(issue.cellIndex));
            this.node.setAttribute('data-violation-id', issue.violationId);
            this.node.innerHTML = `
      <button class="issue-header-button">
          <h3 class="issue-header"> ${(issueInformation === null || issueInformation === void 0 ? void 0 : issueInformation.title) || issue.violationId}</h3>
          <span class="chevron material-icons">expand_more</span>
      </button>
      <div class="collapsible-content" style="display: none;">
          <p class="description">
              ${issueInformation === null || issueInformation === void 0 ? void 0 : issueInformation.description}
          </p>
          <p class="detailed-description" style="display: none;">
              ${(issueInformation === null || issueInformation === void 0 ? void 0 : issueInformation.detailedDescription) || ''} (<a href="${(issueInformation === null || issueInformation === void 0 ? void 0 : issueInformation.descriptionUrl) || ''}" target="_blank">learn more about the issue and its impact</a>).
          </p>
          <div class="button-container">
              <button class="jp-Button2 locate-button">
                  <span class="material-icons">search</span>
                  <div>Locate</div>
              </button>
              <button class="jp-Button2 explain-button">
                  <span class="material-icons">question_mark</span>
                  <div>Learn more</div>
              </button>
          </div>
          <div class="offending-content-block">
              <div class="offending-title">Original content:</div>
              <pre class="offending-snippet" style="white-space: pre-wrap; max-height: 200px; overflow: auto; background: var(--jp-layout-color2); padding: 8px; border-radius: 4px; border: 1px solid var(--jp-border-color2);"></pre>
          </div>
          <div class="fix-widget-container"></div>
      </div>
    `;
            // Add event listeners using query selectors
            const headerButton = this.node.querySelector(
              '.issue-header-button'
            );
            const collapsibleContent = this.node.querySelector(
              '.collapsible-content'
            );
            // Toggle collapsible content when header is clicked
            headerButton === null || headerButton === void 0
              ? void 0
              : headerButton.addEventListener('click', () => {
                  if (collapsibleContent) {
                    const isHidden =
                      collapsibleContent.style.display === 'none';
                    collapsibleContent.style.display = isHidden
                      ? 'block'
                      : 'none';
                    const expandIcon = this.node.querySelector('.chevron');
                    expandIcon === null || expandIcon === void 0
                      ? void 0
                      : expandIcon.classList.toggle('expanded');
                  }
                });
            const locateButton = this.node.querySelector('.locate-button');
            locateButton === null || locateButton === void 0
              ? void 0
              : locateButton.addEventListener('click', () =>
                  this.navigateToCell()
                );
            const explainButton = this.node.querySelector('.explain-button');
            const detailedDescription = this.node.querySelector(
              '.detailed-description'
            );
            explainButton === null || explainButton === void 0
              ? void 0
              : explainButton.addEventListener('click', () => {
                  if (detailedDescription) {
                    detailedDescription.style.display =
                      detailedDescription.style.display === 'none'
                        ? 'block'
                        : 'none';
                  }
                });
            // Populate offending content as plain text (not rendered)
            const offendingSnippet =
              this.node.querySelector('.offending-snippet');
            if (offendingSnippet) {
              offendingSnippet.textContent = `${this.issue.issueContentRaw || ''}`;
            }
            // Show suggest button initially if AI is enabled
            const mainPanelElement = document.getElementById('a11y-sidebar');
            if (mainPanelElement) {
              const aiToggleButton =
                mainPanelElement.querySelector('.ai-control-button');
              if (
                aiToggleButton &&
                ((_a = aiToggleButton.textContent) === null || _a === void 0
                  ? void 0
                  : _a.includes('Enabled'))
              ) {
                this.aiEnabled = true;
              } else {
                this.aiEnabled = false;
              }
            }
            // Dynamically add the TextFieldFixWidget if needed
            const fixWidgetContainer = this.node.querySelector(
              '.fix-widget-container'
            );
            if (!fixWidgetContainer) {
              return;
            }
            if (this.issue.violationId === 'image-missing-alt') {
              const textFieldFixWidget =
                new _fix__WEBPACK_IMPORTED_MODULE_2__.ImageAltFixWidget(
                  this.issue,
                  this.cell,
                  this.aiEnabled,
                  this.mainPanel.getVisionModelSettings()
                );
              fixWidgetContainer.appendChild(textFieldFixWidget.node);
            } else if (this.issue.violationId === 'table-missing-caption') {
              const tableCaptionFixWidget =
                new _fix__WEBPACK_IMPORTED_MODULE_2__.TableCaptionFixWidget(
                  this.issue,
                  this.cell,
                  this.aiEnabled,
                  this.mainPanel.getLanguageModelSettings()
                );
              fixWidgetContainer.appendChild(tableCaptionFixWidget.node);
            } else if (this.issue.violationId === 'table-missing-header') {
              const tableHeaderFixWidget =
                new _fix__WEBPACK_IMPORTED_MODULE_3__.TableHeaderFixWidget(
                  this.issue,
                  this.cell,
                  this.aiEnabled
                );
              fixWidgetContainer.appendChild(tableHeaderFixWidget.node);
            } else if (this.issue.violationId === 'heading-missing-h1') {
              const headingOneFixWidget =
                new _fix__WEBPACK_IMPORTED_MODULE_2__.HeadingOneFixWidget(
                  this.issue,
                  this.cell,
                  this.aiEnabled
                );
              fixWidgetContainer.appendChild(headingOneFixWidget.node);
            } else if (this.issue.violationId === 'heading-wrong-order') {
              const headingOrderFixWidget =
                new _fix__WEBPACK_IMPORTED_MODULE_3__.HeadingOrderFixWidget(
                  this.issue,
                  this.cell,
                  this.aiEnabled
                );
              fixWidgetContainer.appendChild(headingOrderFixWidget.node);
            } else if (this.issue.violationId === 'table-missing-scope') {
              const tableScopeFixWidget =
                new _fix__WEBPACK_IMPORTED_MODULE_4__.TableScopeFixWidget(
                  this.issue,
                  this.cell,
                  this.aiEnabled
                );
              fixWidgetContainer.appendChild(tableScopeFixWidget.node);
            } else if (this.issue.violationId === 'link-discernible-text') {
              const linkTextFixWidget =
                new _fix__WEBPACK_IMPORTED_MODULE_2__.LinkTextFixWidget(
                  this.issue,
                  this.cell,
                  this.aiEnabled
                );
              fixWidgetContainer.appendChild(linkTextFixWidget.node);
            }
          }
          navigateToCell() {
            this.cell.node.scrollIntoView({
              behavior: 'auto',
              block: 'nearest'
            });
            requestAnimationFrame(() => {
              this.cell.node.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            });
            this.cell.node.style.transition = 'background-color 0.5s ease';
            this.cell.node.style.backgroundColor = '#DB3939';
            setTimeout(() => {
              this.cell.node.style.backgroundColor = '';
            }, 1000);
          }
        }

        /***/
      },

    /***/ './lib/components/mainpanelWidget.js':
      /*!*******************************************!*\
  !*** ./lib/components/mainpanelWidget.js ***!
  \*******************************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ MainPanelWidget: () =>
            /* binding */ MainPanelWidget
          /* harmony export */
        });
        /* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! @lumino/widgets */ 'webpack/sharing/consume/default/@lumino/widgets'
          );
        /* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__
          );
        /* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(
            /*! @jupyterlab/ui-components */ 'webpack/sharing/consume/default/@jupyterlab/ui-components'
          );
        /* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_1___default =
          /*#__PURE__*/ __webpack_require__.n(
            _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_1__
          );
        /* harmony import */ var _image_processor_js__WEBPACK_IMPORTED_MODULE_5__ =
          __webpack_require__(
            /*! ../image-processor.js */ './lib/image-processor.js'
          );
        /* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            /*! @jupyterlab/coreutils */ 'webpack/sharing/consume/default/@jupyterlab/coreutils'
          );
        /* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_2___default =
          /*#__PURE__*/ __webpack_require__.n(
            _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_2__
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            /*! @berkeley-dsep-infra/a11y-checker-core */ 'webpack/sharing/consume/default/@berkeley-dsep-infra/a11y-checker-core/@berkeley-dsep-infra/a11y-checker-core'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3___default =
          /*#__PURE__*/ __webpack_require__.n(
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__
          );
        /* harmony import */ var _issueWidget_js__WEBPACK_IMPORTED_MODULE_6__ =
          __webpack_require__(
            /*! ./issueWidget.js */ './lib/components/issueWidget.js'
          );
        /* harmony import */ var _adapter_js__WEBPACK_IMPORTED_MODULE_4__ =
          __webpack_require__(/*! ../adapter.js */ './lib/adapter.js');

        class MainPanelWidget
          extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget
        {
          constructor(settingRegistry) {
            super();
            this.aiEnabled = false;
            this.currentNotebook = null;
            // Default settings
            this.languageModelSettings = {
              baseUrl: '',
              apiKey: '',
              model: ''
            };
            this.visionModelSettings = {
              baseUrl: '',
              apiKey: '',
              model: ''
            };
            // Load settings if available
            if (settingRegistry) {
              this.loadSettings(settingRegistry);
            }
            this.addClass('a11y-panel');
            this.id = 'a11y-sidebar';
            const accessibilityIcon =
              new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_1__.LabIcon(
                {
                  name: 'a11y:accessibility',
                  svgstr:
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#154F92" d="M256 48c114.953 0 208 93.029 208 208 0 114.953-93.029 208-208 208-114.953 0-208-93.029-208-208 0-114.953 93.029-208 208-208m0-40C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 56C149.961 64 64 149.961 64 256s85.961 192 192 192 192-85.961 192-192S362.039 64 256 64zm0 44c19.882 0 36 16.118 36 36s-16.118 36-36 36-36-16.118-36-36 16.118-36 36-36zm117.741 98.023c-28.712 6.779-55.511 12.748-82.14 15.807.851 101.023 12.306 123.052 25.037 155.621 3.617 9.26-.957 19.698-10.217 23.315-9.261 3.617-19.699-.957-23.316-10.217-8.705-22.308-17.086-40.636-22.261-78.549h-9.686c-5.167 37.851-13.534 56.208-22.262 78.549-3.615 9.255-14.05 13.836-23.315 10.217-9.26-3.617-13.834-14.056-10.217-23.315 12.713-32.541 24.185-54.541 25.037-155.621-26.629-3.058-53.428-9.027-82.141-15.807-8.6-2.031-13.926-10.648-11.895-19.249s10.647-13.926 19.249-11.895c96.686 22.829 124.283 22.783 220.775 0 8.599-2.03 17.218 3.294 19.249 11.895 2.029 8.601-3.297 17.219-11.897 19.249z"/></svg>'
                }
              );
            this.title.icon = accessibilityIcon;
            this.node.innerHTML = `
      <div class="main-container">
          <div class="notice-container">
              <div class="notice-header">
                  <div class="notice-title">
                      <span class="chevron material-icons">expand_more</span>
                      <strong>Notice: Known cell navigation error </strong>
                  </div>
                  <button class="notice-delete-button">✕</button>
              </div>
              <div class="notice-content hidden">
                  <p>
                      The jupyterlab-a11y-checker has a known cell navigation issue for Jupyterlab version 4.2.5 or later. 
                      To fix this, please navigate to 'Settings' → 'Settings Editor' → Notebook, scroll down to 'Windowing mode', 
                      and choose 'defer' from the dropdown. Please note that this option may reduce the performance of the application. 
                      For more information, please see the <a href="https://jupyter-notebook.readthedocs.io/en/stable/changelog.html" target="_blank" style="text-decoration: underline;">Jupyter Notebook changelog.</a>
                  </p>
              </div>
          </div>
          <h1 class="main-title">Accessibility Checker</h1>
          <div class="controls-container">
              <button class="control-button ai-control-button">
                <span class="material-icons">auto_awesome</span>
                Use AI : Disabled
              </button>
              <button class="control-button analyze-control-button">
                <span class="material-icons">science</span>  
                Analyze Notebook
              </button>
          </div>
          <div class="issues-container"></div>
      </div>
        `;
            // Notice
            const noticeContainer =
              this.node.querySelector('.notice-container');
            const noticeContent = this.node.querySelector('.notice-content');
            const noticeToggleButton = this.node.querySelector('.notice-title');
            const noticeDeleteButton = this.node.querySelector(
              '.notice-delete-button'
            );
            const expandIcon = this.node.querySelector('.chevron');
            noticeToggleButton === null || noticeToggleButton === void 0
              ? void 0
              : noticeToggleButton.addEventListener('click', () => {
                  noticeContent === null || noticeContent === void 0
                    ? void 0
                    : noticeContent.classList.toggle('hidden');
                  expandIcon === null || expandIcon === void 0
                    ? void 0
                    : expandIcon.classList.toggle('expanded');
                });
            noticeDeleteButton === null || noticeDeleteButton === void 0
              ? void 0
              : noticeDeleteButton.addEventListener('click', () => {
                  noticeContainer === null || noticeContainer === void 0
                    ? void 0
                    : noticeContainer.classList.add('hidden');
                });
            // Controls
            const aiControlButton =
              this.node.querySelector('.ai-control-button');
            const analyzeControlButton = this.node.querySelector(
              '.analyze-control-button'
            );
            const progressIcon = `
    <svg class="icon loading" viewBox="0 0 24 24">
        <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z"/>
    </svg>
    `;
            aiControlButton === null || aiControlButton === void 0
              ? void 0
              : aiControlButton.addEventListener('click', async () => {
                  const aiIcon =
                    '<span class="material-icons">auto_awesome</span>';
                  this.aiEnabled = !this.aiEnabled;
                  aiControlButton.innerHTML = `${aiIcon} Use AI : ${this.aiEnabled ? 'Enabled' : 'Disabled'}`;
                  // Update every ai suggestion button visibility
                  const suggestButtons =
                    this.node.querySelectorAll('.suggest-button');
                  suggestButtons.forEach(button => {
                    button.style.display = this.aiEnabled ? 'flex' : 'none';
                  });
                });
            analyzeControlButton === null || analyzeControlButton === void 0
              ? void 0
              : analyzeControlButton.addEventListener('click', async () => {
                  if (!this.currentNotebook) {
                    console.log('No current notebook found');
                    return;
                  }
                  const analyzeControlButtonText =
                    analyzeControlButton.innerHTML;
                  const issuesContainer =
                    this.node.querySelector('.issues-container');
                  issuesContainer.innerHTML = '';
                  analyzeControlButton.innerHTML = `${progressIcon} Please wait...`;
                  analyzeControlButton.disabled = true;
                  try {
                    // Convert widgets to accessible cells
                    const accessibleCells = (0,
                    _adapter_js__WEBPACK_IMPORTED_MODULE_4__.notebookToGeneralCells)(
                      this.currentNotebook
                    );
                    // Identify issues
                    const notebookIssues = await (0,
                    _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__.analyzeCellsAccessibility)(
                      accessibleCells,
                      document,
                      _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_2__.PageConfig.getBaseUrl(),
                      new _image_processor_js__WEBPACK_IMPORTED_MODULE_5__.BrowserImageProcessor(),
                      this.currentNotebook.context.path
                    );
                    // Log a human-readable summary for troubleshooting
                    try {
                      const total = notebookIssues.length;
                      const byViolation = notebookIssues.reduce(
                        (acc, issue) => {
                          acc[issue.violationId] =
                            (acc[issue.violationId] || 0) + 1;
                          return acc;
                        },
                        {}
                      );
                      const cellsAffected = Array.from(
                        new Set(notebookIssues.map(i => i.cellIndex))
                      ).length;
                      const lines = [];
                      lines.push('A11Y Analysis Summary');
                      lines.push(`- Total issues: ${total}`);
                      lines.push(`- Cells affected: ${cellsAffected}`);
                      const allViolations = Object.entries(byViolation)
                        .sort((a, b) => b[1] - a[1])
                        .map(([v, c]) => `  - ${v}: ${c}`);
                      if (allViolations.length) {
                        lines.push('- Violations:');
                        lines.push(...allViolations);
                      }
                      console.log(lines.join('\n'));
                    } catch (_a) {
                      console.log('Summary Unavailable');
                    }
                    if (notebookIssues.length === 0) {
                      issuesContainer.innerHTML =
                        '<div class="no-issues">No issues found</div>';
                      return;
                    }
                    // Group issues by category
                    const issuesByCategory = new Map();
                    notebookIssues.forEach(notebookIssue => {
                      const categoryName =
                        _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__.issueToCategory.get(
                          notebookIssue.violationId
                        ) || 'Other';
                      if (!issuesByCategory.has(categoryName)) {
                        issuesByCategory.set(categoryName, []);
                      }
                      issuesByCategory.get(categoryName).push(notebookIssue);
                    });
                    // Create widgets for each category
                    for (const categoryName of _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__.issueCategoryNames) {
                      const categoryIssues =
                        issuesByCategory.get(categoryName) || [];
                      if (categoryIssues.length === 0) {
                        continue;
                      }
                      const categoryWidget = document.createElement('div');
                      categoryWidget.classList.add('category');
                      categoryWidget.innerHTML = `
            <h2 class="category-title">${categoryName}</h2>
            <hr>
            <div class="issues-list"></div>
          `;
                      const issuesContainer =
                        this.node.querySelector('.issues-container');
                      issuesContainer.appendChild(categoryWidget);
                      const issuesList =
                        categoryWidget.querySelector('.issues-list');
                      categoryIssues.forEach(issue => {
                        const issueWidget =
                          new _issueWidget_js__WEBPACK_IMPORTED_MODULE_6__.CellIssueWidget(
                            issue,
                            this.currentNotebook.content.widgets[
                              issue.cellIndex
                            ],
                            this.aiEnabled,
                            this
                          );
                        issuesList.appendChild(issueWidget.node);
                      });
                    }
                  } catch (error) {
                    issuesContainer.innerHTML = '';
                    console.error('Error analyzing notebook:', error);
                  } finally {
                    analyzeControlButton.innerHTML = analyzeControlButtonText;
                    analyzeControlButton.disabled = false;
                  }
                });
            // Add event listener for notebookReanalyzed event
            // Listen on both the panel node and document to ensure we catch bubbled events
            const handler = async event => {
              var _a, _b, _c;
              const customEvent = event;
              const newIssues = customEvent.detail.issues;
              const isHeadingUpdate = customEvent.detail.isHeadingUpdate;
              const isTableUpdate = customEvent.detail.isTableUpdate;
              const isCellUpdate = customEvent.detail.isCellUpdate;
              if (isHeadingUpdate) {
                // Find the Headings category section
                const headingsCategory =
                  (_a = Array.from(
                    this.node.querySelectorAll('.category-title')
                  ).find(title => title.textContent === 'Headings')) === null ||
                  _a === void 0
                    ? void 0
                    : _a.closest('.category');
                if (headingsCategory) {
                  // Clear only the issues list in the Headings section
                  const issuesList =
                    headingsCategory.querySelector('.issues-list');
                  if (issuesList) {
                    issuesList.innerHTML = '';
                    // Add new heading issues to this section
                    newIssues.forEach(issue => {
                      const issueWidget =
                        new _issueWidget_js__WEBPACK_IMPORTED_MODULE_6__.CellIssueWidget(
                          issue,
                          this.currentNotebook.content.widgets[issue.cellIndex],
                          this.aiEnabled,
                          this
                        );
                      issuesList.appendChild(issueWidget.node);
                    });
                  }
                }
              } else if (isTableUpdate) {
                // Find the Tables category section
                const tablesCategory =
                  (_b = Array.from(
                    this.node.querySelectorAll('.category-title')
                  ).find(title => title.textContent === 'Tables')) === null ||
                  _b === void 0
                    ? void 0
                    : _b.closest('.category');
                if (tablesCategory) {
                  // Clear only the issues list in the Tables section
                  const issuesList =
                    tablesCategory.querySelector('.issues-list');
                  if (issuesList) {
                    issuesList.innerHTML = '';
                    // Reanalyze table issues
                    const accessibleCells = (0,
                    _adapter_js__WEBPACK_IMPORTED_MODULE_4__.notebookToGeneralCells)(
                      this.currentNotebook
                    );
                    const tableIssues = await (0,
                    _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__.analyzeTableIssues)(
                      accessibleCells
                    );
                    // Add new table issues to this section
                    tableIssues.forEach(issue => {
                      const issueWidget =
                        new _issueWidget_js__WEBPACK_IMPORTED_MODULE_6__.CellIssueWidget(
                          issue,
                          this.currentNotebook.content.widgets[issue.cellIndex],
                          this.aiEnabled,
                          this
                        );
                      issuesList.appendChild(issueWidget.node);
                    });
                  }
                }
              } else if (isCellUpdate) {
                // Single-cell update: replace only issues from impacted cell(s) per category
                const incomingIssues = newIssues;
                const issuesByCategory = new Map();
                incomingIssues.forEach(issue => {
                  const categoryName =
                    _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__.issueToCategory.get(
                      issue.violationId
                    ) || 'Other';
                  if (!issuesByCategory.has(categoryName)) {
                    issuesByCategory.set(categoryName, []);
                  }
                  issuesByCategory.get(categoryName).push(issue);
                });
                for (const [categoryName, categoryIssues] of issuesByCategory) {
                  // Find or create the category section
                  let categoryEl =
                    (_c = Array.from(
                      this.node.querySelectorAll('.category-title')
                    ).find(title => title.textContent === categoryName)) ===
                      null || _c === void 0
                      ? void 0
                      : _c.closest('.category');
                  if (!categoryEl) {
                    categoryEl = document.createElement('div');
                    categoryEl.classList.add('category');
                    categoryEl.innerHTML = `
              <h2 class="category-title">${categoryName}</h2>
              <hr>
              <div class="issues-list"></div>
            `;
                    const container =
                      this.node.querySelector('.issues-container');
                    container.appendChild(categoryEl);
                  }
                  const issuesList = categoryEl.querySelector('.issues-list');
                  // Remove existing widgets for impacted cell indices only
                  const impacted = new Set(
                    categoryIssues.map(i => i.cellIndex)
                  );
                  Array.from(issuesList.children).forEach(child => {
                    const el = child;
                    const idxAttr = el.getAttribute('data-cell-index');
                    if (idxAttr && impacted.has(parseInt(idxAttr))) {
                      el.remove();
                    }
                  });
                  // Append new issues for this category
                  categoryIssues.forEach(issue => {
                    const issueWidget =
                      new _issueWidget_js__WEBPACK_IMPORTED_MODULE_6__.CellIssueWidget(
                        issue,
                        this.currentNotebook.content.widgets[issue.cellIndex],
                        this.aiEnabled,
                        this
                      );
                    issuesList.appendChild(issueWidget.node);
                  });
                }
              }
            };
            this.node.addEventListener('notebookReanalyzed', handler);
            //document.addEventListener('notebookReanalyzed', handler as EventListener);
          }
          async loadSettings(settingRegistry) {
            try {
              const settings = await settingRegistry.load(
                'jupyterlab-a11y-checker:plugin'
              );
              if (settings.get('languageModel').composite) {
                const langModel = settings.get('languageModel').composite;
                this.languageModelSettings = {
                  baseUrl:
                    langModel.baseUrl || this.languageModelSettings.baseUrl,
                  apiKey: langModel.apiKey || this.languageModelSettings.apiKey,
                  model: langModel.model || this.languageModelSettings.model
                };
              }
              if (settings.get('visionModel').composite) {
                const visionModel = settings.get('visionModel').composite;
                this.visionModelSettings = {
                  baseUrl:
                    visionModel.baseUrl || this.visionModelSettings.baseUrl,
                  apiKey: visionModel.apiKey || this.visionModelSettings.apiKey,
                  model: visionModel.model || this.visionModelSettings.model
                };
              }
            } catch (error) {
              console.warn('Failed to load settings:', error);
            }
          }
          getLanguageModelSettings() {
            return this.languageModelSettings;
          }
          getVisionModelSettings() {
            return this.visionModelSettings;
          }
          setNotebook(notebook) {
            this.currentNotebook = notebook;
            const issuesContainer =
              this.node.querySelector('.issues-container');
            issuesContainer.innerHTML = '';
          }
        }

        /***/
      },

    /***/ './lib/image-processor.js':
      /*!********************************!*\
  !*** ./lib/image-processor.js ***!
  \********************************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ BrowserImageProcessor: () =>
            /* binding */ BrowserImageProcessor
          /* harmony export */
        });
        class BrowserImageProcessor {
          loadImage(src) {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'Anonymous';
              img.onload = () => resolve(img);
              img.onerror = e =>
                reject(new Error(`Failed to load image: ${src}`));
              img.src = src;
            });
          }
          createCanvas(width, height) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            return canvas;
          }
        }

        /***/
      },

    /***/ './lib/index.js':
      /*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
      /***/ (
        __unused_webpack_module,
        __webpack_exports__,
        __webpack_require__
      ) => {
        __webpack_require__.r(__webpack_exports__);
        /* harmony export */ __webpack_require__.d(__webpack_exports__, {
          /* harmony export */ default: () => __WEBPACK_DEFAULT_EXPORT__
          /* harmony export */
        });
        /* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            /*! @jupyterlab/notebook */ 'webpack/sharing/consume/default/@jupyterlab/notebook'
          );
        /* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0___default =
          /*#__PURE__*/ __webpack_require__.n(
            _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__
          );
        /* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(
            /*! @jupyterlab/application */ 'webpack/sharing/consume/default/@jupyterlab/application'
          );
        /* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_1___default =
          /*#__PURE__*/ __webpack_require__.n(
            _jupyterlab_application__WEBPACK_IMPORTED_MODULE_1__
          );
        /* harmony import */ var _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            /*! @jupyterlab/settingregistry */ 'webpack/sharing/consume/default/@jupyterlab/settingregistry'
          );
        /* harmony import */ var _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_2___default =
          /*#__PURE__*/ __webpack_require__.n(
            _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_2__
          );
        /* harmony import */ var _components_mainpanelWidget_js__WEBPACK_IMPORTED_MODULE_5__ =
          __webpack_require__(
            /*! ./components/mainpanelWidget.js */ './lib/components/mainpanelWidget.js'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            /*! @berkeley-dsep-infra/a11y-checker-core */ 'webpack/sharing/consume/default/@berkeley-dsep-infra/a11y-checker-core/@berkeley-dsep-infra/a11y-checker-core'
          );
        /* harmony import */ var _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3___default =
          /*#__PURE__*/ __webpack_require__.n(
            _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__
          );
        /* harmony import */ var _adapter_js__WEBPACK_IMPORTED_MODULE_6__ =
          __webpack_require__(/*! ./adapter.js */ './lib/adapter.js');
        /* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_4__ =
          __webpack_require__(
            /*! @jupyterlab/coreutils */ 'webpack/sharing/consume/default/@jupyterlab/coreutils'
          );
        /* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_4___default =
          /*#__PURE__*/ __webpack_require__.n(
            _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_4__
          );
        /* harmony import */ var _image_processor_js__WEBPACK_IMPORTED_MODULE_7__ =
          __webpack_require__(
            /*! ./image-processor.js */ './lib/image-processor.js'
          );

        const extension = {
          id: 'jupyterlab-a11y-checker:plugin',
          autoStart: true,
          requires: [
            _jupyterlab_application__WEBPACK_IMPORTED_MODULE_1__.ILabShell,
            _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_2__.ISettingRegistry
          ],
          activate: (app, labShell, settingRegistry) => {
            const panel =
              new _components_mainpanelWidget_js__WEBPACK_IMPORTED_MODULE_5__.MainPanelWidget(
                settingRegistry
              );
            labShell.add(panel, 'right');
            // Update current notebook when active widget changes
            labShell.currentChanged.connect(() => {
              const current = labShell.currentWidget;
              if (
                current instanceof
                _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookPanel
              ) {
                panel.setNotebook(current);
              }
            });
            app.commands.addCommand('jupyterlab-a11y-checker:scan-notebook', {
              label: 'Scan Notebook for Accessibility Issues',
              execute: async () => {
                const current = labShell.currentWidget;
                if (
                  current instanceof
                  _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookPanel
                ) {
                  const accessibleCells = (0,
                  _adapter_js__WEBPACK_IMPORTED_MODULE_6__.notebookToGeneralCells)(
                    current
                  );
                  const issues = await (0,
                  _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__.analyzeCellsAccessibility)(
                    accessibleCells,
                    document,
                    _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_4__.PageConfig.getBaseUrl(),
                    new _image_processor_js__WEBPACK_IMPORTED_MODULE_7__.BrowserImageProcessor(),
                    current.context.path
                  );
                  return (0,
                  _berkeley_dsep_infra_a11y_checker_core__WEBPACK_IMPORTED_MODULE_3__.buildLLMReport)(
                    issues
                  );
                }
                return [];
              }
            });
          }
        };
        /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ =
          extension;

        /***/
      }
  }
]);
//# sourceMappingURL=lib_index_js.95e86c6e24bdafc0018e.js.map
