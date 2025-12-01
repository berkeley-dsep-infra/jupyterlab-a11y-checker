import { NotebookPanel } from '@jupyterlab/notebook';
import { IGeneralCell } from '../core/types.js';

/**
 * Converts JupyterLab NotebookPanel widgets into an environment-agnostic array of accessible cells.
 * This allows detection logic to run on pure data without depending on JupyterLab UI widgets.
 */
export function notebookToGeneralCells(panel: NotebookPanel): IGeneralCell[] {
  return panel.content.widgets.map((cell, index) => {
    // Get source from shared model for latest content (real-time/unsaved changes)
    const source = cell.model.sharedModel.getSource();
    // Cast type explicitly to match our strict union type
    const type = cell.model.type as 'code' | 'markdown' | 'raw';

    // Extract attachments if they exist
    // cell.model.toJSON() returns an ICell object which might have attachments
    const cellData = cell.model.toJSON() as any;
    const attachments = cellData.attachments;

    return {
      cellIndex: index,
      type,
      source,
      attachments
    };
  });
}
