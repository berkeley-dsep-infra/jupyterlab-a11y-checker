# jupyterlab-a11y-checker

jupyterLab-a11y-checker is a JupyterLab extension that helps authors detect and fix accessibility issues in Jupyter Notebooks, aligning with WCAG 2.1 AA guidelines. It enables authors to identify accessibility issues in their notebooks and provides actionable suggestions to fix them. It combines the strengths of [axe-core](https://github.com/dequelabs/axe-core), a widely used accessibility engine, with custom notebook-specific detection algorithms that address issues axe cannot reliably cover in JupyterLab.

Here's how the extension looks like:

![On JupyterLab, this extension is detecting accessibility issues. On the left panel, there is a sample Jupyter Notebook, while on the right side, this extension is displaying image and heading related issues.](doc/README_IMG.png)

## Tool Description

### Issue Detection

While there are many possible a11y issues in Jupyter Notebooks, we prioritized the issues discussed in a study on Jupyter Notebooks, [Notably Inaccessible — Data Driven Understanding of Data Science Notebook (In)Accessibility](https://arxiv.org/pdf/2308.03241). To address them, we implement custom detection logic for the issues listed in [Rule Description](./doc/rules.md). In addition, we integrate axe-core to detect other standard accessibility issues beyond these main issues, which are listed in [Axe Rule Description](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md).

### Issue Resolution

We provide a user interface tailored to each issue, such as a text field for adding alt-text, a dropdown for fixing header issues, etc. The fix interfaces are listed in [Fix Interface Description](./doc/fix-interfaces.md).

#### AI Assistance

To simplify the remediation process, we integrate both a Large Language Model (LLM) and a Vision-Language Model (VLM) to generate accessibility recommendations within several fix interfaces. Users can configure these models by providing their API endpoint, API key, and model name in: `Settings > Settings Editor > A11y Checker Settings`.

## Getting Started

### Installing

You can install the extension directly via pip:

```bash
pip install jupyterlab-a11y-checker
```

Find the package on PyPI. [Link to PyPI Package](https://pypi.org/project/jupyterlab-a11y-checker/).

### Contributing

We’re building this tool for the community, and we’d love your help! Whether it’s adding new accessibility checks, or refining the fix suggestions, your contributions can help this project make a broader impact.

#### Build from Scratch

```bash
# Create an environment using anaconda navigator: <env-name>

conda activate <env-name>
pip install cookie cutter
python -m pip install jupyterlab notebook --pre
mamba install -c conda-forge nodejs=18
node -v #to check version

# <pull code>
OR
cookiecutter https://github.com/jupyterlab/extension-cookiecutter-ts --checkout 4.0

jlpm
jlpm run build
jupyter labextension develop . --overwrite
python -m pip install -e .
pip list #to verify it has been installed in editable mode
jupyter labextension list #to verify it has been installed

jupyter lab --no-browser #run a jupyterlab server

#Run jlpm run build, then jupyter lab --no-browser to test your code after each change
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

## Acknowledgements

Fix the hackmd file for me

## Acknowledgements

| Name              | Role                       | GitHub Handle |
| ----------------- | -------------------------- | ------------- |
| Chanbin Park      | Student Developer          | @chanbinski   |
| Vivian Liu        | Student Developer          | @vzliu        |
| Shreyas Rana      | Student Developer          | @ranashreyas  |
| Balaji Alwar      | Project Lead               | @balajialg    |
| Ryan Lovett       | Volunteer (Jupyter expert) | @ryanlovett   |
| Joe Feria Galicia | Volunteer (a11y expert)    | NA            |
