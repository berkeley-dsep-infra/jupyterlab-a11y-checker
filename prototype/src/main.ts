import {
  rawIpynbToGeneralCells,
  analyzeCellsAccessibility,
  ICellIssue,
  issueToDescription,
  issueToCategory,
  buildLLMReport,
} from "@berkeley-dsep-infra/a11y-checker-core";
import { BrowserImageProcessor } from "./image-processor";

// ─── DOM references ─────────────────────────────────────────────
const repoUrlInput = document.getElementById("repoUrl") as HTMLInputElement;
const tokenInput = document.getElementById("token") as HTMLInputElement;
const scanBtn = document.getElementById("scanBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const resultsEl = document.getElementById("results") as HTMLDivElement;
const progressWrap = document.getElementById("progressWrap") as HTMLDivElement;
const progressFill = document.getElementById("progressFill") as HTMLDivElement;
const uploadArea = document.getElementById("uploadArea") as HTMLDivElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;

// Checkboxes & collapsible sections
const checkPrivate = document.getElementById(
  "checkPrivate",
) as HTMLInputElement;
const checkUpload = document.getElementById("checkUpload") as HTMLInputElement;
const tokenSection = document.getElementById("tokenSection") as HTMLDivElement;
const uploadSection = document.getElementById(
  "uploadSection",
) as HTMLDivElement;

// ─── State ──────────────────────────────────────────────────────
let abortController: AbortController | null = null;
let isScanning = false;

// ─── WCAG criterion map ─────────────────────────────────────────
const wcagCriterionMap: Record<string, string> = {
  "image-missing-alt": "1.1.1",
  "heading-missing-h1": "2.4.2",
  "heading-multiple-h1": "2.4.6",
  "heading-duplicate-h2": "2.4.6",
  "heading-duplicate-h1-h2": "2.4.6",
  "heading-wrong-order": "2.4.6",
  "heading-empty": "2.4.6",
  "table-missing-header": "1.3.1",
  "table-missing-caption": "1.3.1",
  "table-missing-scope": "1.3.1",
  "color-insufficient-cc-normal": "1.4.3",
  "color-insufficient-cc-large": "1.4.3",
  "link-discernible-text": "2.4.4",
};

// ─── Category color map ──────────────────────────────────────────
const categoryColorMap: Record<string, string> = {
  Images: "var(--cat-images)",
  Headings: "var(--cat-headings)",
  Tables: "var(--cat-tables)",
  Color: "var(--cat-color)",
  Links: "var(--cat-links)",
  Other: "var(--cat-other)",
};

// ─── Checkbox toggles ───────────────────────────────────────────
checkPrivate.addEventListener("change", () => {
  tokenSection.classList.toggle("visible", checkPrivate.checked);
});

checkUpload.addEventListener("change", () => {
  uploadSection.classList.toggle("visible", checkUpload.checked);
});

// ─── GitHub API helpers ─────────────────────────────────────────

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url.trim().replace(/\/+$/, "");
  const match = cleaned.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/,
  );
  if (match) return { owner: match[1], repo: match[2] };

  const parts = cleaned.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

function githubHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) h["Authorization"] = `token ${token}`;
  return h;
}

async function fetchRepoTree(
  owner: string,
  repo: string,
  token?: string,
  signal?: AbortSignal,
): Promise<{ notebooks: string[]; branch: string }> {
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(token),
    signal,
  });
  if (!repoRes.ok) {
    if (repoRes.status === 403) {
      throw new Error(
        "GitHub API rate limit reached. Add a token for higher limits.",
      );
    }
    if (repoRes.status === 404) {
      throw new Error(
        "Repository not found. If it is private, add a GitHub token.",
      );
    }
    throw new Error(`Repository not found (${repoRes.status})`);
  }
  const repoData = await repoRes.json();
  const branch = repoData.default_branch || "main";

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: githubHeaders(token), signal },
  );
  if (!treeRes.ok) {
    if (treeRes.status === 403) {
      throw new Error(
        "GitHub API rate limit reached. Add a token for higher limits.",
      );
    }
    throw new Error(`Failed to fetch file tree (${treeRes.status})`);
  }
  const treeData = await treeRes.json();

  const notebooks = (treeData.tree || [])
    .filter((item: any) => item.type === "blob" && item.path.endsWith(".ipynb"))
    .map((item: any) => item.path);

  return { notebooks, branch };
}

