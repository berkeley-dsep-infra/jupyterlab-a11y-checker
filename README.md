# jupyterlab-a11y-checker

[![jupyterlab-a11y-checker](https://marketplace.orbrx.io/api/badge/jupyterlab-a11y-checker?metric=downloads&leftColor=%23555&rightColor=%23F37620&style=flat)](https://marketplace.orbrx.io/extensions/jupyterlab-a11y-checker)

jupyterLab-a11y-checker is an acessibility engine for Jupyter Notebooks, assisting authors detect and fix accessibility issues, aligning with WCAG 2.1 AA guidelines. It combines the strengths of [axe-core](https://github.com/dequelabs/axe-core), a widely used accessibility engine, with custom notebook-specific detection algorithms that address issues axe cannot reliably cover in JupyterLab.

Users can use this tool in two ways:

1. As a JupyterLab extension. It not only provides accessibility scan results in real-time but also provides actionable suggestions to fix them.
2. As a CLI tool. It can be ran independently of JupyterLab, for instance in GitHub Actions, to maintain accessible notebooks.

## Core Detection Engine

While there are many possible a11y issues in Jupyter Notebooks, we prioritized the issues discussed in a study on Jupyter Notebooks, [Notably Inaccessible — Data Driven Understanding of Data Science Notebook (In)Accessibility](https://arxiv.org/pdf/2308.03241). To address them, we implement custom detection logic for the issues listed in [Rule Description](./doc/rules.md). In addition, we integrate axe-core to detect other standard accessibility issues beyond these main issues, which are listed in [Axe Rule Description](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md). Currently, axe is supported in the extension but not in the CLI tool.

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

We’re building this tool for the community, and we’d love your help! Whether it’s adding new accessibility checks, or refining the fix suggestions, your contributions can help this project make a broader impact.

#### Project Structure

- **`packages/core`**: Contains the core accessibility analysis logic, parsers, and utilities. This package is shared between the CLI and the Extension.
- **`packages/cli`**: The command-line interface tool. It bundles the core logic to run independently of JupyterLab.
- **`packages/extension`**: The JupyterLab extension. It uses the core package to provide real-time accessibility checking within the notebook interface.

#### Build from Scratch

```bash
# Create an environment using anaconda navigator: <env-name>

conda activate <env-name>
pip install cookiecutter
python -m pip install jupyterlab notebook --pre
mamba install -c conda-forge nodejs=18
node -v #to check version

# <pull code>

# Install dependencies
jlpm install

# Build Core and Extension
jlpm build

# Install Extension
pip install -e packages/extension
jupyter labextension develop packages/extension --overwrite

# Verify
pip list
jupyter labextension list

jupyter lab --no-browser #run a jupyterlab server
```

#### Build from Temp Distribution

```bash
jlpm build:prod
npm pack #creates a tarball (*.tgz file) containing your project as it would be uploaded to the npm registry. This file can be shared and installed locally.
jupyter labextension install </path/to/your-package.tgz>


# ALTERNATIOVELY IF GIVEN A tar.gz file:

conda activate <env-name>
jupyter labextension install </path/to/your-package.tgz>
jupyter lab #this will open a local server of jupyterlab with all current extensions installed.
```

#### Pip Distribution

```bash
pip install twine

# create a ~/.pypirc file at root and add this to it:
[distutils]
index-servers =
	pypi

[pypi]
repository: https://upload.pypi.org/legacy/
username: __token__
password: your-api-token

#run this command and publish to pip.
twine upload your-package.whl
```

#### Development uninstall

```bash
pip uninstall jupyterlab_a11y_checker
```

#### Testing in a JupyterHub setup

- Build the Jupyter Lab extension with the latest changes

```bash
jlpm
jlpm build
jupyter lab build
```

- Package the extension as a wheel file (.whl)

```bash
python -m build
```

.whl file gets generated in the `dist/` directory

- Copy the .whl file to the server where JupyterHub is installed (or include it in a Dockerfile if using Docker)

- Install the .whl file:

```bash
pip install /path/to/your-extension.whl
```

- If the identical version of the extension is already installed then

```bash
pip uninstall extension-name
pip install /path/to/your-extension.whl
```

- Refresh the page for the changes to apply

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-a11y-checker` within that folder.

#### Running CLI from Source

If you are developing locally or want to run from the checked-out repository:

1. Build the packages:

   ```bash
   jlpm build
   ```

2. Run the CLI directly:

   ```bash
   ./packages/cli/dist/index.js test_notebooks/demo.ipynb
   ```

## Acknowledgements

| Name              | Role                           | GitHub Handle |
| ----------------- | ------------------------------ | ------------- |
| Chanbin Park      | Student Developer              | @chanbinski   |
| Vivian Liu        | Student Developer              | @vzliu        |
| Shreyas Rana      | Student Developer              | @ranashreyas  |
| Balaji Alwar      | Project Lead                   | @balajialg    |
| Ryan Lovett       | Volunteer (Jupyter Consultant) | @ryanlovett   |
| Joe Feria Galicia | Volunteer (a11y expert)        | NA            |
