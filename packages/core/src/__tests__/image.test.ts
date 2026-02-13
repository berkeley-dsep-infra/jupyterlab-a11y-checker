import { describe, it, expect } from "vitest";
import { detectImageIssuesInCell } from "../detection/category/image.js";
import { IImageProcessor } from "../types.js";

const noopImageProcessor: IImageProcessor = {
  loadImage: async () => ({}),
  createCanvas: () => ({}),
};

async function detectImages(markdown: string) {
  return detectImageIssuesInCell(
    markdown,
    0,
    "markdown",
    "", // notebookPath
    "", // baseUrl (empty = skip OCR)
    noopImageProcessor,
  );
}

describe("detectImageIssuesInCell", () => {
  it("flags markdown image missing alt text", async () => {
    const issues = await detectImages("![](https://example.com/img.png)");
    expect(issues).toHaveLength(1);
    expect(issues[0].violationId).toBe("image-missing-alt");
  });

  it("passes markdown image with alt text", async () => {
    const issues = await detectImages(
      "![A photo](https://example.com/img.png)",
    );
    expect(issues).toHaveLength(0);
  });

  it("flags HTML img without alt attribute", async () => {
    const issues = await detectImages('<img src="x.png">');
    expect(issues).toHaveLength(1);
    expect(issues[0].violationId).toBe("image-missing-alt");
  });

  it("flags HTML img with empty alt", async () => {
    const issues = await detectImages('<img src="x.png" alt="">');
    expect(issues).toHaveLength(1);
  });

  it("passes HTML img with alt text", async () => {
    const issues = await detectImages('<img src="x.png" alt="photo">');
    expect(issues).toHaveLength(0);
  });

  it("flags only images missing alt when multiple present", async () => {
    const issues = await detectImages("![alt](a.png)\n![](b.png)");
    expect(issues).toHaveLength(1);
  });

  // P0 fix (Commit 1b): unquoted alt attribute is now recognized
  it("passes HTML img with unquoted alt attribute", async () => {
    const issues = await detectImages('<img alt=photo src="x.png">');
    expect(issues).toHaveLength(0);
  });
});
