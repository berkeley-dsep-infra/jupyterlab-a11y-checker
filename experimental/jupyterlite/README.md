# JupyterLite + A11y Checker Demo

A client-side JupyterLab deployment with the accessibility checker extension pre-installed. Runs entirely in the browser — no server required.

## Prerequisites

- Python 3.9+
- Node.js 20+ (for local build mode)

## Build

**From local source** (for testing unreleased changes):

```bash
./build.sh local
```

**From PyPI** (latest published version):

```bash
./build.sh pypi
```

## Test Locally

```bash
cd _output
python3 -m http.server 8000
```

Then open http://localhost:8000/lab/index.html in your browser.

## Deploy to GitHub Pages

The `.github/workflows/deploy-jupyterlite.yml` workflow automatically builds and deploys to GitHub Pages on push to `main`. You can also trigger it manually via `workflow_dispatch`.

## Known Limitations

- **AI features**: LLM/VLM API calls require a CORS-enabled endpoint. Most API servers block cross-origin requests from static sites by default.
- **OCR (tesseract.js)**: Loads WASM from CDN. Works in most browsers but may be slow on first use (~4MB download). Degrades gracefully if blocked.
- **Image paths**: Relative image paths in notebooks require the image files to also be in the `files/` directory.
- **Python libraries**: JupyterLite uses Pyodide (Python in WebAssembly), which supports most but not all packages.
