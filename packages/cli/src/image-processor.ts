import { IImageProcessor } from "@berkeley-dsep-infra/a11y-checker-core";

export class NodeImageProcessor implements IImageProcessor {
  async loadImage(src: string): Promise<any> {
    throw new Error("Image processing is disabled in CLI mode.");
  }

  createCanvas(width: number, height: number): any {
    throw new Error("Image processing is disabled in CLI mode.");
  }
}
