import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';
import { ILabShell } from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import axe from 'axe-core';
import { CellAccessibilityIssue } from './types';
import { formatPrompt, getFixSuggestions, pullOllamaModel } from './aiBasedFunctions';
import { issueToCategory } from './issueCategories';
import { LabIcon } from '@jupyterlab/ui-components';
import { marked } from 'marked';
import { detectImageIssues } from './detectionFunctions';

// Track if model has been pulled
let isModelPulled = false;

// Core Analysis Functions
async function analyzeCellsAccessibility(panel: NotebookPanel): Promise<CellAccessibilityIssue[]> {
    const issues: CellAccessibilityIssue[] = [];
    
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);

    const axeConfig: axe.RunOptions = {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    };

    try {
        const cells = panel.content.widgets;
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
                    // Parse markdown to HTML using marked
                    tempDiv.innerHTML = await marked.parse(rawMarkdown);
                    
                    // Run axe analysis on our clean HTML
                    const results = await axe.run(tempDiv, axeConfig);
                    const violations = results.violations;

                    if (violations.length > 0) {
                        violations.forEach(violation => {
                            violation.nodes.forEach(node => {
                                issues.push({
                                    cellIndex: i,
                                    cellType: cellType,
                                    axeViolation: violation,
                                    node: node,
                                    contentRaw: rawMarkdown,
                                });
                            });
                        });
                    }

                    // Add custom image issue detection
                    issues.push(...detectImageIssues(rawMarkdown, i, cellType));
                }
            } else if (cellType === 'code') {
                const codeInput = cell.node.querySelector('.jp-InputArea-editor')
                const codeOutput = cell.node.querySelector('.jp-OutputArea')
                if (codeInput || codeOutput) {
                    // We would have to feed this into a language model to get the suggested fix.
                }
            }
        }
    } finally {
        tempDiv.remove();
    }

    return issues;
}

class CellCategoryWidget extends Widget {
    constructor(notebook: NotebookPanel, categoryTitle: string, issues: CellAccessibilityIssue[]) {
        super();
        this.addClass('category');
        
        // Create the basic structure
        this.node.innerHTML = `
            <h2 class="category-title">${categoryTitle}</h2>
            <hr>
            <div class="issues-list"></div>
        `;

        // Get the issues-list container
        const issuesList = this.node.querySelector('.issues-list');
        
        // Create and append each CellIssueWidget
        issues.forEach(issue => {
            const issueWidget = new CellIssueWidget(issue, notebook);
            if (issuesList) {
                issuesList.appendChild(issueWidget.node);
            }
        });
    }
}

class CellIssueWidget extends Widget {
    private cellIndex: number;
    private suggestion: string = '';
    private _userOllamaUrl: string;
    private currentNotebook: NotebookPanel;
    private issue: CellAccessibilityIssue;

