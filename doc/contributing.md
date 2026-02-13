# Contributing

We're building this tool for the community, and we'd love your help! Whether it's adding new accessibility checks, or refining the fix suggestions, your contributions can help this project make a broader impact.

## Project Structure

- **`packages/core`**: Contains the core accessibility analysis logic, parsers, and utilities. This package is shared between the CLI and the Extension.
- **`packages/cli`**: The command-line interface tool. It bundles the core logic to run independently of JupyterLab.
- **`packages/extension`**: The JupyterLab extension. It uses the core package to provide real-time accessibility checking within the notebook interface.

## Build from Scratch

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

## Build from Temp Distribution

```bash
jlpm build:prod
npm pack #creates a tarball (*.tgz file) containing your project as it would be uploaded to the npm registry. This file can be shared and installed locally.
jupyter labextension install </path/to/your-package.tgz>


# ALTERNATIVELY IF GIVEN A tar.gz file:

conda activate <env-name>
jupyter labextension install </path/to/your-package.tgz>
jupyter lab #this will open a local server of jupyterlab with all current extensions installed.
```

## Pip Distribution

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

## Development Uninstall

```bash
pip uninstall jupyterlab_a11y_checker
```

## Testing in a JupyterHub Setup

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

## Running CLI from Source

If you are developing locally or want to run from the checked-out repository:

1. Build the packages:

   ```bash
   jlpm build
   ```

2. Run the CLI directly:

   ```bash
   ./packages/cli/dist/index.js test_notebooks/demo.ipynb
   ```
