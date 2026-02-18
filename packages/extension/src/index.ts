import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';
import { ILabShell } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { MainPanelWidget } from './components/mainpanelWidget.js';
import { analyzeCellsAccessibility } from '@berkeley-dsep-infra/a11y-checker-core';
import { buildLLMReport } from '@berkeley-dsep-infra/a11y-checker-core';
import { IGeneralCell } from '@berkeley-dsep-infra/a11y-checker-core';
import { notebookToGeneralCells } from './adapter.js';
import { PageConfig } from '@jupyterlab/coreutils';
import { BrowserImageProcessor } from './image-processor.js';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-a11y-checker:plugin',
  autoStart: true,
  requires: [ILabShell, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    settingRegistry: ISettingRegistry
  ) => {
    const panel = new MainPanelWidget(settingRegistry);

    labShell.add(panel, 'right');

    // Expand the a11y sidebar once the app is fully restored
    app.restored.then(() => {
      labShell.activateById(panel.id);
    });

    // Update current notebook when active widget changes
    labShell.currentChanged.connect(() => {
      const current = labShell.currentWidget;
      if (current instanceof NotebookPanel) {
        panel.setNotebook(current);
      }
    });

    app.commands.addCommand('jupyterlab-a11y-checker:scan-notebook', {
      label: 'Scan Notebook for Accessibility Issues',
      execute: async () => {
        const current = labShell.currentWidget;
        if (current instanceof NotebookPanel) {
          const accessibleCells: IGeneralCell[] =
            notebookToGeneralCells(current);

          const issues = await analyzeCellsAccessibility(
            accessibleCells,
            document,
            PageConfig.getBaseUrl(),
            new BrowserImageProcessor(),
            current.context.path
          );
          return buildLLMReport(issues);
        }
        return [];
      }
    });
  }
};

export default extension;
