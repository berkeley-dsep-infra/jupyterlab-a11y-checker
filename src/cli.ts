#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { rawIpynbToGeneralCells } from './utils/adapter-cli.js';
import { analyzeCellsAccessibilityCLI } from './utils/detection/base.js';
import { ICellIssue } from './utils/types.js';

const program = new Command();

program
  .name('jupyterlab-a11y-check')
  .description('CLI to check Jupyter Notebooks for accessibility issues')
  .version('0.2.5')
  .argument('<file>', 'Path to the .ipynb file to check')
  .action(async (filePath: string) => {
    try {
      const absolutePath = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(absolutePath)) {
        console.error(chalk.red(`Error: File not found at ${absolutePath}`));
        process.exit(1);
      }

      console.log(chalk.blue(`Analyzing ${absolutePath}...`));

      const content = fs.readFileSync(absolutePath, 'utf-8');
      let jsonContent;
      try {
        jsonContent = JSON.parse(content);
      } catch (e) {
        console.error(chalk.red('Error: Invalid JSON in .ipynb file.'));
        process.exit(1);
      }

      const cells = rawIpynbToGeneralCells(jsonContent);
      const issues = await analyzeCellsAccessibilityCLI(cells);

      if (issues.length === 0) {
        console.log(chalk.green('No accessibility issues found!'));
        process.exit(0);
      }

      console.log(chalk.yellow(`Found ${issues.length} issues:`));

      // Group by violation
      const issuesByViolation: Record<string, ICellIssue[]> = {};
      issues.forEach(issue => {
        if (!issuesByViolation[issue.violationId]) {
          issuesByViolation[issue.violationId] = [];
        }
        issuesByViolation[issue.violationId].push(issue);
      });

      Object.keys(issuesByViolation).forEach(violationId => {
        const group = issuesByViolation[violationId];
        console.log(
          chalk.bold.underline(`\nViolation: ${violationId} (${group.length})`)
        );
        group.forEach(issue => {
          console.log(`  - Cell ${issue.cellIndex} (${issue.cellType}):`);
          if (issue.customDescription) {
            console.log(`    ${issue.customDescription}`);
          }
          console.log(
            `    Content: "${issue.issueContentRaw.trim().substring(0, 50)}..."`
          );
        });
      });

      // Exit with 1 if issues found, so CI pipelines fail
      process.exit(1);
    } catch (error) {
      console.error(chalk.red('An unexpected error occurred:'), error);
      process.exit(1);
    }
  });

program.parse();