async function fetchNotebookContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token?: string,
  signal?: AbortSignal,
): Promise<any> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `token ${token}`;

  const res = await fetch(rawUrl, { headers, signal });
  if (!res.ok) throw new Error(`Failed to fetch ${path} (${res.status})`);
  return await res.json();
}

// ─── Analysis ───────────────────────────────────────────────────

interface NotebookResult {
  path: string;
  issues: ICellIssue[];
  error?: string;
}

async function analyzeNotebook(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token?: string,
  signal?: AbortSignal,
): Promise<NotebookResult> {
  try {
    signal?.throwIfAborted();
    const content = await fetchNotebookContent(
      owner,
      repo,
      path,
      branch,
      token,
      signal,
    );
    signal?.throwIfAborted();
    const cells = rawIpynbToGeneralCells(content);
    const imageProcessor = new BrowserImageProcessor();

    const issues = await analyzeCellsAccessibility(
      cells,
      document,
      "",
      imageProcessor,
      path,
    );

    return { path, issues };
  } catch (err: any) {
    if (err.name === "AbortError") throw err;
    return { path, issues: [], error: err.message };
  }
}

async function analyzeNotebookFromContent(
  filename: string,
  content: any,
): Promise<NotebookResult> {
  try {
    const cells = rawIpynbToGeneralCells(content);
    const imageProcessor = new BrowserImageProcessor();

    const issues = await analyzeCellsAccessibility(
      cells,
      document,
      "",
      imageProcessor,
      filename,
    );

    return { path: filename, issues };
  } catch (err: any) {
    return { path: filename, issues: [], error: err.message };
  }
}

// ─── Skeleton Loading ───────────────────────────────────────────

// ─── Rendering ──────────────────────────────────────────────────

interface RepoContext {
  owner: string;
  repo: string;
  branch: string;
}

let currentRepoContext: RepoContext | null = null;

