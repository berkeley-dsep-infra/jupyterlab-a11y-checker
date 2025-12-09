import { IGeneralCell } from './types.js';

/**
 * Converts raw .ipynb JSON content into an environment-agnostic array of accessible cells.
 * This is for use in CLI or Node.js environments where JupyterLab widgets are not available.
 */
export function rawIpynbToGeneralCells(ipynbContent: any): IGeneralCell[] {
  if (!ipynbContent || !Array.isArray(ipynbContent.cells)) {
    console.warn('Invalid notebook content: "cells" array is missing.');
    return [];
  }

  return ipynbContent.cells.map((cell: any, index: number) => {
    // .ipynb source is usually an array of strings, but can be a string
    let source = '';
    if (Array.isArray(cell.source)) {
      source = cell.source.join('');
    } else if (typeof cell.source === 'string') {
      source = cell.source;
    }

    // Normalize cell type
    const type =
      cell.cell_type === 'markdown' ||
      cell.cell_type === 'code' ||
      cell.cell_type === 'raw'
        ? cell.cell_type
        : 'raw'; // Fallback

    return {
      cellIndex: index,
      type,
      source,
      attachments: cell.attachments
    };
  });
}
