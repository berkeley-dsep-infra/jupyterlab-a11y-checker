# Notes on Detection

This document provides a comprehensive reference for every accessibility rule: what it detects, whether it maps to a WCAG success criterion or is a best practice, and why we use custom detection instead of axe-core.

---

## Part 1: Rule Tables

### WCAG-Enforced Rules

These rules map directly to WCAG 2.1 A or AA success criteria.

| No. | Rule ID                        | Description                                       | WCAG SC                                                                                                                                                                    | Level | Why custom detection over axe                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a  | `image-missing-alt`            | Images must have alt text                         | [1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html)                                                                                | A     | `marked` converts `![](url)` to `<img alt="">`. axe treats `alt=""` as a valid decorative image per the HTML spec, so it never flags missing alt text from markdown images. Custom detection operates on raw markdown source before this transformation occurs.                                                                                                                                         |
| 2f  | `heading-empty`                | Headings must have content                        | [1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html)                                                                    | A     | axe can detect this (`empty-heading` rule) and it works on `<div>` fragments. However, axe returns a DOM node target — not a markdown source offset. Our fix UI requires `cellIndex`, `offsetStart`, and `offsetEnd` to edit the cell in place. Building a reverse-mapping layer from rendered HTML nodes back to markdown positions would be fragile and lossy.                                        |
| 3a  | `table-missing-header`         | Tables need `<th>` elements                       | [1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html) (via [F91](https://www.w3.org/WAI/WCAG21/Techniques/failures/F91)) | A     | axe has a `td-has-header` rule, but it did not fire on our table fragments in testing. The rule appears to require larger or more complex tables, or a specific DOM context that a detached `<div>` doesn't satisfy. Custom detection reliably flags `<td>`-only tables regardless of size.                                                                                                             |
| 4a  | `color-insufficient-cc-normal` | Normal text contrast ratio must be at least 4.5:1 | [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)                                                                              | AA    | axe can only analyze CSS-styled DOM text via `getComputedStyle()`. It fundamentally cannot see text rendered inside raster images (`.png`, `.jpg`, base64 attachments). In notebooks, the primary contrast concern is matplotlib charts, screenshots, and diagram outputs — all raster images. _(Detection currently disabled due to reliability issues with the Tesseract.js OCR approach.)_           |
| 4b  | `color-insufficient-cc-large`  | Large text contrast ratio must be at least 3:1    | [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)                                                                              | AA    | Same as above.                                                                                                                                                                                                                                                                                                                                                                                          |
| 5a  | `link-discernible-text`        | Links need descriptive text                       | [2.4.4 Link Purpose (In Context)](https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html)                                                                | A     | axe's `link-name` rule only catches empty `<a>` elements with no accessible name. It does not detect vague link text ("click here", "read more") or URLs used as link text, which are the more common issues in notebooks. Our detection also operates on raw markdown `[text](url)` syntax, catching issues before `marked` renders them to HTML. axe covers roughly 30% of what our detector catches. |

### Best Practice Rules

These rules do not map to a WCAG A or AA success criterion. They are best practices
that improve accessibility for screen reader users and document navigation.

| No. | Rule ID                   | Description                     | Related WCAG                                                                                                | Why it's best practice, not WCAG                                                                                                                                                                                                                                                                                                                                                    | Why custom detection over axe                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2a  | `heading-missing-h1`      | First cell should start with H1 | [2.4.2 Page Titled](https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html) (A)                       | SC 2.4.2 requires a `<title>` element, not an `<h1>`. TPGi confirms: "absence of an `<h1>` does not represent a WCAG failure." Having an H1 is a widely recommended convention for screen reader navigation but not a WCAG A/AA requirement.                                                                                                                                        | axe's `page-has-heading-one` does not fire on `<div>` fragments, and testing confirmed it also fails on a full `<html><body>` document. No axe configuration fixes this.                                                                                                                                                                                                                                               |
| 2b  | `heading-multiple-h1`     | Only one H1 per notebook        | [2.4.6 Headings and Labels](https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html) (AA)      | TPGi confirms: "having more than one `<h1>` — while potentially confusing — does not represent a WCAG failure." Only AAA criterion 2.4.10 addresses heading structure requirements.                                                                                                                                                                                                 | No axe rule exists for detecting multiple H1 elements.                                                                                                                                                                                                                                                                                                                                                                 |
| 2c  | `heading-duplicate-h2`    | No duplicate H2 content         | [2.4.6 Headings and Labels](https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html) (AA)      | SC 2.4.6 requires headings to be _descriptive_, but does not prohibit identical text across headings. TPGi notes duplicate headings "may be a sign of an illogical heading structure" but are context-dependent and not an automatic failure. Duplicate headings are a usability concern for screen reader heading lists, not an explicit WCAG failure.                             | No axe rule exists for duplicate heading content.                                                                                                                                                                                                                                                                                                                                                                      |
| 2d  | `heading-duplicate-h1-h2` | H1 and H2 must differ           | [2.4.6 Headings and Labels](https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html) (AA)      | Same reasoning as above.                                                                                                                                                                                                                                                                                                                                                            | No axe rule exists.                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2e  | `heading-wrong-order`     | No skipping heading levels      | [1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html) (A) | TPGi confirms: "Missing a heading level doesn't fail WCAG." W3C WAI states: "if a subsection starts with an h5, its lower position is represented in the markup, and this meets SC 1.3.1." Only AAA criterion [2.4.10 Section Headings](https://www.w3.org/WAI/WCAG21/Understanding/section-headings.html) requires strict hierarchy.                                               | axe's `heading-order` can detect this on a combined `<div>`, but returns DOM nodes with no cell attribution or markdown source offsets. Our fix UI needs `cellIndex`, `offsetStart`/`offsetEnd`, and `previousHeadingLevel` metadata. Additionally, cross-cell heading skips require all cells in one DOM, then a mapping layer to attribute violations back to individual cells — axe provides no mechanism for this. |
| 3b  | `table-missing-caption`   | Tables need `<caption>`         | [1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html) (A) | `<caption>` is a W3C _sufficient technique_ ([H39](https://www.w3.org/WAI/WCAG21/Techniques/html/H39)) for satisfying 1.3.1, not a strict requirement. A table can satisfy 1.3.1 through other means (e.g., `aria-describedby`, surrounding text). Requiring `<caption>` is stricter than what WCAG mandates.                                                                       | No axe rule exists for missing `<caption>`.                                                                                                                                                                                                                                                                                                                                                                            |
| 3c  | `table-missing-scope`     | Headers need `scope` attribute  | [1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html) (A) | `scope` is a W3C _sufficient technique_ ([H63](https://www.w3.org/WAI/WCAG21/Techniques/html/H63)) for satisfying 1.3.1. Per [F91](https://www.w3.org/WAI/WCAG21/Techniques/failures/F91), `scope` is one of four acceptable mechanisms and is only specifically needed for tables with more than a single row or column of headers. For simple tables, `<th>` alone is sufficient. | axe does not require `scope` on simple tables and did not flag its absence in testing.                                                                                                                                                                                                                                                                                                                                 |

---

## Part 2: Why axe-core Falls Short for Jupyter Notebooks

axe-core is the industry-standard accessibility testing engine, trusted by millions of
developers. But it was designed for web pages with a live DOM, not for Jupyter notebooks.
When applied to notebook content, it fails systematically across four categories — and
even where it _can_ detect an issue, it lacks the metadata our tool needs to fix it.

### Problem 1: Rendered HTML Does Not Reflect the Author's Intent

axe-core operates on rendered HTML. The natural approach would be to extract the
already-rendered HTML from JupyterLab's DOM and run axe against it. We tried this, but
JupyterLab's rendering pipeline introduces its own transformations that further obscure
the author's original content. For example, when an image has an empty alt text,
JupyterLab injects placeholder text into the `alt` attribute that has no meaningful
value — making axe believe descriptive alt text is present when the author actually
provided none. These silent mutations meant that even the live rendered DOM could not be
trusted as a faithful representation of the author's intent.

To get a clean HTML representation, we instead parse the raw markdown source ourselves
using `marked`. But this introduces its own problem: `![](image.png)` becomes
`<img alt="">`. The HTML spec treats `alt=""` as an intentional declaration that the
image is decorative. axe correctly respects this — but in a notebook, an empty alt
almost always means the author forgot to write one, not that the image is decorative.
axe will **never** flag this.

Either way — JupyterLab's rendered DOM or our own `marked` output — the HTML that axe
sees does not match what the author actually wrote. axe analyzes the _rendered artifact_,
but the _authoring intent_ (and the mistakes) live in the raw markdown source. Custom
detection must operate directly on that source to catch what axe cannot.

### Problem 2: axe-core Output Lacks Cell Attribution and Source Offsets

Even in the cases where axe _can_ detect an issue (empty headings, heading order, empty
links), its output is a DOM node reference:

```json
{
  "target": ["h4"],
  "html": "<h4></h4>"
}
```

This tells you _what_ the violating element is, but not _where_ it is in the notebook.
Our fix UI needs:

- `cellIndex` — which notebook cell contains the issue
- `offsetStart` / `offsetEnd` — character positions in the raw markdown
- Rule-specific metadata (e.g., `previousHeadingLevel` for heading-order fixes)

axe provides none of this. For notebook-wide rules like heading hierarchy, axe can
detect issues if all cells are concatenated into a single DOM — rules like
`heading-order` fire correctly. But then axe reports violations against DOM nodes with
no information about which cell that node came from.

Custom detection, by contrast, traverses the cells directly and returns all of the above
for each issue — enabling the fix UI to navigate the user to the exact cell and
highlight the exact text that needs to be changed. Building a reverse-mapping layer from
rendered DOM nodes back to markdown source positions would be fragile (HTML-to-markdown
mapping is lossy and order-dependent) and would still require custom code for every
rule — defeating the purpose of delegating to axe.

### Problem 3: axe-core Lacks Rules for Accessibility Best Practices

axe-core focuses on WCAG success criteria and a limited set of best-practice rules. It
does not cover many of the best practices recommended by accessibility experts — practices
that, while not strict WCAG A/AA failures, significantly improve the experience for
assistive technology users:

- **Missing `<caption>` on tables** — axe has no caption rule, though captions are a
  recommended technique (H39) for helping screen reader users understand a table's purpose
- **`<th>` without `scope`** — axe doesn't require it on simple tables, though
  accessibility experts recommend it for clarity (H63)
- **`<td>`-only tables with no `<th>`** — `td-has-header` didn't fire on our fragments
- **Vague link text** ("click here", "read more", bare URLs) — axe has no vague-text
  rule; `link-name` only catches completely empty links
- **Duplicate heading content** — no axe rule exists, though accessibility experts flag
  this because screen reader users navigating via heading lists see ambiguous entries
- **Multiple H1s** — not checked by axe, though a single H1 is widely recommended for
  document structure clarity

These best practices are consistently cited by accessibility experts and guidelines from
universities and research institutions as important for inclusive document authoring,
even though they fall outside axe-core's rule set.

### Summary

| Problem                                               | Impact                                                                                                                                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendered HTML doesn't reflect author intent           | axe cannot detect the most common notebook issue — missing alt text from markdown images — because the markdown-to-HTML transformation launders the violation into valid HTML. JupyterLab's own rendering adds further mutations. |
| axe output lacks cell attribution and source offsets  | axe returns DOM nodes, not notebook cell indices or markdown character positions. The fix UI cannot navigate users to the right cell or highlight the text to edit without a fragile reverse-mapping layer.                       |
| axe lacks rules for expert-recommended best practices | Accessibility experts and institutional guidelines recommend checks (table captions, heading hierarchy, vague link text, duplicate headings) that axe has no rules for. Custom detection is the only path.                        |

axe-core remains in the pipeline as a catch-all for any WCAG violations that survive
the markdown-to-HTML transformation and aren't covered by custom detection (e.g., raw
HTML `<img>` tags without `alt`, empty `<a>` elements). But for the 13 rules JupyCheck
targets, custom detection on the raw markdown source is required for accurate, actionable
results.

---

## References

- [Understanding SC 1.1.1: Non-text Content](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html)
- [Understanding SC 1.3.1: Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html)
- [Understanding SC 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Understanding SC 2.4.2: Page Titled](https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html)
- [Understanding SC 2.4.4: Link Purpose (In Context)](https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html)
- [Understanding SC 2.4.6: Headings and Labels](https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html)
- [Understanding SC 2.4.10: Section Headings](https://www.w3.org/WAI/WCAG21/Understanding/section-headings.html)
- [F91: Failure for not correctly marking up table headers](https://www.w3.org/WAI/WCAG21/Techniques/failures/F91)
- [H39: Using caption elements](https://www.w3.org/WAI/WCAG21/Techniques/html/H39)
- [H63: Using the scope attribute](https://www.w3.org/WAI/WCAG21/Techniques/html/H63)
- [ACT Rule ffd0e9: Heading has non-empty accessible name](https://www.w3.org/WAI/standards-guidelines/act/rules/ffd0e9/proposed/)
- [TPGi: Heading off confusion — When do headings fail WCAG?](https://www.tpgi.com/heading-off-confusion-when-do-headings-fail-wcag/)
- `experimental/jupycheck/axe-test.mjs` — test script that produced the axe detection results
