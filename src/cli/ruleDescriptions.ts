import fs from 'fs';

export interface IRuleDescription {
  description: string;
  wcag?: string;
}

const RULES_SOURCE = new URL('../../doc/rules.md', import.meta.url);

function parseRuleLines(contents: string): Record<string, IRuleDescription> {
  const lines = contents.split(/\r?\n/);
  const descriptions: Record<string, IRuleDescription> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      continue;
    }

    const columns = line
      .split('|')
      .map(col => col.trim())
      .filter((_, index) => index > 0); // drop the leading empty cell

    if (columns.length < 3) {
      continue;
    }

    const [, ruleId, description, wcag] = columns;
    if (
      !ruleId ||
      ruleId.toLowerCase().startsWith('rule id') ||
      ruleId === '---' ||
      !description ||
      description.toLowerCase().startsWith('description')
    ) {
      continue;
    }

    descriptions[ruleId] = {
      description,
      wcag: wcag && wcag !== '---' ? wcag : undefined
    };
  }

  return descriptions;
}

function loadRuleDescriptions(): Record<string, IRuleDescription> {
  try {
    const contents = fs.readFileSync(RULES_SOURCE, 'utf-8');
    return parseRuleLines(contents);
  } catch (error) {
    console.warn(
      `Unable to load rule descriptions from ${RULES_SOURCE}:`,
      error instanceof Error ? error.message : error
    );
    return {};
  }
}

const ruleDescriptions = loadRuleDescriptions();

export function getRuleDescription(id: string): IRuleDescription | undefined {
  return ruleDescriptions[id];
}

