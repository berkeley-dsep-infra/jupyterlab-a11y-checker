import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILabShell } from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import axe from 'axe-core';
import axios from 'axios';

// Track if model has been pulled
let isModelPulled = false;

// Types and Interfaces
interface CellAccessibilityIssue {
    cellIndex: number;
    cellType: string;
    axeResults: axe.Result[];
    contentRaw: string;
}

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
                            issues.push({
                                cellIndex: i,
                                cellType: cellType,
                                axeResults: uniqueViolations,
                                contentRaw: cell.model.sharedModel.getSource(),
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

// AI Integration Functions
function formatPrompt(issue: CellAccessibilityIssue): string {
    let prompt = `The following represents a jupyter notebook cell and a accessibility issue found in it.\n\n`;

    const cellIssue = issue;
    prompt += `Content: \n${cellIssue.contentRaw}\n\n`;
    cellIssue.axeResults.forEach(issue => {
        prompt += `Issue: ${issue.id}\n\n`;
        prompt += `Description: ${issue.description}\n\n`;
    });

    prompt += `Respond in JSON format with the following fields:
    - exampleCellContent: A suggested fix for the cell, without any explanation.
    - explanation: An explanation of the issue and the suggested fix.
    `;

    return prompt;
}

async function getFixSuggestions(prompt: string, userURL: string, modelName: string): Promise<string[]> {
    try {
        // Only pull model on first API call
        if (!isModelPulled) {
            await pullOllamaModel(userURL, modelName);
            console.log("Model pulled");
            isModelPulled = true;
        }
        
        let body = JSON.stringify({ 
            model: modelName,
            prompt: prompt,
            stream: false
        });
        
        const response = await axios.post(
            userURL + "api/generate",
            body,
            {
              headers: { 'Content-Type': 'application/json' }
            }
        );
        const responseText = await response.data.response.trim();
        const responseObj = JSON.parse(responseText); 
        console.log(responseText)   
        try {
            return [responseObj.exampleCellContent || '', responseObj.explanation || ''];
        } catch (e) {
            console.error('Failed to parse suggestion:', e);
            return ['Invalid response format', ''];
        }
    } catch (error) {
        console.error('Error getting suggestions:', error);
        return ['Error', ''];
    }
}

async function pullOllamaModel(userURL: string, modelName: string): Promise<void> {
    try {
      const payload = {
        name: modelName,
        stream: false,
        options: {
          low_cpu_mem_usage: true,
          use_fast_tokenizer: true,
        }
      };
  
      // Instead of aborting, let's just monitor the time
      console.log("Starting model pull...");
  
      const response = await axios.post(
        userURL + "api/pull",
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
  
      if (response.status !== 200) {
        throw new Error('Failed to pull model');
      }
    } catch (error) {
      console.error('Error pulling model:', error);
      throw error;
    }
}
  

// UI Components
class CellIssueWidget extends Widget {
    private currentNotebook: NotebookPanel | null = null;
    private cellIndex: number;
    private suggestion: string = '';
    private _userOllamaUrl: string;

    constructor(issue: CellAccessibilityIssue, notebook: NotebookPanel) {
        super();
        this.addClass('jp-A11yPanel-issue');
        this.currentNotebook = notebook;
        this.cellIndex = issue.cellIndex;
        this._userOllamaUrl = (ServerConnection.makeSettings().baseUrl || PageConfig.getBaseUrl()) + "ollama/";
        // Header Container UI
        const buttonContainer = document.createElement('div');
        buttonContainer.innerHTML = `
            <div class="jp-A11yPanel-buttonContainer">
                <button class="jp-text-button jp-level1 jp-MainIssueButton">
                Issue: ${issue.axeResults.map((result: any) => result.id).join(', ')}
                </button>
                <span class="jp-A11yPanel-infoIcon">&#9432;</span>
                <div class="jp-A11yPanel-popup">
                ${issue.axeResults
                    .map((result: any) => `
                    <div class="jp-A11yPanel-popupDetail">
                        <strong>${result.id}</strong><br>
                        Impact: ${result.impact}<br>
                        Description: ${result.description}<br>
                        Help: ${result.help}<br>
                        Help URL: <a href="${result.helpUrl}" target="_blank">Learn more</a>
                    </div>
                    `)
                    .join('')}
                </div>
            </div>
            <div class="jp-level2-buttons" style="display: none;">
                <button class="jp-text-button jp-level2 jp-NavigateToCellButton">Navigate to cell</button>
                <div class="jp-A11yPanel-buttonContainer suggestion-header">
                    <button class="jp-text-button jp-level2 jp-GetSuggestionsButton">Get AI Suggestions</button>
                    <span class="jp-A11yPanel-infoIcon" style="display: none;">&#9432;</span>
                    <div class="jp-A11yPanel-explanationContent jp-A11yPanel-popup" style="display: none;"></div>
                </div>
            </div>
            `;

        // Add click handler for main issue button to toggle level2 buttons
        const mainButton = buttonContainer.querySelector('.jp-MainIssueButton') as HTMLButtonElement;
        const level2Buttons = buttonContainer.querySelector('.jp-level2-buttons') as HTMLElement;
        mainButton.onclick = () => {
            level2Buttons.style.display = level2Buttons.style.display === 'none' ? 'block' : 'none';
            suggestionContainer.style.display = 'none';
        };

        // Rest of the click handlers
        const navigateButton = buttonContainer.querySelector('.jp-NavigateToCellButton') as HTMLButtonElement;
        navigateButton.onclick = () => this.navigateToCell(issue.cellIndex);

        const infoIcon = buttonContainer.querySelector('.jp-A11yPanel-infoIcon') as HTMLElement;
        infoIcon.onclick = () => {
            const popup = buttonContainer.querySelector('.jp-A11yPanel-popup') as HTMLElement;
            popup.classList.toggle('jp-A11yPanel-popup-visible');
        };

        // AI Suggestion Container UI
        const suggestionContainer = document.createElement('div');
        suggestionContainer.style.display = 'none';
        suggestionContainer.innerHTML = `
          <div class="jp-A11yPanel-suggestionContainer">
            <div class="jp-level4 jp-A11yPanel-loading" style="display: none;">
              Please wait...
            </div>
            <div class="jp-level3 jp-A11yPanel-suggestion" style="display: none;"></div>
            <button class="jp-level3 jp-text-button jp-A11yPanel-applyButton" style="display: none;">Apply</button>
          </div>
        `;

        // Add click handler for Get AI Suggestions button
        const getSuggestionsButton = buttonContainer.querySelector('.jp-GetSuggestionsButton') as HTMLButtonElement;
        getSuggestionsButton.onclick = async () => {
            suggestionContainer.style.display = 'block';
            const loadingElement = suggestionContainer.querySelector('.jp-A11yPanel-loading') as HTMLElement;
            const aiSuggestion = suggestionContainer.querySelector('.jp-A11yPanel-suggestion') as HTMLElement;
            
            const suggestionHeader = buttonContainer.querySelector('.suggestion-header') as HTMLElement;


            const explanationContent = suggestionHeader.querySelector('.jp-A11yPanel-explanationContent') as HTMLElement;
            const infoIcon = suggestionHeader.querySelector('.jp-A11yPanel-infoIcon') as HTMLElement;
            const applyButton = suggestionContainer.querySelector('.jp-A11yPanel-applyButton') as HTMLElement;
            
            // Show loading state, hide everything else
            loadingElement.style.display = 'block';
            
            try {
                const [suggestion, explanation] = await getFixSuggestions(formatPrompt(issue), this._userOllamaUrl, "mistral");
                this.suggestion = suggestion;

                if (suggestion !== 'Error') {
                    
                    // Hide loading and show results with controls
                    loadingElement.style.display = 'none';
                    aiSuggestion.style.display = 'block';
                    applyButton.style.display = 'block';
                    infoIcon.style.display = 'block';
                    
                    aiSuggestion.textContent = suggestion;
                    explanationContent.textContent = explanation;

                    // Add click handler for info icon
                    infoIcon.onclick = () => {
                        explanationContent.style.display = 
                            explanationContent.style.display === 'none' ? 'block' : 'none';
                    }
                } else {
                    loadingElement.style.display = 'none';
                    aiSuggestion.style.display = 'block';
                    aiSuggestion.textContent = 'Error getting suggestions. Please try again.';
                }
            } catch (error) {
                console.log(error);
            }
        };

        // Add click handlers for the new buttons
        const applyButton = suggestionContainer.querySelector('.jp-A11yPanel-applyButton') as HTMLElement;
        applyButton.onclick = () => {
            this.applySuggestion();
            suggestionContainer.style.display = 'none';
        };
    
        this.node.appendChild(buttonContainer);
        this.node.appendChild(suggestionContainer);
    }

    private navigateToCell(index: number): void {

        console.log(index);
        if (!this.currentNotebook) {
            console.warn('No active notebook found');
            return;
        }

        // Use the notebook panel's content directly instead of querying document
        const cells = this.currentNotebook.content.widgets;
        const targetCell = cells[index];

        if (!targetCell) {
            console.warn(`Cell at index ${index} not found`);
            return;
        }

        // Scroll the cell into view
        targetCell.node.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the cell
        targetCell.node.style.transition = 'background-color 0.5s ease';
        targetCell.node.style.backgroundColor = '#FFFFC5';

        // Remove highlight after delay
        setTimeout(() => {
            targetCell.node.style.backgroundColor = '';
        }, 2000);
    }

    private async applySuggestion(): Promise<void> {
        if (!this.currentNotebook || !this.suggestion) return;

        const cell = this.currentNotebook.content.widgets[this.cellIndex];
        if (cell && cell.model) {
            // Apply the suggestion
            cell.model.sharedModel.setSource(this.suggestion);
        }
    }
}

class A11yMainPanel extends Widget {
    constructor() {
        super();
        this.addClass('jp-A11yPanel');
        this.id = 'a11y-sidebar';
        
        const header = document.createElement('h2');
        header.textContent = 'Accessibility Checker';
        header.className = 'jp-A11yPanel-header';
        
        const accessibilityIcon = new LabIcon({
            name: 'a11y:accessibility',
            svgstr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#154F92" d="M256 48c114.953 0 208 93.029 208 208 0 114.953-93.029 208-208 208-114.953 0-208-93.029-208-208 0-114.953 93.029-208 208-208m0-40C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 56C149.961 64 64 149.961 64 256s85.961 192 192 192 192-85.961 192-192S362.039 64 256 64zm0 44c19.882 0 36 16.118 36 36s-16.118 36-36 36-36-16.118-36-36 16.118-36 36-36zm117.741 98.023c-28.712 6.779-55.511 12.748-82.14 15.807.851 101.023 12.306 123.052 25.037 155.621 3.617 9.26-.957 19.698-10.217 23.315-9.261 3.617-19.699-.957-23.316-10.217-8.705-22.308-17.086-40.636-22.261-78.549h-9.686c-5.167 37.851-13.534 56.208-22.262 78.549-3.615 9.255-14.05 13.836-23.315 10.217-9.26-3.617-13.834-14.056-10.217-23.315 12.713-32.541 24.185-54.541 25.037-155.621-26.629-3.058-53.428-9.027-82.141-15.807-8.6-2.031-13.926-10.648-11.895-19.249s10.647-13.926 19.249-11.895c96.686 22.829 124.283 22.783 220.775 0 8.599-2.03 17.218 3.294 19.249 11.895 2.029 8.601-3.297 17.219-11.897 19.249z"/></svg>'
        });

        this.title.icon = accessibilityIcon;
        this.title.caption = 'Accessibility';
        
        const analyzeButton = document.createElement('button');
        analyzeButton.className = 'jp-Button';
        analyzeButton.textContent = 'Analyze Notebook';
        analyzeButton.onclick = () => this.analyzeCurrentNotebook();
        
        this.issuesContainer = document.createElement('div');
        this.issuesContainer.className = 'jp-A11yPanel-issues';
        
        this.node.appendChild(header);
        this.node.appendChild(analyzeButton);
        this.node.appendChild(this.issuesContainer);
    }

    private issuesContainer: HTMLElement;
    private currentNotebook: NotebookPanel | null = null;

    setNotebook(notebook: NotebookPanel) {
        this.currentNotebook = notebook;
    }

    private async analyzeCurrentNotebook() {
        if (!this.currentNotebook) return;
        
        this.issuesContainer.innerHTML = '';
        console.log('Analyzing current notebook');
        const issues = await analyzeCellsAccessibility(this.currentNotebook);
        if (issues.length > 0) {
            console.log(issues.length);
            issues.forEach(issue => {
                console.log(issue.axeResults.map(result => result.id).join(', '));
            });
        } else {
            console.log('No issues found');
        }
        issues.forEach(issue => {
            const issueWidget = new CellIssueWidget(issue, this.currentNotebook!);
            this.issuesContainer.appendChild(issueWidget.node);
        });
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
