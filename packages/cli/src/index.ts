import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { rawIpynbToGeneralCells } from "@berkeley-dsep-infra/a11y-checker-core";
import { analyzeCellsAccessibilityCLI } from "@berkeley-dsep-infra/a11y-checker-core";
import { ICellIssue } from "@berkeley-dsep-infra/a11y-checker-core";
import { buildLLMReport } from "@berkeley-dsep-infra/a11y-checker-core";
import { getRuleDescription } from "./ruleDescriptions.js";
import { NodeImageProcessor } from "./image-processor.js";

declare const __CLI_VERSION__: string;

const program = new Command();

program
  .name("jupyterlab-a11y-check")
  .description("CLI to check Jupyter Notebooks for accessibility issues")
  .version(__CLI_VERSION__)
  .option("--json", "output a JSON summary suitable for LLM processing")
  .argument("[files...]", "Paths to the .ipynb files to check")
  .action(async (filePaths: string[], options: { json?: boolean }) => {
    if (!filePaths || filePaths.length === 0) {
      console.log(
        chalk.yellow(
          "No files specified. Usage: jupyterlab-a11y-check [files...]",
        ),
      );
      process.exit(0);
    }

    let hasIssues = false;
    let hasError = false;

    // Helper to process a single file
    const processFile = async (filePath: string) => {
      try {
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
          console.error(chalk.red(`Error: File not found at ${absolutePath}`));
          hasError = true;
          return;
        }

        console.log(chalk.blue(`Analyzing ${absolutePath}...`));

        const content = fs.readFileSync(absolutePath, "utf-8");
        let jsonContent;
        try {
          jsonContent = JSON.parse(content);
        } catch (e) {
          console.error(chalk.red(`Error: Invalid JSON in ${filePath}`));
          hasError = true;
          return;
        }

        const cells = rawIpynbToGeneralCells(jsonContent);
        const imageProcessor = new NodeImageProcessor();
        const issues = await analyzeCellsAccessibilityCLI(
          cells,
          imageProcessor,
        );

        if (issues.length === 0) {
          console.log(
            chalk.green(`No accessibility issues found in ${filePath}!`),
          );
          return;
        }

        // Issues found
        hasIssues = true;
        const llmReport = buildLLMReport(issues);

        if (!options.json) {
          console.log(
            chalk.yellow(`Found ${issues.length} issues in ${filePath}:`),
          );

          const issuesByViolation: Record<string, ICellIssue[]> = {};
          issues.forEach((issue) => {
            if (!issuesByViolation[issue.violationId]) {
              issuesByViolation[issue.violationId] = [];
            }
            issuesByViolation[issue.violationId].push(issue);
          });

          Object.keys(issuesByViolation).forEach((violationId) => {
            const group = issuesByViolation[violationId];
            console.log(
              chalk.bold.underline(
                `\n${group.length} ${group.length === 1 ? "violation" : "violations"} found for ${violationId}:`,
              ),
            );

            const ruleMeta = getRuleDescription(violationId);
            if (ruleMeta?.description) {
              console.log(
                chalk.cyan(`    Description: ${ruleMeta.description}`),
              );
            }
            if (ruleMeta?.wcag) {
              console.log(chalk.gray(`    WCAG Reference: ${ruleMeta.wcag}`));
            }
            if (violationId.startsWith("color-")) {
              console.log(
                chalk.yellow(
                  `    ⚠ Note: This check uses OCR and may produce inaccurate results. Please verify manually.`,
                ),
              );
            }

            group.forEach((issue) => {
              console.log(`  - Cell ${issue.cellIndex} (${issue.cellType}):`);
              if (issue.customDescription) {
                console.log(`    ${issue.customDescription}`);
              }
              const snippet = issue.issueContentRaw
                ? issue.issueContentRaw.trim().replace(/\s+/g, " ")
                : "";
              console.log(
                `    Content: "${snippet.substring(0, 80)}${
                  snippet.length > 80 ? "..." : ""
                }"`,
              );
            });
          });

          console.log(chalk.gray("\n-----------------------------------"));
        } else {
          console.log(JSON.stringify(llmReport, null, 2));
        }
      } catch (error) {
        console.error(
          chalk.red(
            `An unexpected error occurred while processing ${filePath}:`,
          ),
          error,
        );
        hasError = true;
      }
    };

    // Process all files sequentially
    for (const file of filePaths) {
      await processFile(file);
    }

    if (!options.json) {
      if (hasIssues) {
        console.log(
          chalk.red(
            "\nNote: CLI mode does not support color contrast detection. Use the JupyterLab extension for color-related accessibility checks.",
          ),
        );
        console.log(
          chalk.blue(
            "\nLearn more about the issues? Check out issue descriptions at https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/blob/main/doc/rules.md",
          ),
        );
        console.log(
          chalk.blue(
            "Want to fix the issues? Install the JupyterLab extension at https://pypi.org/project/jupyterlab-a11y-checker/",
          ),
        );
        console.log(
          chalk.blue(
            "Affiliated with Berkeley? Use the extension at https://a11y.datahub.berkeley.edu/",
          ),
        );
      }
    }

    if (hasIssues || hasError) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });

program.parse();
