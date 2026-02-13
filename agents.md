# Agent Guide: jupyterlab-a11y-checker CLI

This document provides guidance for AI agents to effectively use the `jupyterlab-a11y-checker` CLI tool to audit Jupyter Notebooks for accessibility issues.

## Overview

The `jupyterlab-a11y-checker` repository provides an accessibility engine for Jupyter Notebooks that helps detect and report accessibility issues aligned with WCAG 2.1 AA guidelines.

### Repository Architecture

This repository is organized into three main packages:

1. **`packages/core`**: The core detection module that contains all accessibility analysis logic, parsers, and detection algorithms. This is the foundation that powers both applications.

2. **`packages/extension`**: A JupyterLab extension that provides real-time accessibility checking within the JupyterLab interface, with interactive fix suggestions and remediation tools.

3. **`packages/cli`**: A command-line interface tool that bundles the core detection logic to audit notebooks independently of JupyterLab. This is the tool that AI agents can use to perform accessibility audits.

### Using the CLI Tool

The CLI tool can be used as a standalone tool to audit notebooks without requiring JupyterLab to be running. This makes it ideal for:
- CI/CD pipelines and automated workflows
- Batch processing of multiple notebooks
- Integration with AI agents for accessibility analysis
- Pre-commit hooks and validation

## Quick Start

### Running the CLI Tool

The simplest way to run the accessibility checker is using `npx`:

```bash
npx @jupyterlab-a11y-checker/cli path/to/notebook.ipynb
```

### Multiple Files

You can check multiple notebooks at once:

```bash
npx @jupyterlab-a11y-checker/cli notebook1.ipynb notebook2.ipynb notebook3.ipynb
```

### Using Glob Patterns

To check all notebooks in a directory:

```bash
npx @jupyterlab-a11y-checker/cli **/*.ipynb
```

## CLI Options

### Standard Output (Human-Readable)

Default mode provides detailed, color-coded output:

```bash
npx @jupyterlab-a11y-checker/cli notebook.ipynb
```

**Output includes:**
- Total number of issues found
- Issues grouped by violation type
- Rule descriptions and WCAG references
- Cell index and type for each issue
- Content snippets showing the problematic content
- Links to documentation and remediation resources

### LLM-Friendly Output

For programmatic processing or LLM consumption, use the `-llm` flag:

```bash
npx @jupyterlab-a11y-checker/cli -llm notebook.ipynb
```

**Output format:**
- Clean JSON structure
- No color codes or human-friendly formatting
- Suitable for parsing and further processing

## Exit Codes

The CLI uses standard exit codes:
- **Exit 0**: No issues found, no errors
- **Exit 1**: Issues found OR errors occurred during processing

This makes it suitable for CI/CD pipelines and automated workflows.

## Accessibility Rules Detected

The tool detects the following categories of accessibility issues:

### 1. Image Issues
- **`image-missing-alt`**: Images without alt text (WCAG 1.1.1)

### 2. Heading Issues
- **`heading-missing-h1`**: No H1 heading in notebook (WCAG 2.4.2)
- **`heading-multiple-h1`**: Multiple H1 headings (WCAG 2.4.6)
- **`heading-duplicate-h2`**: Duplicate H2 headings (WCAG 2.4.6)
- **`heading-duplicate-h1-h2`**: H1 and H2 with same content (WCAG 2.4.6)
- **`heading-wrong-order`**: Incorrect heading hierarchy (WCAG 2.4.6)
- **`heading-empty`**: Empty heading tags (WCAG 2.4.6)

### 3. Table Issues
- **`table-missing-header`**: Tables without proper headers (WCAG 1.3.1)
- **`table-missing-caption`**: Tables without captions (WCAG 1.3.1)
- **`table-missing-scope`**: Missing scope attributes (WCAG 1.3.1)

### 4. Color Contrast Issues
- **`color-insufficient-cc-normal`**: Normal text with contrast ratio < 4.5:1 (WCAG 1.4.3)
- **`color-insufficient-cc-large`**: Large text with contrast ratio < 3:1 (WCAG 1.4.3)

### 5. Link Issues
- **`link-discernible-text`**: Non-descriptive link text (WCAG 2.4.4)

## Example Usage Scenarios

### Scenario 1: Audit a Single Notebook

```bash
npx @jupyterlab-a11y-checker/cli /path/to/analysis.ipynb
```

### Scenario 2: Audit All Notebooks in a Repository

```bash
cd /path/to/repository
npx @jupyterlab-a11y-checker/cli **/*.ipynb
```

### Scenario 3: Generate JSON Report for Processing