    constructor(issue: CellAccessibilityIssue, notebook: NotebookPanel) {
        super();
        this.cellIndex = issue.cellIndex;
        this.currentNotebook = notebook;
        this.issue = issue;
        this._userOllamaUrl = (ServerConnection.makeSettings().baseUrl || PageConfig.getBaseUrl()) + "ollama/";
        
        this.addClass('issue-widget');
        
        let issueSpecificUI = '';
        if (issue.axeViolation.id === 'image-alt') {
            issueSpecificUI = `
                <div class="image-alt-ui-container" style="background-color: #DCDCDC; padding: 12px; border-radius: 8px; margin-top: 12px; border: 1px solid black;">
                    <input type="text" class="jp-a11y-input" placeholder="Input alt text here..." style="width: calc(100% - 16px); padding: 8px; margin-bottom: 8px; background-color: #DCDCDC; color: black; font-family: Inter, sans-serif; box-sizing: border-box; border: none; outline: none;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button class="jp-Button2 suggest-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/><path fill="#fff" d="M19 19a1 1 0 0 1 .117 1.993L19 21h-7a1 1 0 0 1-.117-1.993L12 19zm.631-14.632a2.5 2.5 0 0 1 0 3.536L8.735 18.8a1.5 1.5 0 0 1-.44.305l-3.804 1.729c-.842.383-1.708-.484-1.325-1.326l1.73-3.804a1.5 1.5 0 0 1 .304-.44L16.096 4.368a2.5 2.5 0 0 1 3.535 0m-2.12 1.414L6.677 16.614l-.589 1.297l1.296-.59L18.217 6.49a.5.5 0 1 0-.707-.707M6 1a1 1 0 0 1 .946.677l.13.378a3 3 0 0 0 1.869 1.87l.378.129a1 1 0 0 1 0 1.892l-.378.13a3 3 0 0 0-1.87 1.869l-.129.378a1 1 0 0 1-1.892 0l-.13-.378a3 3 0 0 0-1.869-1.87l-.378-.129a1 1 0 0 1 0-1.892l.378-.13a3 3 0 0 0 1.87-1.869l.129-.378A1 1 0 0 1 6 1m0 3.196A5 5 0 0 1 5.196 5q.448.355.804.804q.355-.448.804-.804A5 5 0 0 1 6 4.196"/></g></svg>                            
                            <div>Get AI Suggestions</div>
                        </button>
                        <button class="jp-Button2 apply-alt-button">
                            <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            <div>Apply</div>
                        </button>
                    </div>
                </div>
            `;
        }

        // Modify the HTML template to include the issue-specific UI
        this.node.innerHTML = `
            <div class="container">
                <button class="issue-header-button">
                    <h3 class="issue-header">Issue: ${issue.axeViolation.id} <svg class="icon chevron-down" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg></h3>
                </button>
                <div class="collapsible-content" style="display: none;">
                    <p class="description">
                        ${issue.axeViolation.help} <a href="${issue.axeViolation.helpUrl}" target="_blank">(learn more about the issue)</a>.
                    </p>
                    <div class="button-container">
                        <button class="jp-Button2 locate-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>                            
                            <div>Locate</div>
                        </button>
                        ${issue.axeViolation.id !== 'image-alt' ? `
                        <button class="jp-Button2 suggest-button">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/><path fill="#fff" d="M19 19a1 1 0 0 1 .117 1.993L19 21h-7a1 1 0 0 1-.117-1.993L12 19zm.631-14.632a2.5 2.5 0 0 1 0 3.536L8.735 18.8a1.5 1.5 0 0 1-.44.305l-3.804 1.729c-.842.383-1.708-.484-1.325-1.326l1.73-3.804a1.5 1.5 0 0 1 .304-.44L16.096 4.368a2.5 2.5 0 0 1 3.535 0m-2.12 1.414L6.677 16.614l-.589 1.297l1.296-.59L18.217 6.49a.5.5 0 1 0-.707-.707M6 1a1 1 0 0 1 .946.677l.13.378a3 3 0 0 0 1.869 1.87l.378.129a1 1 0 0 1 0 1.892l-.378.13a3 3 0 0 0-1.87 1.869l-.129.378a1 1 0 0 1-1.892 0l-.13-.378a3 3 0 0 0-1.869-1.87l-.378-.129a1 1 0 0 1 0-1.892l.378-.13a3 3 0 0 0 1.87-1.869l.129-.378A1 1 0 0 1 6 1m0 3.196A5 5 0 0 1 5.196 5q.448.355.804.804q.355-.448.804-.804A5 5 0 0 1 6 4.196"/></g></svg>                            
                          <div>Get AI Suggestions</div>
                        </button>
                        ` : ''}
                    </div>
                    <div class="suggestion-container" style="display: none;">
                        <div class="suggestion"></div>
                        <button class="jp-Button2 apply-button" style="display: none;">
                            <svg class="icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            <div>Apply</div>
                        </button>
                    </div>
                    <div class="issue-specific-ui-container"></div>
                    ${issueSpecificUI}
                </div>
            </div>
            `;

        // Add event listeners using query selectors
        const headerButton = this.node.querySelector('.issue-header-button');
        const locateButton = this.node.querySelector('.locate-button');
        const suggestButton = this.node.querySelector('.suggest-button');
        const applyButton = this.node.querySelector('.apply-button');
        const applyAltButton = this.node.querySelector('.apply-alt-button');
        const collapsibleContent = this.node.querySelector('.collapsible-content') as HTMLElement;

        // Toggle collapsible content when header is clicked
        headerButton?.addEventListener('click', () => {
            if (collapsibleContent) {
                const isHidden = collapsibleContent.style.display === 'none';
                collapsibleContent.style.display = isHidden ? 'block' : 'none';
                
                // Update the chevron class
                const chevron = this.node.querySelector('.chevron-down');
                if (chevron) {
                    chevron.classList.toggle('chevron-up', isHidden);
                }
            }
        });

        // Show suggest button initially if AI is enabled
        const mainPanel = document.getElementById('a11y-sidebar') as HTMLElement;
        if (mainPanel) {
            const aiToggleButton = mainPanel.querySelector('.ai-toggle');
            if (aiToggleButton && aiToggleButton.textContent?.includes('Enabled')) {
                const suggestButtonEl = this.node.querySelector('.suggest-button') as HTMLElement;
                if (suggestButtonEl) {
                    suggestButtonEl.style.display = 'flex';
                }
            }
        }

        locateButton?.addEventListener('click', () => this.navigateToCell(this.cellIndex));
        suggestButton?.addEventListener('click', () => this.getAISuggestions(this.issue));
        applyButton?.addEventListener('click', () => this.applySuggestion());

        // Add event listener for apply-alt-button
        if (this.issue.axeViolation.id === 'image-alt' && applyAltButton) {
            applyAltButton.addEventListener('click', () => this.applyAltText());
        }
    }

