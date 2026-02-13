import fs from "fs";

export interface IRuleDescription {
  description: string;
  wcag?: string;
  severity?: string;
}

import rulesContent from "../../../doc/rules.md";

function parseRuleLines(contents: string): Record<string, IRuleDescription> {
  const lines = contents.split(/\r?\n/);
  const descriptions: Record<string, IRuleDescription> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      continue;
    }

    const columns = line
      .split("|")
      .map((col) => col.trim())
      .filter((_, index) => index > 0); // drop the leading empty cell

    if (columns.length < 3) {
      continue;
    }

    const [, ruleId, description, wcag, severity] = columns;
    if (
      !ruleId ||
      ruleId.toLowerCase().startsWith("rule id") ||
      ruleId === "---" ||
      !description ||
      description.toLowerCase().startsWith("description")
    ) {
      continue;
    }

    descriptions[ruleId] = {
      description,
      wcag: wcag && wcag !== "---" ? wcag : undefined,
      severity: severity && severity !== "---" ? severity : undefined,
    };
  }

  return descriptions;
}

function loadRuleDescriptions(): Record<string, IRuleDescription> {
  return parseRuleLines(rulesContent);
}

const ruleDescriptions = loadRuleDescriptions();

export function getRuleDescription(id: string): IRuleDescription | undefined {
  return ruleDescriptions[id];
}
