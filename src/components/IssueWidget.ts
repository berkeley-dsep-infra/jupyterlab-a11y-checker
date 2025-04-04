import { NotebookPanel } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';
import { PageConfig } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { CellAccessibilityIssue } from '../utils/types';
import { formatPrompt, getFixSuggestions, getImageAltSuggestion } from '../services/AIService';

export class CellIssueWidget extends Widget {
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
                <div class="image-alt-ui-container">
                    <input type="text" class="jp-a11y-input" placeholder="Input alt text here...">
                    <div class="alt-text-buttons">
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
        if (issue.axeViolation.id === 'image-alt') {
            suggestButton?.addEventListener('click', () => this.fillInAISuggestion());
        } else {
            suggestButton?.addEventListener('click', () => this.getAISuggestions(this.issue));
        }
        applyButton?.addEventListener('click', () => this.applySuggestion());

        // Add event listener for apply-alt-button
        if (this.issue.axeViolation.id === 'image-alt' && applyAltButton) {
            applyAltButton.addEventListener('click', () => this.applyAltText());
        }
    }

    private async fillInAISuggestion(): Promise<void> {
        const altTextInput = this.node.querySelector('.jp-a11y-input') as HTMLInputElement;
        if (!altTextInput) return;

        // Save the original placeholder text
        const originalPlaceholder = altTextInput.placeholder;

        // Create loading overlay (so we can see the loading state)
        const loadingOverlay = document.createElement('div');
        loadingOverlay.style.position = 'absolute';
        loadingOverlay.style.left = '8px';  // Matching input text padding
        loadingOverlay.style.top = '8px'; 
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.gap = '8px';
        loadingOverlay.style.color = '#666';
        loadingOverlay.innerHTML = `
            <svg class="icon loading" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z"/>
            </svg>
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
        altTextInput.style.color = 'transparent';  // Hide input text while loading
        altTextInput.placeholder = '';  // Clear placeholder while showing loading overlay

        try {
            const suggestion = await getImageAltSuggestion(this.issue,this._userOllamaUrl, "mistral");
            if (suggestion !== 'Error') {
                // Extract alt text from the suggestion, handling both single and double quotes
                const altMatch = suggestion.match(/alt=['"]([^'"]*)['"]/);
                if (altMatch && altMatch[1]) {
                    altTextInput.value = altMatch[1];
                } else {
                    altTextInput.value = suggestion;  // Fallback to full suggestion if no alt text found
                }
            } else {
                altTextInput.placeholder = "Error getting suggestions. Please try again.";
            }
        } catch (error) {
            console.error(error);
            altTextInput.placeholder = "Error getting suggestions. Please try again.";
        } finally {
            altTextInput.disabled = false;
            altTextInput.style.color = '';  // Restore text color
            loadingOverlay.remove();  // Remove loading overlay
            if (altTextInput.value) {
                altTextInput.placeholder = originalPlaceholder;
            }
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