    private navigateToCell(index: number): void {
        if (!this.currentNotebook) return;
        
        const cells = this.currentNotebook.content.widgets;
        const targetCell = cells[index];


        if (!targetCell) return;


        targetCell.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCell.node.style.transition = 'background-color 0.5s ease';
        targetCell.node.style.backgroundColor = '#DB3939';


        setTimeout(() => {
            targetCell.node.style.backgroundColor = '';
        }, 1000);
    }

    private async getAISuggestions(issue: CellAccessibilityIssue): Promise<void> {
        const suggestionContainer = this.node.querySelector('.suggestion-container') as HTMLElement;
        const suggestionElement = this.node.querySelector('.suggestion') as HTMLElement;
        const applyButton = this.node.querySelector('.apply-button') as HTMLElement;
        
        // Display the suggestion container before loading
        suggestionContainer.style.display = 'block';
        // Loading spinner
        suggestionElement.innerHTML = `
            <svg class="icon loading" viewBox="0 0 24 24">
                <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z"/>
            </svg> Please wait...
        `;
        
        try {
            const suggestion = await getFixSuggestions(formatPrompt(issue), this._userOllamaUrl, "mistral");
            this.suggestion = suggestion;
            
            if (suggestion !== 'Error') {
                suggestionElement.textContent = suggestion;
                applyButton.style.display = 'flex';
            } else {
                suggestionElement.textContent = 'Error getting suggestions. Please try again.';
            }
        } catch (error) {
            console.error(error);
            suggestionElement.textContent = 'Error getting suggestions. Please try again.';
        }
    }

    private async applySuggestion(): Promise<void> {
        if (!this.currentNotebook || !this.suggestion) return;


        const cell = this.currentNotebook.content.widgets[this.cellIndex];
        if (cell?.model) {
            cell.model.sharedModel.setSource(this.suggestion);
        }
    }

