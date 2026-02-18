#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MODE="${1:-local}"

echo "=== JupyterLite Build for jupyterlab-a11y-checker ==="
echo "Mode: $MODE"
echo ""

# Step 1: Create/activate a virtual environment
VENV_DIR="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# Step 2: Install JupyterLite build tools
echo "Installing JupyterLite build dependencies..."
pip install -q -r "$SCRIPT_DIR/requirements.txt"

# Step 3: Install the a11y-checker extension
if [ "$MODE" = "local" ]; then
    echo "Installing extension from local build..."

    # Install JupyterLab if needed (required for labextension build)
    if ! python3 -c "import jupyterlab" 2>/dev/null; then
        echo "Installing JupyterLab (required for building the extension)..."
        pip install -q "jupyterlab>=4.0.0,<5"
    fi

    # Install Node.js dependencies if needed
    if [ ! -d "$REPO_ROOT/node_modules" ]; then
        echo "Installing Node.js dependencies..."
        cd "$REPO_ROOT"
        jlpm install
    fi

    # Build all packages (core -> cli -> extension)
    echo "Building monorepo packages..."
    cd "$REPO_ROOT"
    jlpm build

    # Install the extension (non-editable so files are copied to sys-prefix)
    echo "Installing extension package..."
    cd "$REPO_ROOT/packages/extension"
    pip install .

elif [ "$MODE" = "pypi" ]; then
    echo "Installing extension from PyPI..."
    pip install jupyterlab-a11y-checker
else
    echo "ERROR: Unknown mode '$MODE'. Use 'local' or 'pypi'."
    exit 1
fi

# Step 4: Verify the extension is discoverable
echo ""
echo "Verifying extension installation..."
jupyter labextension list 2>&1 | grep -i "a11y-checker" || {
    echo "ERROR: Extension not found in labextension list"
    exit 1
}
echo "Extension found."

# Step 5: Build the JupyterLite site
echo ""
echo "Building JupyterLite site..."
cd "$SCRIPT_DIR"

# Clean previous build
rm -rf _output

# Remove source-tree labextension to avoid duplicate discovery by JupyterLite
# (pip install . already copied it to sys-prefix)
rm -rf "$REPO_ROOT/packages/extension/jupyterlab_a11y_checker/labextension"

jupyter lite build \
    --contents files/ \
    --output-dir _output

echo ""
echo "=== Build complete! ==="
echo ""
echo "To test locally:"
echo "  cd $SCRIPT_DIR/_output"
echo "  python3 -m http.server 8000"
echo "  Open http://localhost:8000/lab/index.html"
