# jupyterlab-a11y-checker

[![jupyterlab-a11y-checker](https://marketplace.orbrx.io/api/badge/jupyterlab-a11y-checker?metric=downloads&leftColor=%23555&rightColor=%23F37620&style=flat)](https://marketplace.orbrx.io/extensions/jupyterlab-a11y-checker)

jupyterLab-a11y-checker is an acessibility engine for Jupyter Notebooks, assisting authors detect and fix accessibility issues, aligning with WCAG 2.1 AA guidelines.

Users can use this tool in two ways:

1. As a JupyterLab extension. It not only provides accessibility scan results in real-time but also provides actionable suggestions to fix them.
2. As a CLI tool. It can be ran independently of JupyterLab, for instance in GitHub Actions, to maintain accessible notebooks.

## Core Detection Engine

While there are many possible a11y issues in Jupyter Notebooks, we prioritized the issues discussed in a [accessibility study on Jupyter Notebooks](https://arxiv.org/pdf/2308.03241), as well as [accessibility guideline for developers](https://docs.google.com/spreadsheets/d/1TBE4BhcmAN2wQHGYSvRGGdyL2pWTVw4cLFU3mARMfjM/edit?gid=0#gid=0). The core issues we detect are listed in [Rule Description](./doc/rules.md).

Our detection engine relies on custom detection logic. In addition, we integrate [axe-core](https://github.com/dequelabs/axe-core) to detect other standard accessibility issues beyond these main issues, listed in [Axe Rule Description](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md). For details on why we use custom detection over axe-core for our core rules, see [Notes on Detection](./doc/notes-on-detection.md). Currently, axe is supported in the extension but not in the CLI tool.

## JupyterLab Extension

Here's a snapshot of the extension:

![On JupyterLab, this extension is detecting accessibility issues. On the left panel, there is a sample Jupyter Notebook, while on the right side, this extension is displaying image and heading related issues.](doc/README_IMG.png)

### Issue Resolution

We provide a user interface tailored to each issue, such as a text field for adding alt-text, a dropdown for fixing header issues, etc. The fix interfaces are listed in [Fix Interface Description](./doc/fix-interfaces.md).

#### AI Assistance

To simplify the remediation process, we integrate both a Large Language Model (LLM) and a Vision-Language Model (VLM) to generate accessibility recommendations within several fix interfaces. Users can configure these models by providing their API endpoint, API key, and model name in: `Settings > Settings Editor > A11y Checker Settings`.

## CLI Tool

### Running via NPM

You can run the accessibility checker directly on your notebooks without installing anything using `npx`:

```bash
npx @jupyterlab-a11y-checker/cli path/to/your_notebook.ipynb
```

**Options:**

- `[files...]`: A space-separated list of paths to `.ipynb` files. You can also use glob patterns (e.g. `**/*.ipynb`) to check multiple files.
- `-llm`: Output a JSON summary suitable for LLM processing (no human-friendly logs).

### GitHub Action Usage

You can use this tool directly in your GitHub Workflows to check notebooks automatically on every push. Here is a sample workflow to scan all notebooks in your repository:

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Scan notebooks for accessibility issues
    uses: berkeley-dsep-infra/jupyterlab-a11y-checker@main
    with:
      files: "**/*.ipynb"
```

## Getting Started

### Installing

You can install the extension directly via pip:

```bash
pip install jupyterlab-a11y-checker
```

Find the package on PyPI. [Link to PyPI Package](https://pypi.org/project/jupyterlab-a11y-checker/).

### Contributing

We're building this tool for the community, and we'd love your help! Whether it's adding new accessibility checks, or refining the fix suggestions, your contributions can help this project make a broader impact.

See the [Contributing Guide](./doc/contributing.md) for project structure, build instructions, and development workflow.

## Acknowledgements

| Name              | Role                           | GitHub Handle |
| ----------------- | ------------------------------ | ------------- |
| Chanbin Park      | Student Developer              | @chanbinski   |
| Vivian Liu        | Student Developer              | @vzliu        |
| Shreyas Rana      | Student Developer              | @ranashreyas  |
| Balaji Alwar      | Project Lead                   | @balajialg    |
| Ryan Lovett       | Volunteer (Jupyter Consultant) | @ryanlovett   |
| Joe Feria Galicia | Volunteer (a11y expert)        | NA            |
