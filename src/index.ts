import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the a11y-checker extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'a11y-checker:plugin',
  description: 'A JupyterLab extension that checks and suggests fixes for a11y issues.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension a11y-checker is activated!');
  }
};

export default plugin;
