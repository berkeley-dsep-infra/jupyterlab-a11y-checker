import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';
import { ILabShell } from '@jupyterlab/application';
import { A11yMainPanel } from './components/MainPanel';

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