function renderResults(results: NotebookResult[]) {
  resultsEl.innerHTML = "";

  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const totalNotebooks = results.length;
  const failedNotebooks = results.filter(
    (r) => r.issues.length > 0 || r.error,
  ).length;

  // ── 1. Summary Bar: 3 stats + Export + Show Details ──
  const summaryLabel = document.createElement("div");
  summaryLabel.className = "section-label";
  summaryLabel.textContent = "Summary";
  resultsEl.appendChild(summaryLabel);

  const summaryDiv = document.createElement("div");
  summaryDiv.className = "summary-bar";
  summaryDiv.innerHTML = `
    <div class="summary-stat">
      <div class="num red">${failedNotebooks}<span class="num-fraction">/${totalNotebooks}</span></div>
      <div class="label">Notebooks with issues</div>
    </div>
    <div class="summary-stat">
      <div class="num orange">${totalIssues}</div>
      <div class="label">Issues Found</div>
    </div>
    <div class="summary-actions">
      <div class="export-dropdown">
        <button class="action-btn" id="exportBtn"><span class="btn-icon">\u2913</span> Export</button>
        <div class="export-menu" id="exportMenu">
          <button class="export-menu-item" data-format="md">.md <span style="color:var(--text-muted)">(for humans)</span></button>
          <button class="export-menu-item" data-format="json">.json <span style="color:var(--text-muted)">(for agents)</span></button>
        </div>
      </div>
      <button class="action-btn" id="detailsToggleBtn"><span class="btn-icon" id="detailsChevron">\u25B6</span> Show Details</button>
    </div>
  `;
  resultsEl.appendChild(summaryDiv);

  // Export dropdown handlers
  const exportBtn = document.getElementById("exportBtn")!;
  const exportMenu = document.getElementById("exportMenu")!;

  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    exportMenu.classList.remove("open");
  });

  exportMenu.querySelectorAll(".export-menu-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const format = (item as HTMLElement).dataset.format;
      exportMenu.classList.remove("open");
      if (format === "md") downloadMdReport(results);
      else if (format === "json") downloadJsonReport(results);
    });
  });

  // ── 2. Aggregated Issue Chart (flat, greatest to least, tooltip = violation ID) ──
  const chartLabel = document.createElement("div");
  chartLabel.className = "section-label";
  chartLabel.textContent = "Issues by Type";
  resultsEl.appendChild(chartLabel);

  const allIssues = results.flatMap((r) => r.issues);
  const aggregated: Record<string, number> = {};
  allIssues.forEach((issue) => {
    aggregated[issue.violationId] = (aggregated[issue.violationId] || 0) + 1;
  });

  const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 0;

  const chartSection = document.createElement("div");
  chartSection.className = "chart-section";

  if (sorted.length === 0) {
    chartSection.innerHTML = `
      <div class="chart-empty">No issues found -- all notebooks are clean!</div>
    `;
  } else {
    const chartRows = sorted
      .map(([vid, count]) => {
        const pct = Math.round((count / maxCount) * 100);
        const info = issueToDescription.get(vid);
        const label = info ? info.title : vid;
        const desc = info?.detailedDescription || info?.description || "";
        const cat = issueToCategory.get(vid) || "Other";
        const color = categoryColorMap[cat] || "var(--cat-other)";
        const wcag = wcagCriterionMap[vid] || "";
        return `<div class="chart-row">
          <div class="chart-label">
            <span>${escapeHtml(label)}</span>
            <span class="info-icon" data-vid="${escapeHtml(vid)}" data-title="${escapeHtml(label)}" data-desc="${escapeHtml(desc)}" data-wcag="${escapeHtml(wcag)}">i</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="chart-count">${count}</div>
        </div>`;
      })
      .join("");

    chartSection.innerHTML = chartRows;

    // Shared popover element
    const popover = document.createElement("div");
    popover.className = "chart-info-popover";
    chartSection.appendChild(popover);

    // Wire up info icon hover
    chartSection.querySelectorAll(".info-icon").forEach((icon) => {
      icon.addEventListener("mouseenter", () => {
        const el = icon as HTMLElement;
        const title = el.dataset.title || "";
        const desc = el.dataset.desc || "";
        const wcag = el.dataset.wcag || "";

        const wcagHtml = wcag
          ? `<span class="popover-wcag">WCAG ${escapeHtml(wcag)}</span>`
          : "";
        popover.innerHTML = `
          <div class="popover-title">${escapeHtml(title)}</div>
          <div>${escapeHtml(desc)}</div>
          ${wcagHtml}
        `;

        popover.classList.add("visible");
      });

      icon.addEventListener("mouseleave", () => {
        popover.classList.remove("visible");
      });
    });
  }
  resultsEl.appendChild(chartSection);

  // ── 3. Per-notebook details (collapsed by default) ──
  const detailsSection = document.createElement("div");
  detailsSection.className = "details-section";
  detailsSection.id = "detailsSection";

  const perNotebookLabel = document.createElement("div");
  perNotebookLabel.className = "section-label";
  perNotebookLabel.style.marginTop = "0.5rem";
  perNotebookLabel.textContent = "Per Notebook";
  detailsSection.appendChild(perNotebookLabel);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "results-toolbar";
  toolbar.innerHTML = `
    <label>Filter:</label>
    <select id="filterSelect">
      <option value="with-issues" selected>With issues</option>
      <option value="all">All</option>
      <option value="clean">Clean</option>
      <option value="errors">Errors</option>
    </select>
    <label>Sort:</label>
    <select id="sortSelect">
      <option value="most-issues" selected>Most issues</option>
      <option value="az">A-Z</option>
    </select>
    <input type="text" id="searchInput" placeholder="Search notebooks..." />
  `;
  detailsSection.appendChild(toolbar);

  // Notebook cards container
  const cardsContainer = document.createElement("div");
  cardsContainer.id = "notebookCards";
  detailsSection.appendChild(cardsContainer);

  resultsEl.appendChild(detailsSection);

  // Initial render of cards
  renderNotebookCards(results, cardsContainer);

  // Toolbar event handlers
  const filterSelect = document.getElementById(
    "filterSelect",
  ) as HTMLSelectElement;
  const sortSelect = document.getElementById("sortSelect") as HTMLSelectElement;
  const searchInput = document.getElementById(
    "searchInput",
  ) as HTMLInputElement;

  const applyFilters = () => {
    renderNotebookCards(
      results,
      cardsContainer,
      filterSelect.value,
      sortSelect.value,
      searchInput.value,
    );
  };

  filterSelect.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);
  searchInput.addEventListener("input", applyFilters);

  // Details toggle handler
  const detailsToggleBtn = document.getElementById("detailsToggleBtn")!;
  const detailsChevron = document.getElementById("detailsChevron")!;
  detailsToggleBtn.addEventListener("click", () => {
    const isOpen = detailsSection.classList.toggle("open");
    detailsChevron.classList.toggle("chevron-open", isOpen);
    detailsToggleBtn.innerHTML = `<span class="btn-icon${isOpen ? " chevron-open" : ""}" id="detailsChevron">\u25B6</span> ${isOpen ? "Hide Details" : "Show Details"}`;
  });
}

