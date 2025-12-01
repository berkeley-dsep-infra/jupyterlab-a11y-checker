import { createCanvas, loadImage } from 'canvas';
import { IImageProcessor } from '../core/types.js';
import fs from 'fs';
import path from 'path';

export class NodeImageProcessor implements IImageProcessor {
  async loadImage(src: string): Promise<any> {
    // Handle URLs and Data URIs
    if (src.startsWith('http') || src.startsWith('data:')) {
      return loadImage(src);
    }

    // Handle local files
    let resolvedPath = src;
    if (!path.isAbsolute(src)) {
      resolvedPath = path.resolve(process.cwd(), src);
    }

    if (!fs.existsSync(resolvedPath)) {
      // Try decoding URL encoded paths (e.g. space as %20)
      const decodedPath = decodeURIComponent(resolvedPath);
      if (fs.existsSync(decodedPath)) {
        resolvedPath = decodedPath;
      } else {
        throw new Error(`Image file not found: ${src}`);
      }
    }

    return loadImage(resolvedPath);
  }

  createCanvas(width: number, height: number): any {
    return createCanvas(width, height);
  }
}
