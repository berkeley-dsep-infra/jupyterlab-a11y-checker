import { IImageProcessor } from '@berkeley-dsep-infra/a11y-checker-core';

/** Maximum time (ms) to wait for an image to load. */
const IMAGE_LOAD_TIMEOUT_MS = 10_000;

export class BrowserImageProcessor implements IImageProcessor {
  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      const timer = setTimeout(() => {
        img.src = ''; // Cancel pending load
        reject(
          new Error(
            `Image load timed out after ${IMAGE_LOAD_TIMEOUT_MS}ms: ${src}`
          )
        );
      }, IMAGE_LOAD_TIMEOUT_MS);

      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(
          new Error(`Failed to load image (network error or CORS): ${src}`)
        );
      };
      img.src = src;
    });
  }

  createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
}