```bash
npx @jupyterlab-a11y-checker/cli -llm notebook.ipynb > report.json
```

### Scenario 4: Check Specific Notebooks in a Directory

```bash
npx @jupyterlab-a11y-checker/cli notebooks/chapter1/*.ipynb notebooks/chapter2/*.ipynb
```

## Integration with CI/CD

### GitHub Actions

Use the pre-built GitHub Action:

```yaml
steps:
  - uses: actions/checkout@v4
  
  - name: Scan notebooks for accessibility issues
    uses: berkeley-dsep-infra/jupyterlab-a11y-checker@main
    with:
      files: "**/*.ipynb"
```

### Custom CI Pipeline

```bash
# Install and run
npx @jupyterlab-a11y-checker/cli **/*.ipynb

# Check exit code
if [ $? -ne 0 ]; then
  echo "Accessibility issues found!"
  exit 1
fi
```

## Understanding the Output

### Standard Output Example

```
Analyzing /path/to/notebook.ipynb...
Found 3 issues in notebook.ipynb:

3 violations found for image-missing-alt:
    Description: Ensure the presence of alt text in images which are embedded in markdown.
    WCAG Reference: WCAG 1.1.1
  - Cell 2 (markdown):
    Content: "![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
```

### LLM Output Example

```json
{
  "totalIssues": 3,
  "issuesByViolation": {
    "image-missing-alt": [
      {
        "violationId": "image-missing-alt",
        "cellIndex": 2,
        "cellType": "markdown",
        "issueContentRaw": "![](data:image/png;base64,...)",
        "customDescription": "Image missing alt text"
      }
    ]
  }
}
```

## Common Agent Workflows

### Workflow 1: Audit and Report

1. Receive notebook path from user
2. Run: `npx @jupyterlab-a11y-checker/cli <path>`
3. Parse output to identify issues
4. Summarize findings for user
5. Suggest remediation steps based on rule descriptions

### Workflow 2: Batch Processing

1. Identify all notebooks in a directory/repository
2. Run: `npx @jupyterlab-a11y-checker/cli **/*.ipynb`
3. Collect all issues across notebooks
4. Generate summary report
5. Prioritize issues by severity/frequency

### Workflow 3: Pre-Commit Validation

1. Identify changed/new notebook files
2. Run accessibility check on those files
3. Report issues before allowing commit
4. Provide fix suggestions

## Remediation Guidance

When issues are found, agents should:

1. **Identify the violation type** from the output
2. **Reference the WCAG guideline** for context
3. **Suggest specific fixes** based on the rule:
   - **image-missing-alt**: Add descriptive alt text to images
   - **heading-missing-h1**: Add a main H1 heading to the notebook
   - **heading-wrong-order**: Reorganize headings to follow proper hierarchy (H1 → H2 → H3)
   - **table-missing-header**: Add header rows/columns to tables
   - **link-discernible-text**: Replace generic link text (e.g., "click here") with descriptive text

4. **Point users to the JupyterLab extension** for interactive fixing:
   - PyPI: https://pypi.org/project/jupyterlab-a11y-checker/
   - Berkeley users: https://a11y.datahub.berkeley.edu/

## Resources

- **Rule Descriptions**: https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/blob/main/doc/rules.md
- **GitHub Repository**: https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker
- **PyPI Package**: https://pypi.org/project/jupyterlab-a11y-checker/
- **NPM Package**: https://www.npmjs.com/package/@jupyterlab-a11y-checker/cli

## Technical Details

- **Package Name**: `@jupyterlab-a11y-checker/cli`
- **Binary Name**: `jupyterlab-a11y-check`
- **Language**: TypeScript/Node.js
- **Input Format**: Jupyter Notebook (.ipynb) JSON files
- **Output Formats**: Human-readable (default) or JSON (`-llm` flag)

## Troubleshooting

### File Not Found
Ensure the path is correct and the file exists:
```bash
ls -la path/to/notebook.ipynb
```

### Invalid JSON Error
The notebook file may be corrupted. Verify it's valid JSON:
```bash
cat notebook.ipynb | python -m json.tool
```

### No Files Matching Pattern
When using glob patterns, ensure your shell expands them correctly:
```bash
# Use quotes to let npx handle the glob
npx @jupyterlab-a11y-checker/cli "**/*.ipynb"
```

## Version Information

Current CLI version: 0.2.5 (as of index.ts)

Check for updates:
```bash
npm view @jupyterlab-a11y-checker/cli version
```

---

**For Agents**: This tool is designed to be run non-interactively and is safe to execute automatically when users request accessibility audits on Jupyter Notebooks. Always use absolute paths or verify relative paths are correct before running.
