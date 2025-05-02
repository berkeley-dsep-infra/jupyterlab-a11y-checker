import { Widget } from '@lumino/widgets';
import { NotebookPanel } from '@jupyterlab/notebook';
import { LabIcon } from '@jupyterlab/ui-components';

import { CellIssueWidget } from './issueWidget';

import { ICellIssue } from '../utils/types';
import { issueToCategory, issueCategoryNames } from '../utils/metadata';

import { analyzeCellsAccessibility } from '../utils/detection/base';

export class MainPanelWidget extends Widget {
  private aiEnabled: boolean = false;
  private currentNotebook: NotebookPanel | null = null;

  constructor() {
    super();
    this.addClass('a11y-panel');
    this.id = 'a11y-sidebar';
    const accessibilityIcon = new LabIcon({
      name: 'a11y:accessibility',
      svgstr:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#154F92" d="M256 48c114.953 0 208 93.029 208 208 0 114.953-93.029 208-208 208-114.953 0-208-93.029-208-208 0-114.953 93.029-208 208-208m0-40C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 56C149.961 64 64 149.961 64 256s85.961 192 192 192 192-85.961 192-192S362.039 64 256 64zm0 44c19.882 0 36 16.118 36 36s-16.118 36-36 36-36-16.118-36-36 16.118-36 36-36zm117.741 98.023c-28.712 6.779-55.511 12.748-82.14 15.807.851 101.023 12.306 123.052 25.037 155.621 3.617 9.26-.957 19.698-10.217 23.315-9.261 3.617-19.699-.957-23.316-10.217-8.705-22.308-17.086-40.636-22.261-78.549h-9.686c-5.167 37.851-13.534 56.208-22.262 78.549-3.615 9.255-14.05 13.836-23.315 10.217-9.26-3.617-13.834-14.056-10.217-23.315 12.713-32.541 24.185-54.541 25.037-155.621-26.629-3.058-53.428-9.027-82.141-15.807-8.6-2.031-13.926-10.648-11.895-19.249s10.647-13.926 19.249-11.895c96.686 22.829 124.283 22.783 220.775 0 8.599-2.03 17.218 3.294 19.249 11.895 2.029 8.601-3.297 17.219-11.897 19.249z"/></svg>'
    });

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
    const noticeContainer = this.node.querySelector('.notice-container');
    const noticeContent = this.node.querySelector(
      '.notice-content'
    ) as HTMLElement;
    const noticeToggleButton = this.node.querySelector('.notice-title');
    const noticeDeleteButton = this.node.querySelector('.notice-delete-button');
    const expandIcon = this.node.querySelector('.chevron');

    noticeToggleButton?.addEventListener('click', () => {
      noticeContent?.classList.toggle('hidden');
      expandIcon?.classList.toggle('expanded');
    });

    noticeDeleteButton?.addEventListener('click', () => {
      noticeContainer?.classList.add('hidden');
    });

    // Controls
    const aiControlButton = this.node.querySelector(
      '.ai-control-button'
    ) as HTMLButtonElement;
    const analyzeControlButton = this.node.querySelector(
      '.analyze-control-button'
    ) as HTMLButtonElement;
    const progressIcon = `
    <svg class="icon loading" viewBox="0 0 24 24">
        <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z"/>
    </svg>
    `;

    aiControlButton?.addEventListener('click', async () => {
      const aiIcon = '<span class="material-icons">auto_awesome</span>';

      this.aiEnabled = !this.aiEnabled;
      aiControlButton.innerHTML = `${aiIcon} Use AI : ${this.aiEnabled ? 'Enabled' : 'Disabled'}`;

      // Update every ai suggestion button visibility
      const suggestButtons = this.node.querySelectorAll('.suggest-button');
      suggestButtons.forEach(button => {
        (button as HTMLElement).style.display = this.aiEnabled
          ? 'flex'
          : 'none';
      });
    });

    analyzeControlButton?.addEventListener('click', async () => {
      if (!this.currentNotebook) {
        console.log('No current notebook found');
        return;
      }

      const analyzeControlButtonText = analyzeControlButton.innerHTML;

      const issuesContainer = this.node.querySelector(
        '.issues-container'
      ) as HTMLElement;
      issuesContainer.innerHTML = '';
      analyzeControlButton.innerHTML = `${progressIcon} Please wait...`;
      analyzeControlButton.disabled = true;

      try {
        // Identify issues
        const notebookIssues: ICellIssue[] = await analyzeCellsAccessibility(
          this.currentNotebook
        );

        if (notebookIssues.length === 0) {
          issuesContainer.innerHTML =
            '<div class="no-issues">No issues found</div>';
          return;
        }

        // Group issues by category
        const issuesByCategory = new Map<string, ICellIssue[]>();

        notebookIssues.forEach(notebookIssue => {
          const categoryName: string =
            issueToCategory.get(notebookIssue.violationId) || 'Other';
          if (!issuesByCategory.has(categoryName)) {
            issuesByCategory.set(categoryName, []);
          }
          issuesByCategory.get(categoryName)!.push(notebookIssue);
        });
        // Create widgets for each category
        for (const categoryName of issueCategoryNames) {
          const categoryIssues: ICellIssue[] =
            issuesByCategory.get(categoryName) || [];

          if (categoryIssues.length === 0) {
            continue;
          }

          const categoryWidget: HTMLDivElement = document.createElement('div');
          categoryWidget.classList.add('category');
          categoryWidget.innerHTML = `
            <h2 class="category-title">${categoryName}</h2>
            <hr>
            <div class="issues-list"></div>
          `;

          const issuesContainer = this.node.querySelector(
            '.issues-container'
          ) as HTMLElement;
          issuesContainer.appendChild(categoryWidget);

          const issuesList: HTMLDivElement = categoryWidget.querySelector(
            '.issues-list'
          ) as HTMLDivElement;

          categoryIssues.forEach(issue => {
            const issueWidget = new CellIssueWidget(
              issue,
              this.currentNotebook!.content.widgets[issue.cellIndex],
              this.aiEnabled
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
    // Allows for reanalyzing the notebook after a fix has been applied
    this.node.addEventListener('notebookReanalyzed', (event: Event) => {
      const customEvent = event as CustomEvent;
      const newIssues = customEvent.detail.issues;

      // Clear the issues container (so that the new issues are not added to the old issues)
      const issuesContainer = this.node.querySelector(
        '.issues-container'
      ) as HTMLElement;
      issuesContainer.innerHTML = '';

      if (newIssues.length === 0) {
        issuesContainer.innerHTML =
          '<div class="no-issues">No issues found</div>';
        return;
      }

      // Group issues by category
      const issuesByCategory = new Map<string, ICellIssue[]>();

      newIssues.forEach((notebookIssue: ICellIssue) => {
        const categoryName: string =
          issueToCategory.get(notebookIssue.violationId) || 'Other';
        if (!issuesByCategory.has(categoryName)) {
          issuesByCategory.set(categoryName, []);
        }
        issuesByCategory.get(categoryName)!.push(notebookIssue);
      });

      // Create widgets for each category
      for (const categoryName of issueCategoryNames) {
        const categoryIssues: ICellIssue[] =
          issuesByCategory.get(categoryName) || [];

        if (categoryIssues.length === 0) {
          continue;
        }

        const categoryWidget: HTMLDivElement = document.createElement('div');
        categoryWidget.classList.add('category');
        categoryWidget.innerHTML = `
          <h2 class="category-title">${categoryName}</h2>
          <hr>
          <div class="issues-list"></div>
        `;

        issuesContainer.appendChild(categoryWidget);

        const issuesList: HTMLDivElement = categoryWidget.querySelector(
          '.issues-list'
        ) as HTMLDivElement;

        categoryIssues.forEach(issue => {
          const issueWidget = new CellIssueWidget(
            issue,
            this.currentNotebook!.content.widgets[issue.cellIndex],
            this.aiEnabled
          );
          issuesList.appendChild(issueWidget.node);
        });
      }
    });
  }

  setNotebook(notebook: NotebookPanel) {
    this.currentNotebook = notebook;

    const issuesContainer = this.node.querySelector(
      '.issues-container'
    ) as HTMLElement;
    issuesContainer.innerHTML = '';
  }
}
