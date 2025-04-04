import { NotebookPanel } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';
import { PageConfig } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { issueToCategory } from '../utils/issueCategories';
import { LabIcon } from '@jupyterlab/ui-components';
import { CellCategoryWidget } from './CategoryWidget';
import { analyzeCellsAccessibility } from '../services/AccessibilityAnalyzer';
import { pullOllamaModel } from '../services/AIService';

export class A11yMainPanel extends Widget {
    private categoriesContainer: HTMLElement | null = null;
    private currentNotebook: NotebookPanel | null = null;
    private noticeContent: HTMLElement | null = null;
    private aiToggleButton: HTMLButtonElement | null = null;
    private aiEnabled: boolean = false;
    private isModelPulled: boolean = false;

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
            
            if (!this.aiEnabled && !this.isModelPulled) {
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
                    this.isModelPulled = true;
                    
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