function renderNotebookCards(
  results: NotebookResult[],
  container: HTMLElement,
  filter = "with-issues",
  sort = "most-issues",
  search = "",
) {
  container.innerHTML = "";

  let filtered = [...results];

  // Search filter
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((r) => r.path.toLowerCase().includes(q));
  }

  // Category filter
  if (filter === "with-issues") {
    filtered = filtered.filter((r) => r.issues.length > 0 || r.error);
  } else if (filter === "clean") {
    filtered = filtered.filter((r) => r.issues.length === 0 && !r.error);
  } else if (filter === "errors") {
    filtered = filtered.filter((r) => !!r.error);
  }

  // Sort
  if (sort === "most-issues") {
    filtered.sort((a, b) => b.issues.length - a.issues.length);
  } else if (sort === "az") {
    filtered.sort((a, b) => a.path.localeCompare(b.path));
  }

  // Separate into issues and clean
  const withIssues = filtered.filter((r) => r.issues.length > 0 || r.error);
  const clean = filtered.filter((r) => r.issues.length === 0 && !r.error);

  // Render issue cards
  for (const result of withIssues) {
    container.appendChild(createNotebookCard(result, false));
  }

  // Render clean notebooks with toggle
  if (clean.length > 0 && filter !== "clean") {
    const toggleDiv = document.createElement("div");
    toggleDiv.className = "clean-summary-toggle";
    toggleDiv.textContent = `${clean.length} notebook${clean.length > 1 ? "s" : ""} passed all checks`;

    const cleanContainer = document.createElement("div");
    cleanContainer.className = "clean-notebooks-container";

    for (const result of clean) {
      cleanContainer.appendChild(createNotebookCard(result, true));
    }

    toggleDiv.addEventListener("click", () => {
      cleanContainer.classList.toggle("open");
    });

    container.appendChild(toggleDiv);
    container.appendChild(cleanContainer);
  } else if (filter === "clean") {
    for (const result of clean) {
      container.appendChild(createNotebookCard(result, true));
    }
  }

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText =
      "text-align:center;color:var(--text-muted);padding:2rem;font-size:0.88rem;";
    empty.textContent = "No notebooks match the current filters.";
    container.appendChild(empty);
  }
}