    private async applyAltText(): Promise<void> {
        if (!this.currentNotebook) return;

        const altTextInput = this.node.querySelector('.jp-a11y-input') as HTMLInputElement;
        if (!altTextInput || !altTextInput.value.trim()) return;

        const cell = this.currentNotebook.content.widgets[this.cellIndex];
        if (!cell?.model) return;

        const contentRaw = this.issue.contentRaw;
        const nodeHtml = this.issue.node.html;
        const newAltText = altTextInput.value.trim();

        // Helper function to escape special regex characters
        const escapeRegExp = (string: string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        // Helper function to handle HTML image tags
        const handleHtmlImage = (content: string, imgTag: string): string => {
            // Check if alt attribute exists but is empty
            if (imgTag.includes('alt=""') || imgTag.includes("alt=''")) {
                // Replace empty alt with new alt text
                return content.replace(
                    new RegExp(escapeRegExp(imgTag), 'g'),
                    imgTag.replace(/alt=["']\s*["']/, `alt="${newAltText}"`)
                );
            } else {
                // First find the original tag in content (preserving original spacing)
                const originalTagRegex = /<img\s+[^>]*?src=["'][^"']*?["'][^>]*?>/;
                const originalTag = content.match(originalTagRegex)?.[0];
                
                if (originalTag) {
                    return content.replace(
                        originalTag,
                        originalTag.replace(/>$/, ` alt="${newAltText}">`)
                    );
                }
                return content;
            }
        };

        // Helper function to handle markdown images
        const handleMarkdownImage = (content: string, mdImage: string): string => {
            return content.replace(
                new RegExp(escapeRegExp(mdImage), 'g'),
                mdImage.replace(/!\[\]/, `![${newAltText}]`)
            );
        };

        let newContent = contentRaw;

        // Check if it's an HTML image tag
        if (nodeHtml.startsWith('<img')) {
            newContent = handleHtmlImage(contentRaw, nodeHtml);
        }
        // Check if it's a markdown image
        else if (nodeHtml.startsWith('![')) {
            newContent = handleMarkdownImage(contentRaw, nodeHtml);
        }

        // Update the cell content
        cell.model.sharedModel.setSource(newContent);

        // Show success animation with green background
        cell.node.style.transition = 'background-color 0.5s ease';
        cell.node.style.backgroundColor = '#28A745';  // Bootstrap success green color

        setTimeout(() => {
            cell.node.style.backgroundColor = '';
        }, 1000);

        // Remove the issue using the reusable method
        this.removeIssue();
    }

    private removeIssue(): void {
        // Find this issue widget
        const issueWidget = this.node.closest('.issue-widget');
        if (issueWidget) {
            // Find the parent category
            const category = issueWidget.closest('.category');
            // Remove this issue
            issueWidget.remove();
            
            // If category exists and has no more issues, remove it
            if (category && !category.querySelector('.issue-widget')) {
                category.remove();
            }
        }
    }
}

class A11yMainPanel extends Widget {
    private categoriesContainer: HTMLElement | null = null;
    private currentNotebook: NotebookPanel | null = null;
    private noticeContent: HTMLElement | null = null;
    private aiToggleButton: HTMLButtonElement | null = null;
    private aiEnabled: boolean = false;

    constructor() {
        super();
        this.addClass('a11y-panel');
        this.id = 'a11y-sidebar';
        
        
        const accessibilityIcon = new LabIcon({
            name: 'a11y:accessibility',
            svgstr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#154F92" d="M256 48c114.953 0 208 93.029 208 208 0 114.953-93.029 208-208 208-114.953 0-208-93.029-208-208 0-114.953 93.029-208 208-208m0-40C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 56C149.961 64 64 149.961 64 256s85.961 192 192 192 192-85.961 192-192S362.039 64 256 64zm0 44c19.882 0 36 16.118 36 36s-16.118 36-36 36-36-16.118-36-36 16.118-36 36-36zm117.741 98.023c-28.712 6.779-55.511 12.748-82.14 15.807.851 101.023 12.306 123.052 25.037 155.621 3.617 9.26-.957 19.698-10.217 23.315-9.261 3.617-19.699-.957-23.316-10.217-8.705-22.308-17.086-40.636-22.261-78.549h-9.686c-5.167 37.851-13.534 56.208-22.262 78.549-3.615 9.255-14.05 13.836-23.315 10.217-9.26-3.617-13.834-14.056-10.217-23.315 12.713-32.541 24.185-54.541 25.037-155.621-26.629-3.058-53.428-9.027-82.141-15.807-8.6-2.031-13.926-10.648-11.895-19.249s10.647-13.926 19.249-11.895c96.686 22.829 124.283 22.783 220.775 0 8.599-2.03 17.218 3.294 19.249 11.895 2.029 8.601-3.297 17.219-11.897 19.249z"/></svg>'
        });

        this.title.icon = accessibilityIcon;

        // Use the existing HTML structure
        this.node.innerHTML = `
            <div class="main-container">
                <div class="notice-section">
                    <div class="notice-header">
                        <div class="notice-title">
                            <svg class="icon chevron-down" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                            <strong>Notice: Known cell navigation error </strong>
                        </div>
                        <button class="close-button">✕</button>
                    </div>
                    <div class="notice-content" style="display: none;">
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
                    <button class="control-button ai-toggle">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" color="#fff"><path d="M15.5 11.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0"/><path d="M21 13.6q.474-.132 1-.133V9.533c-2.857 0-4.714-3.103-3.268-5.566L15.268 2c-1.464 2.494-5.07 2.494-6.534 0L5.27 3.967C6.716 6.43 4.857 9.533 2 9.533v3.934c2.857 0 4.714 3.103 3.268 5.566L8.732 21A3.76 3.76 0 0 1 12 19.129"/><path d="m18.5 15l.258.697c.338.914.507 1.371.84 1.704c.334.334.791.503 1.705.841L22 18.5l-.697.258c-.914.338-1.371.507-1.704.84c-.334.334-.503.791-.841 1.705L18.5 22l-.258-.697c-.338-.914-.507-1.371-.84-1.704c-.334-.334-.791-.503-1.705-.841L15 18.5l.697-.258c.914-.338 1.371-.507 1.704-.84c.334-.334.503-.791.841-1.705z"/></g></svg>                        
                      Use AI : Disabled
                    </button>
                    <button class="control-button analyze">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.456 3.75v5.09a3 3 0 0 1-.557 1.742l-1.736 2.436M9.456 3.75h-1.65m1.65 0h5.088m0 0v5.09a3 3 0 0 0 .557 1.742l1.736 2.436M14.544 3.75h1.65m-9.031 9.268l-2.378 3.337a2.465 2.465 0 0 0 2.007 3.895h10.416a2.465 2.465 0 0 0 2.007-3.895l-2.378-3.337m-9.674 0h9.674"/></svg>                        Analyze Notebook
                    </button>
                </div>
                <div class="categories-container"></div>
            </div>
        `;

        // Get references to elements
        this.categoriesContainer = this.node.querySelector('.categories-container');
        this.noticeContent = this.node.querySelector('.notice-content');
        this.aiToggleButton = this.node.querySelector('.ai-toggle');

        // Add event listeners
        const noticeToggle = this.node.querySelector('.notice-title');
        const closeButton = this.node.querySelector('.close-button');
        const analyzeButton = this.node.querySelector('.analyze');
        const triangle = this.node.querySelector('.chevron-down');

        noticeToggle?.addEventListener('click', () => {
            if (this.noticeContent) {
                const isHidden = this.noticeContent.style.display === 'none';
                this.noticeContent.style.display = isHidden ? 'block' : 'none';
                if (triangle) {
                    triangle.classList.toggle('chevron-up', isHidden);
                }
            }
        });

        closeButton?.addEventListener('click', () => {
            const noticeSection = this.node.querySelector('.notice-section') as HTMLElement;
            if (noticeSection) {
                noticeSection.style.display = 'none';
            }
        });

        this.aiToggleButton?.addEventListener('click', async () => {
            // Don't toggle immediately - handle state based on the situation
            
            if (!this.aiEnabled && !isModelPulled) {
                // First time enabling - need to pull model
                if (this.aiToggleButton) {
                    this.aiToggleButton.innerHTML = `
                        <svg class="icon loading" viewBox="0 0 24 24">
                            <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z"/>
                        </svg>
                        Please wait...
                    `;
                    this.aiToggleButton.disabled = true;
                }
                
                try {
                    // Pull the model
                    const ollamaUrl = (ServerConnection.makeSettings().baseUrl || PageConfig.getBaseUrl()) + "ollama/";
                    await pullOllamaModel(ollamaUrl, "mistral");
                    isModelPulled = true;
                    
                    // Only switch to enabled when model is successfully pulled
                    this.aiEnabled = true;
                    if (this.aiToggleButton) {
                        this.aiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" color="#fff"><path d="M15.5 11.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0"/><path d="M21 13.6q.474-.132 1-.133V9.533c-2.857 0-4.714-3.103-3.268-5.566L15.268 2c-1.464 2.494-5.07 2.494-6.534 0L5.27 3.967C6.716 6.43 4.857 9.533 2 9.533v3.934c2.857 0 4.714 3.103 3.268 5.566L8.732 21A3.76 3.76 0 0 1 12 19.129"/><path d="m18.5 15l.258.697c.338.914.507 1.371.84 1.704c.334.334.791.503 1.705.841L22 18.5l-.697.258c-.914.338-1.371.507-1.704.84c-.334.334-.503.791-.841 1.705L18.5 22l-.258-.697c-.338-.914-.507-1.371-.84-1.704c-.334-.334-.791-.503-1.705-.841L15 18.5l.697-.258c.914-.338 1.371-.507 1.704-.84c.334-.334.503-.791.841-1.705z"/></g></svg> Use AI : Enabled`;
                        this.aiToggleButton.disabled = false;
                    }
                } catch (error) {
                    console.error('Failed to pull model:', error);
                    // Keep disabled on failure
                    if (this.aiToggleButton) {
                        this.aiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" color="#fff"><path d="M15.5 11.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0"/><path d="M21 13.6q.474-.132 1-.133V9.533c-2.857 0-4.714-3.103-3.268-5.566L15.268 2c-1.464 2.494-5.07 2.494-6.534 0L5.27 3.967C6.716 6.43 4.857 9.533 2 9.533v3.934c2.857 0 4.714 3.103 3.268 5.566L8.732 21A3.76 3.76 0 0 1 12 19.129"/><path d="m18.5 15l.258.697c.338.914.507 1.371.84 1.704c.334.334.791.503 1.705.841L22 18.5l-.697.258c-.914.338-1.371.507-1.704.84c-.334.334-.503.791-.841 1.705L18.5 22l-.258-.697c-.338-.914-.507-1.371-.84-1.704c-.334-.334-.791-.503-1.705-.841L15 18.5l.697-.258c.914-.338 1.371-.507 1.704-.84c.334-.334.503-.791.841-1.705z"/></g></svg> Use AI : Failed to load model`;
                        this.aiToggleButton.disabled = false;
                    }
                }
            } else {
                // Model already pulled or we're just toggling between states
                this.aiEnabled = !this.aiEnabled;
                if (this.aiToggleButton) {
                    this.aiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" color="#fff"><path d="M15.5 11.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0"/><path d="M21 13.6q.474-.132 1-.133V9.533c-2.857 0-4.714-3.103-3.268-5.566L15.268 2c-1.464 2.494-5.07 2.494-6.534 0L5.27 3.967C6.716 6.43 4.857 9.533 2 9.533v3.934c2.857 0 4.714 3.103 3.268 5.566L8.732 21A3.76 3.76 0 0 1 12 19.129"/><path d="m18.5 15l.258.697c.338.914.507 1.371.84 1.704c.334.334.791.503 1.705.841L22 18.5l-.697.258c-.914.338-1.371.507-1.704.84c-.334.334-.503.791-.841 1.705L18.5 22l-.258-.697c-.338-.914-.507-1.371-.84-1.704c-.334-.334-.791-.503-1.705-.841L15 18.5l.697-.258c.914-.338 1.371-.507 1.704-.84c.334-.334.503-.791.841-1.705z"/></g></svg> Use AI : ${this.aiEnabled ? 'Enabled' : 'Disabled'}`;
                }
            }
            
            // Update visibility of all suggest buttons
            this.updateSuggestButtonsVisibility();
        });

        analyzeButton?.addEventListener('click', () => this.analyzeCurrentNotebook());
    }

    // Add new method to update suggestion buttons visibility
    private updateSuggestButtonsVisibility() {
        const suggestButtons = this.node.querySelectorAll('.suggest-button');
        suggestButtons.forEach(button => {
            (button as HTMLElement).style.display = this.aiEnabled ? 'flex' : 'none';
        });
    }

    setNotebook(notebook: NotebookPanel) {
        this.currentNotebook = notebook;
    }

    private async analyzeCurrentNotebook() {
        if (!this.currentNotebook || !this.categoriesContainer) return;
        
        const analyzeButton = this.node.querySelector('.analyze') as HTMLButtonElement;
        const originalContent = analyzeButton.innerHTML;
        try {
          // Update button to show loading state
          analyzeButton.innerHTML = `
            <svg class="icon loading" viewBox="0 0 24 24">
                <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z"/>
            </svg>
            Please wait...
          `;
          analyzeButton.disabled = true; // Disable button while analyzing
        
          this.categoriesContainer.innerHTML = '';
        console.log('Analyzing current notebook');

        const issues = await analyzeCellsAccessibility(this.currentNotebook);

          if (issues.length === 0) {
              this.categoriesContainer.innerHTML = '<div class="no-issues">No issues found</div>';
              return;
          }
          
          // Group issues by category
          const categorySet = new Set<string>();
          for (const issue of issues) {
              categorySet.add(issueToCategory.get(issue.axeViolation.id) || 'Other');
          }
          
          // Create category widgets for each category
          categorySet.forEach(categoryTitle => {
              const categoryIssues = issues.filter(issue => 
                  (issueToCategory.get(issue.axeViolation.id) || 'Other') === categoryTitle
              );
              const categoryWidget = new CellCategoryWidget(this.currentNotebook!, categoryTitle, categoryIssues);
              this.categoriesContainer?.appendChild(categoryWidget.node);
          });
          
          // Update suggest buttons visibility based on AI state
          this.updateSuggestButtonsVisibility();
        } catch (error) {
            console.error('Error analyzing notebook:', error);
            analyzeButton.innerHTML = originalContent;
        } finally {
            analyzeButton.innerHTML = originalContent;
            analyzeButton.disabled = false;
        }
    }
}

// Extension Configuration
const extension: JupyterFrontEndPlugin<void> = {
    id: 'jupyterlab-a11y-fix',
    autoStart: true,
    requires: [ILabShell],
    activate: (app: JupyterFrontEnd, labShell: ILabShell) => {
        const panel = new A11yMainPanel();
        
        labShell.add(panel, 'right');

        // Update current notebook when active widget changes
        labShell.currentChanged.connect(() => {
            const current = labShell.currentWidget;
            if (current instanceof NotebookPanel) {
                panel.setNotebook(current);
            }
        });
    }
};

export default extension;
