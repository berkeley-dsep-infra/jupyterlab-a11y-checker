import { ICellIssue } from './types';

export interface IIssueOffsets {
  offsetStart: number;
  offsetEnd: number;
}

export function getIssueOffsets(
  issue: ICellIssue,
  sourceLength: number
): IIssueOffsets | null {
  const start = (issue.metadata?.offsetStart as number | undefined) ?? null;
  const end = (issue.metadata?.offsetEnd as number | undefined) ?? null;

  if (
    start === null ||
    end === null ||
    isNaN(start) ||
    isNaN(end) ||
    start < 0 ||
    end > sourceLength ||
    start >= end
  ) {
    return null;
  }
  return { offsetStart: start, offsetEnd: end };
}

export function replaceSlice(
  source: string,
  start: number,
  end: number,
  replacement: string
): string {
  return source.slice(0, start) + replacement + source.slice(end);
}