function createNotebookCard(
  result: NotebookResult,
  compact: boolean,
): HTMLElement {
  const card = document.createElement("div");
  const hasIssues = result.issues.length > 0;
  const hasContent = hasIssues || !!result.error;
  const cardType = result.error
    ? "card-warn"
    : hasIssues
      ? "card-fail"
      : "card-pass";
  card.className = `notebook-card ${cardType}${compact ? " compact" : ""}`;

  const badgeClass = result.error ? "warn" : hasIssues ? "fail" : "pass";
  const badgeText = result.error
    ? "Error"
    : hasIssues
      ? `${result.issues.length} issue${result.issues.length > 1 ? "s" : ""}`
      : "No issues";

  const lastSlash = result.path.lastIndexOf("/");
  const prefix = lastSlash >= 0 ? result.path.slice(0, lastSlash + 1) : "";
  const filename =
    lastSlash >= 0 ? result.path.slice(lastSlash + 1) : result.path;

  const githubUrl = currentRepoContext
    ? `https://github.com/${currentRepoContext.owner}/${currentRepoContext.repo}/blob/${currentRepoContext.branch}/${result.path}`
    : null;

  let issueHtml = "";
  if (result.error) {
    issueHtml = `<p style="color:var(--orange);font-size:0.82rem;margin-top:0.5rem;">${escapeHtml(result.error)}</p>`;
  } else if (result.issues.length > 0 && !compact) {
    const byViolation: Record<string, ICellIssue[]> = {};
    result.issues.forEach((issue) => {
      if (!byViolation[issue.violationId]) byViolation[issue.violationId] = [];
      byViolation[issue.violationId].push(issue);
    });

    const items = Object.entries(byViolation)
      .map(([vid, issues]) => {
        const cells = issues.map((i) => i.cellIndex).join(", ");
        const info = issueToDescription.get(vid);
        const title = info ? info.title : vid;
        const wcag = wcagCriterionMap[vid] || "";

        const wcagPill = wcag
          ? `<a class="wcag-pill" href="https://www.w3.org/WAI/WCAG21/Understanding/" target="_blank" rel="noopener" title="WCAG ${wcag}">${wcag}</a>`
          : "";

        return `<li class="issue-row">
          <div class="issue-row-summary">
            <span class="violation-id" title="${escapeHtml(vid)}">${escapeHtml(title)}</span>
            ${wcagPill}
            <span class="issue-count">&times; ${issues.length}</span>
            <span class="cell-ref">cells: ${cells}</span>
          </div>
        </li>`;
      })
      .join("");

    issueHtml = `<ul class="issue-list">${items}</ul>`;
  }

  const titleHtml = githubUrl
    ? `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer" class="notebook-link"><span class="path-prefix">${escapeHtml(prefix)}</span>${escapeHtml(filename)}</a>`
    : `<span class="path-prefix">${escapeHtml(prefix)}</span>${escapeHtml(filename)}`;

  const chevronHtml =
    hasContent && !compact
      ? `<span class="notebook-card-chevron">\u25B6</span>`
      : "";

  card.innerHTML = `
    <div class="notebook-card-header">
      ${chevronHtml}
      <h3>${titleHtml}</h3>
      <span class="badge ${badgeClass}">${badgeText}</span>
    </div>
    ${hasContent && !compact ? `<div class="notebook-card-body">${issueHtml}</div>` : ""}
  `;

  // Add expand/collapse for cards with content
  if (hasContent && !compact) {
    const header = card.querySelector(".notebook-card-header")!;
    const chevron = card.querySelector(".notebook-card-chevron")!;
    const body = card.querySelector(".notebook-card-body")!;

    header.addEventListener("click", (e) => {
      // Don't toggle when clicking the notebook link
      if ((e.target as HTMLElement).closest(".notebook-link")) return;
      chevron.classList.toggle("open");
      body.classList.toggle("open");
    });
  }

  return card;
}

// ─── Report generation & download ────────────────────────────────

function generateMarkdownReport(results: NotebookResult[]): string {
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const totalNotebooks = results.length;
  const failedNotebooks = results.filter(
    (r) => r.issues.length > 0 || r.error,
  ).length;
  const passedNotebooks = totalNotebooks - failedNotebooks;
  const timestamp = new Date().toLocaleString();

  const lines: string[] = [];
  lines.push("# Jupycheck Accessibility Report");
  lines.push("");
  lines.push(`> Generated on ${timestamp}`);
  lines.push("");

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Notebooks scanned | ${totalNotebooks} |`);
  lines.push(`| Notebooks with issues | ${failedNotebooks} |`);
  lines.push(`| Notebooks passed | ${passedNotebooks} |`);
  lines.push(`| Total issues | ${totalIssues} |`);
  lines.push("");

  // Issues by type
  const allIssues = results.flatMap((r) => r.issues);
  const aggregated: Record<string, number> = {};
  allIssues.forEach((issue) => {
    aggregated[issue.violationId] = (aggregated[issue.violationId] || 0) + 1;
  });
  const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);

  if (sorted.length > 0) {
    lines.push("## Issues by Type");
    lines.push("");
    lines.push("| Issue | Category | WCAG | Count |");
    lines.push("|-------|----------|------|-------|");
    for (const [vid, count] of sorted) {
      const info = issueToDescription.get(vid);
      const title = info ? info.title : vid;
      const category = issueToCategory.get(vid) || "Other";
      const wcag = wcagCriterionMap[vid] || "—";
      lines.push(`| ${title} | ${category} | ${wcag} | ${count} |`);
    }
    lines.push("");
  }

  // Per notebook
  lines.push("## Details per Notebook");
  lines.push("");

  for (const result of results) {
    const issueCount = result.issues.length;
    const status = result.error
      ? "⚠️ Error"
      : issueCount > 0
        ? `${issueCount} issue${issueCount > 1 ? "s" : ""}`
        : "Passed";
    lines.push(`### \`${result.path}\` — ${status}`);
    lines.push("");

    if (result.error) {
      lines.push(`> **Error:** ${result.error}`);
      lines.push("");
      continue;
    }

    if (issueCount === 0) {
      lines.push("No accessibility issues found.");
      lines.push("");
      continue;
    }

    const byViolation: Record<string, ICellIssue[]> = {};
    result.issues.forEach((issue) => {
      if (!byViolation[issue.violationId]) byViolation[issue.violationId] = [];
      byViolation[issue.violationId].push(issue);
    });

    for (const [vid, issues] of Object.entries(byViolation)) {
      const info = issueToDescription.get(vid);
      const title = info ? info.title : vid;
      const wcag = wcagCriterionMap[vid] || "";
      const wcagTag = wcag ? ` \`WCAG ${wcag}\`` : "";
      const cells = issues.map((i) => `Cell ${i.cellIndex}`).join(", ");

      lines.push(`- **${title}**${wcagTag} — ×${issues.length} (${cells})`);

      if (info?.description) {
        lines.push(`  - ${info.description}`);
      }

      for (const issue of issues) {
        if (issue.issueContentRaw) {
          const snippet =
            issue.issueContentRaw.length > 100
              ? issue.issueContentRaw.slice(0, 100) + "..."
              : issue.issueContentRaw;
          lines.push(
            `  - \`${snippet.replace(/\n/g, " ").replace(/`/g, "'")}\``,
          );
        }
      }
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "*Report generated by [Jupycheck](https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker)*",
  );

  return lines.join("\n");
}

