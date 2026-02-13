# Issue Descriptions

Below are the issues that we detect. On top of this, we run axe-core as well.

## Image

| No. | Rule ID           | Description                                                               | WCAG                 | Severity  |
| --- | ----------------- | ------------------------------------------------------------------------- | -------------------- | --------- |
| 1a  | image-missing-alt | Ensure the presence of alt text in images which are embedded in markdown. | WCAG 1.1.1 (Level A) | violation |

---

## Heading

| No. | Rule ID                 | Description                                             | WCAG                 | Severity      |
| --- | ----------------------- | ------------------------------------------------------- | -------------------- | ------------- |
| 2a  | heading-missing-h1      | Ensure the presence of H1 tag in a notebook             |                      | best-practice |
| 2b  | heading-multiple-h1     | Ensure there is only one H1 tag in a notebook           |                      | best-practice |
| 2c  | heading-duplicate-h2    | Ensure no two H2 headings share the same content        |                      | best-practice |
| 2d  | heading-duplicate-h1-h2 | Ensure no two H1 and H2 headings share the same content |                      | best-practice |
| 2e  | heading-wrong-order     | Ensure the order of heading is accurate                 |                      | best-practice |
| 2f  | heading-empty           | Ensure the heading content is non-empty                 | WCAG 1.3.1 (Level A) | violation     |

---

## Table

| No. | Rule ID               | Description                                               | WCAG                 | Severity      |
| --- | --------------------- | --------------------------------------------------------- | -------------------- | ------------- |
| 3a  | table-missing-header  | Ensure row and column headers are present in a table      | WCAG 1.3.1 (Level A) | violation     |
| 3b  | table-missing-caption | Ensure caption was added for a table                      |                      | best-practice |
| 3c  | table-missing-scope   | Ensure presence of `scope` attribute for rows and columns |                      | best-practice |

---

## Color

| No. | Rule ID                      | Description                                                                              | WCAG                  | Severity  |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------- | --------------------- | --------- |
| 4a  | color-insufficient-cc-normal | Ensure normal text in images have a contrast ratio of 4.5:1 and text contrast in general | WCAG 1.4.3 (Level AA) | violation |
| 4b  | color-insufficient-cc-large  | Ensure large text in images have a contrast ratio of 3:1                                 | WCAG 1.4.3 (Level AA) | violation |

---

## Link

| No. | Rule ID               | Description                                                    | WCAG                 | Severity  |
| --- | --------------------- | -------------------------------------------------------------- | -------------------- | --------- |
| 5a  | link-discernible-text | Ensure link text is descriptive (or aria-label is descriptive) | WCAG 2.4.4 (Level A) | violation |

## List

TBD
