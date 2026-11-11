import {
  CONFIDENCES,
  DEFECT_CODES,
  Finding,
  LABELS,
  SOURCES,
  StoryResult,
} from '../models/story-result';
import { STUDY_CONDITIONS, StudyConfig, StudyItem } from '../models/study';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(path: string, msg: string): never {
  throw new Error(`${path}: ${msg}`);
}

function str(o: Record<string, unknown>, key: string, path: string): string {
  const v = o[key];
  if (typeof v !== 'string') fail(`${path}.${key}`, 'expected a string');
  return v;
}

function oneOf<T extends string>(o: Record<string, unknown>, key: string, allowed: readonly T[], path: string): T {
  const v = o[key];
  if (typeof v !== 'string' || !allowed.includes(v as T)) fail(`${path}.${key}`, `expected one of ${allowed.join(', ')}`);
  return v as T;
}

function parseFinding(raw: unknown, path: string): Finding {
  if (!isObject(raw)) fail(path, 'expected an object');
  const start = raw['span_start'];
  const end = raw['span_end'];
  if (typeof start !== 'number' || typeof end !== 'number') fail(path, 'span_start and span_end must be numbers');
  const agreement = raw['llm_agreement'];
  if (agreement !== undefined && (typeof agreement !== 'number' || agreement < 0 || agreement > 1)) {
    fail(`${path}.llm_agreement`, 'expected a number between 0 and 1');
  }
  for (const key of ['rule_id', 'justification']) {
    if (raw[key] !== undefined && typeof raw[key] !== 'string') fail(`${path}.${key}`, 'expected a string');
  }
  return {
    defect: oneOf(raw, 'defect', DEFECT_CODES, path),
    span_text: str(raw, 'span_text', path),
    span_start: start,
    span_end: end,
    source: oneOf(raw, 'source', SOURCES, path),
    rule_id: raw['rule_id'] as string | undefined,
    llm_agreement: agreement as number | undefined,
    confidence: oneOf(raw, 'confidence', CONFIDENCES, path),
    label: oneOf(raw, 'label', LABELS, path),
    evidence: str(raw, 'evidence', path),
    justification: raw['justification'] as string | undefined,
  };
}

/** Validates parsed JSON against the StoryResult contract. Throws an Error naming the bad field. */
export function parseResults(json: unknown): StoryResult[] {
  if (!Array.isArray(json)) fail('$', 'expected an array of stories');
  const ids = new Set<string>();
  return json.map((raw, i) => {
    const path = `$[${i}]`;
    if (!isObject(raw)) fail(path, 'expected an object');
    const story_id = str(raw, 'story_id', path);
    if (ids.has(story_id)) fail(`${path}.story_id`, `duplicate story_id "${story_id}"`);
    ids.add(story_id);
    const text = str(raw, 'text', path);
    const rawFindings = raw['findings'];
    if (!Array.isArray(rawFindings)) fail(`${path}.findings`, 'expected an array');
    const result: StoryResult = {
      story_id,
      text,
      findings: rawFindings.map((f, j) => parseFinding(f, `${path}.findings[${j}]`)),
    };
    const imp = raw['improved'];
    if (imp !== undefined) {
      if (!isObject(imp)) fail(`${path}.improved`, 'expected an object');
      const assumptions = imp['assumptions'];
      if (!Array.isArray(assumptions) || assumptions.some((a) => typeof a !== 'string')) {
        fail(`${path}.improved.assumptions`, 'expected an array of strings');
      }
      result.improved = {
        text: str(imp, 'text', `${path}.improved`),
        acceptance_criteria_gherkin: str(imp, 'acceptance_criteria_gherkin', `${path}.improved`),
        assumptions: assumptions as string[],
      };
    }
    return result;
  });
}

export function parseStudyConfig(json: unknown): StudyConfig {
  if (!isObject(json) || !isObject(json['participants'])) fail('$', 'expected an object with "participants"');
  const participants: Record<string, StudyItem[]> = {};
  for (const [code, items] of Object.entries(json['participants'])) {
    if (!Array.isArray(items) || items.length === 0) fail(`participants.${code}`, 'expected a non-empty array');
    participants[code.trim().toUpperCase()] = items.map((it, i) => {
      const path = `participants.${code}[${i}]`;
      if (!isObject(it)) fail(path, 'expected an object');
      return {
        story_id: str(it, 'story_id', path),
        condition: oneOf(it, 'condition', STUDY_CONDITIONS, path),
      };
    });
  }
  const description = json['description'];
  return { description: typeof description === 'string' ? description : undefined, participants };
}