function generateJSON(results: NotebookResult[]): string {
  const allIssues = results.flatMap((r) =>
    r.issues.map((issue) => ({
      ...issue,
      notebookPath: r.path,
      category: issueToCategory.get(issue.violationId) || "Other",
      wcagCriterion: wcagCriterionMap[issue.violationId] || null,
    })),
  );

  const report = buildLLMReport(results.flatMap((r) => r.issues));

  const output = {
    ...report,
    issues: allIssues.map((issue) => {
      const info = issueToDescription.get(issue.violationId);
      return {
        notebookPath: issue.notebookPath,
        violationId: issue.violationId,
        cellIndex: issue.cellIndex,
        cellType: issue.cellType,
        category: issue.category,
        title: info?.title || issue.violationId,
        wcagCriterion: issue.wcagCriterion,
        description: issue.customDescription || info?.description || "",
        contentSnippet: (issue.issueContentRaw || "").trim().slice(0, 160),
      };
    }),
  };

  return JSON.stringify(output, null, 2);
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadMdReport(results: NotebookResult[]) {
  const report = generateMarkdownReport(results);
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(report, `jupycheck-report-${date}.md`, "text/markdown");
}

function downloadJsonReport(results: NotebookResult[]) {
  const json = generateJSON(results);
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(json, `jupycheck-report-${date}.json`, "application/json");
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

function setProgress(current: number, total: number) {
  const pct = Math.round((current / total) * 100);
  progressFill.style.width = `${pct}%`;
}

function showProgress(visible: boolean) {
  progressWrap.classList.toggle("active", visible);
  if (!visible) progressFill.style.width = "0%";
}

// ─── Scan mode helpers ───────────────────────────────────────────

function enterScanMode() {
  isScanning = true;
  abortController = new AbortController();
  scanBtn.textContent = "Stop";
  scanBtn.classList.add("stop");
  scanBtn.disabled = false;
  uploadArea.style.pointerEvents = "none";
  uploadArea.style.opacity = "0.5";
  resultsEl.innerHTML = "";
}

function exitScanMode() {
  isScanning = false;
  abortController = null;
  scanBtn.textContent = "Scan";
  scanBtn.classList.remove("stop");
  scanBtn.disabled = false;
  uploadArea.style.pointerEvents = "auto";
  uploadArea.style.opacity = "1";
}

function stopScan() {
  if (abortController) {
    abortController.abort();
  }
}

// ─── GitHub scan flow ────────────────────────────────────────────

async function scanRepo() {
  const parsed = parseGitHubUrl(repoUrlInput.value);
  if (!parsed) {
    setStatus("Please enter a valid GitHub repository URL");
    return;
  }

  const { owner, repo } = parsed;
  const token = tokenInput.value.trim() || undefined;

  enterScanMode();
  const signal = abortController!.signal;
  showProgress(false);
  setStatus(`Fetching file tree for ${owner}/${repo}...`);

  try {
    const { notebooks, branch } = await fetchRepoTree(
      owner,
      repo,
      token,
      signal,
    );

    if (notebooks.length === 0) {
      setStatus("No .ipynb files found in this repository.");
      resultsEl.innerHTML = "";
      exitScanMode();
      return;
    }

    showProgress(true);

    const results: NotebookResult[] = [];
    for (let i = 0; i < notebooks.length; i++) {
      signal.throwIfAborted();
      setStatus(`Analyzing ${i + 1}/${notebooks.length}: ${notebooks[i]}...`);
      setProgress(i, notebooks.length);
      const result = await analyzeNotebook(
        owner,
        repo,
        notebooks[i],
        branch,
        token,
        signal,
      );
      results.push(result);
    }

    setProgress(notebooks.length, notebooks.length);
    setStatus("");
    showProgress(false);
    currentRepoContext = { owner, repo, branch };
    renderResults(results);
  } catch (err: any) {
    if (err.name === "AbortError") {
      setStatus("Scan stopped.");
      resultsEl.innerHTML = "";
    } else {
      setStatus(`Error: ${err.message}`);
      resultsEl.innerHTML = "";
    }
    showProgress(false);
  } finally {
    exitScanMode();
  }
}

// ─── File upload flow ────────────────────────────────────────────

async function handleFiles(files: FileList | File[]) {
  const ipynbFiles = Array.from(files).filter((f) => f.name.endsWith(".ipynb"));

  if (ipynbFiles.length === 0) {
    setStatus(
      "No .ipynb files selected. Please upload Jupyter notebook files.",
    );
    return;
  }

  enterScanMode();
  const signal = abortController!.signal;
  showProgress(true);

  const results: NotebookResult[] = [];

  try {
    for (let i = 0; i < ipynbFiles.length; i++) {
      signal.throwIfAborted();
      const file = ipynbFiles[i];
      setStatus(`Analyzing ${i + 1}/${ipynbFiles.length}: ${file.name}...`);
      setProgress(i, ipynbFiles.length);

      try {
        const text = await file.text();
        const content = JSON.parse(text);
        const result = await analyzeNotebookFromContent(file.name, content);
        results.push(result);
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        results.push({ path: file.name, issues: [], error: err.message });
      }
    }

    setProgress(ipynbFiles.length, ipynbFiles.length);
    setStatus("");
    showProgress(false);
    currentRepoContext = null;
    renderResults(results);
  } catch (err: any) {
    if (err.name === "AbortError") {
      setStatus("Scan stopped.");
      if (results.length > 0) renderResults(results);
      else resultsEl.innerHTML = "";
    } else {
      setStatus(`Error: ${err.message}`);
      resultsEl.innerHTML = "";
    }
    showProgress(false);
  } finally {
    exitScanMode();
  }
}

// ─── Event listeners ────────────────────────────────────────────

scanBtn.addEventListener("click", () => {
  if (isScanning) {
    stopScan();
  } else {
    scanRepo();
  }
});

repoUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !isScanning) scanRepo();
});

// Upload: click
uploadArea.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files.length > 0) {
    handleFiles(fileInput.files);
    fileInput.value = "";
  }
});

// Upload: drag & drop
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  if (e.dataTransfer?.files) {
    handleFiles(e.dataTransfer.files);
  }
});

// Example links (populate only, no auto-scan)
document.querySelectorAll(".example-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const url = (link as HTMLElement).dataset.url;
    if (url) {
      repoUrlInput.value = url;
    }
  });
});

// Fetch GitHub star count
(async () => {
  try {
    const res = await fetch(
      "https://api.github.com/repos/berkeley-dsep-infra/jupyterlab-a11y-checker",
    );
    if (res.ok) {
      const data = await res.json();
      const count = data.stargazers_count;
      const el = document.getElementById("starCount");
      if (el && count != null) {
        el.textContent = `\u2605 ${count}`;
      }
    }
  } catch {}
})();
