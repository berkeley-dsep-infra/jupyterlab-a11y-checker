import { describe, it, expect } from "vitest";
import {
  stripHtmlTags,
  escapeHtmlAttr,
  findAllHtmlTags,
  stripHtmlComments,
} from "../utils/sanitize.js";

describe("stripHtmlTags", () => {
  it("strips simple tags", () => {
    expect(stripHtmlTags("<b>bold</b>")).toBe("bold");
  });

  it("strips nested tags", () => {
    expect(stripHtmlTags("<a><b>x</b></a>")).toBe("x");
  });

  it("handles string with no tags", () => {
    expect(stripHtmlTags("plain text")).toBe("plain text");
  });
});

describe("escapeHtmlAttr", () => {
  it("escapes quotes and special chars", () => {
    expect(escapeHtmlAttr("a\"b'c")).toBe("a&quot;b&#39;c");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtmlAttr("<script>")).toBe("&lt;script&gt;");
  });
});

describe("stripHtmlComments", () => {
  it("strips a single comment", () => {
    expect(stripHtmlComments("a<!-- comment -->b")).toBe("ab");
  });

  it("strips multiple comments", () => {
    expect(stripHtmlComments("a<!-- 1 -->b<!-- 2 -->c")).toBe("abc");
  });

  it("returns input unchanged when no comments", () => {
    expect(stripHtmlComments("<b>bold</b>")).toBe("<b>bold</b>");
  });
});

describe("findAllHtmlTags", () => {
  it("finds a tag pair", () => {
    const result = findAllHtmlTags("<a>x</a>", "a");
    expect(result).toHaveLength(1);
    expect(result[0].match).toBe("<a>x</a>");
  });

  it("finds multiple tag pairs", () => {
    const result = findAllHtmlTags("<div>a</div><div>b</div>", "div");
    expect(result).toHaveLength(2);
  });

  it("returns empty for no matches", () => {
    const result = findAllHtmlTags("<p>text</p>", "div");
    expect(result).toHaveLength(0);
  });
});
