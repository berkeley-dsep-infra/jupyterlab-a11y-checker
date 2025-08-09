import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';
import { ILabShell } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { MainPanelWidget } from './components/mainpanelWidget';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-a11y-checker:plugin',
  autoStart: true,
  requires: [ILabShell, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    settingRegistry: ISettingRegistry
  ) => {
    console.log('JupyterLab extension jupyterlab-a11y-checker is activated!');

    const panel = new MainPanelWidget(settingRegistry);

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
