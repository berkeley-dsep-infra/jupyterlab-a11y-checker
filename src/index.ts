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
                const markdownOutput = cell.node.querySelector('.jp-MarkdownOutput')
                if (markdownOutput) {
                    // First check rendered markdown
                    tempDiv.innerHTML = markdownOutput.innerHTML;
                    if (tempDiv.innerHTML.trim()) {
                        const renderedResults = await axe.run(tempDiv, axeConfig);
                        const renderedViolations = renderedResults.violations;

                        // Then check raw markdown
                        tempDiv.innerHTML = cell.model.sharedModel.getSource();
                        const rawResults = await axe.run(tempDiv, axeConfig);
                        const rawViolations = rawResults.violations;

                        // Combine violations and filter duplicates based on issue ID
                        const allViolations = [...renderedViolations, ...rawViolations];
                        const uniqueViolations = allViolations.filter((violation, index, self) =>
                            index === self.findIndex(v => v.id === violation.id)
                        );

                        if (uniqueViolations.length > 0) {
                            uniqueViolations.forEach(violation => {
                                issues.push({
                                    cellIndex: i,
                                    cellType: cellType,
                                    axeResults: violation,
                                    contentRaw: cell.model.sharedModel.getSource(),
                                });
                            });
                        }
                    }
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

    constructor(issue: CellAccessibilityIssue, notebook: NotebookPanel) {
        super();
        this.cellIndex = issue.cellIndex;
        this.currentNotebook = notebook;
        this._userOllamaUrl = (ServerConnection.makeSettings().baseUrl || PageConfig.getBaseUrl()) + "ollama/";
        
        this.addClass('issue-widget');
        
        // Create the widget's HTML structure using template string
        this.node.innerHTML = `
            <div class="container">
                <button class="issue-header-button">
                    <h3 class="issue-header">Issue: ${issue.axeResults.id} <svg class="icon chevron-down" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg></h3>
                </button>
                <div class="collapsible-content" style="display: none;">
                    <p class="description">
                        ${issue.axeResults.help} <a href="${issue.axeResults.helpUrl}" target="_blank">(more)</a>.
                    </p>
                    <div class="button-container">
                        <button class="jp-Button2 locate-button">
                            <svg class="icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                            <div>Locate</div>
                        </button>
                        <button class="jp-Button2 suggest-button" style="display: none;">
                            <svg class="icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                            <div>Get AI Suggestions</div>
                        </button>
                    </div>
                    <div class="suggestion-container" style="display: none;">
                        <div class="suggestion"></div>
                        <button class="jp-Button2 apply-button" style="display: none;">
                            <svg class="icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            <div>Apply</div>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners using query selectors
        const headerButton = this.node.querySelector('.issue-header-button');
        const locateButton = this.node.querySelector('.locate-button');
        const suggestButton = this.node.querySelector('.suggest-button');
        const applyButton = this.node.querySelector('.apply-button');
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
        suggestButton?.addEventListener('click', () => this.getAISuggestions(issue));
        applyButton?.addEventListener('click', () => this.applySuggestion());
    }

    private navigateToCell(index: number): void {
        if (!this.currentNotebook) return;
        
        const cells = this.currentNotebook.content.widgets;
        const targetCell = cells[index];
        
        if (!targetCell) return;
        
        targetCell.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCell.node.style.transition = 'background-color 0.5s ease';
        targetCell.node.style.backgroundColor = '#FFFFC5';
        
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
        suggestionElement.textContent = 'Loading...';
        
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
}

class A11yMainPanel extends Widget {
    private categoriesContainer: HTMLElement | null = null;
    private currentNotebook: NotebookPanel | null = null;
    private noticeContent: HTMLElement | null = null;
    private aiToggleButton: HTMLElement | null = null;
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
                            Notice: Known cell navigation error
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
                    <button class="control-button ai-toggle">Use AI : Disabled</button>
                    <button class="control-button analyze">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M19.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z"/></svg>
                        Analyze Notebook
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
                    this.aiToggleButton.textContent = 'Use AI : Please wait...';
                }
                
                try {
                    // Pull the model
                    const ollamaUrl = (ServerConnection.makeSettings().baseUrl || PageConfig.getBaseUrl()) + "ollama/";
                    await pullOllamaModel(ollamaUrl, "mistral");
                    isModelPulled = true;
                    
                    // Only switch to enabled when model is successfully pulled
                    this.aiEnabled = true;
                    if (this.aiToggleButton) {
                        this.aiToggleButton.textContent = 'Use AI : Enabled';
                    }
                } catch (error) {
                    console.error('Failed to pull model:', error);
                    // Keep disabled on failure
                    if (this.aiToggleButton) {
                        this.aiToggleButton.textContent = 'Use AI : Failed to load model';
                    }
                }
            } else {
                // Model already pulled or we're just toggling between states
                this.aiEnabled = !this.aiEnabled;
                if (this.aiToggleButton) {
                    this.aiToggleButton.textContent = `Use AI : ${this.aiEnabled ? 'Enabled' : 'Disabled'}`;
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
            categorySet.add(issueToCategory.get(issue.axeResults.id) || 'Other');
        }
        
        // Create category widgets for each category
        categorySet.forEach(categoryTitle => {
            const categoryIssues = issues.filter(issue => 
                (issueToCategory.get(issue.axeResults.id) || 'Other') === categoryTitle
            );
            const categoryWidget = new CellCategoryWidget(this.currentNotebook!, categoryTitle, categoryIssues);
            this.categoriesContainer?.appendChild(categoryWidget.node);
        });
        
        // Update suggest buttons visibility based on AI state
        this.updateSuggestButtonsVisibility();
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
