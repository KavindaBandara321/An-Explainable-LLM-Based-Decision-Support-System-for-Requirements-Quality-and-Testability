import { Confidence, DefectCode, Finding } from '../models/story-result';

export interface HighlightSegment {
  text: string;
  start: number;
  end: number;
  /** Findings covering this segment (empty for plain text). Overlaps produce several. */
  findings: Finding[];
  /** Distinct defect codes in this segment, in first-seen order. */
  defects: DefectCode[];
  /** True when at least one covering finding is counted (not a Low-confidence "possible issue"). */
  counted: boolean;
}

export function isCounted(f: Pick<Finding, 'confidence' | 'label'>): boolean {
  return f.confidence !== 'Low' && f.label !== 'possible issue';
}

export function confidenceRank(c: Confidence): number {
  return c === 'High' ? 0 : c === 'Medium' ? 1 : 2;
}

/**
 * Splits `text` at every finding span boundary so that each segment is covered by a fixed
 * set of findings. Offsets are clamped to the text; empty or inverted spans are ignored.
 * Concatenating all segment texts always reproduces `text`.
 */
export function buildSegments(text: string, findings: readonly Finding[]): HighlightSegment[] {
  const len = text.length;
  const valid = findings
    .map((f) => ({ f, start: Math.max(0, Math.floor(f.span_start)), end: Math.min(len, Math.floor(f.span_end)) }))
    .filter((x) => Number.isFinite(x.start) && Number.isFinite(x.end) && x.end > x.start);

  const cuts = new Set<number>([0, len]);
  for (const v of valid) {
    cuts.add(v.start);
    cuts.add(v.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const segments: HighlightSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const covering = valid.filter((v) => v.start <= start && v.end >= end).map((v) => v.f);
    const defects: DefectCode[] = [];
    for (const f of covering) {
      if (!defects.includes(f.defect)) defects.push(f.defect);
    }
    segments.push({
      text: text.slice(start, end),
      start,
      end,
      findings: covering,
      defects,
      counted: covering.some(isCounted),
    });
  }
  return segments;
}
