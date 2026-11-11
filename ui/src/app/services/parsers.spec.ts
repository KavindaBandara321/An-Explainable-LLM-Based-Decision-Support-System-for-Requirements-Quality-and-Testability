import { StudyRecord } from '../models/study';
import { toCsv, toJson } from './export';
import { parseResults, parseStudyConfig } from './parsers';

const finding = {
  defect: 'D4',
  span_text: 'fast',
  span_start: 0,
  span_end: 4,
  source: 'both',
  rule_id: 'R-1',
  llm_agreement: 0.8,
  confidence: 'High',
  label: 'confirmed',
  evidence: 'e',
};

describe('parseResults', () => {
  it('accepts a valid story with and without improved', () => {
    const out = parseResults([
      { story_id: 'A', text: 't', findings: [finding] },
      {
        story_id: 'B',
        text: 't',
        findings: [],
        improved: { text: 'x', acceptance_criteria_gherkin: 'g', assumptions: ['a'] },
      },
    ]);
    expect(out).toHaveLength(2);
    expect(out[1].improved?.assumptions).toEqual(['a']);
  });

  it('rejects non-arrays, bad enums, bad agreement and duplicate ids with a helpful path', () => {
    expect(() => parseResults({})).toThrow(/array/);
    expect(() => parseResults([{ story_id: 'A', text: 't', findings: [{ ...finding, defect: 'D9' }] }])).toThrow(/findings\[0\]\.defect/);
    expect(() => parseResults([{ story_id: 'A', text: 't', findings: [{ ...finding, llm_agreement: 1.5 }] }])).toThrow(/llm_agreement/);
    expect(() => parseResults([{ story_id: 'A', text: 't', findings: [] }, { story_id: 'A', text: 't', findings: [] }])).toThrow(/duplicate/);
    expect(() => parseResults([{ story_id: 'A', text: 't' }])).toThrow(/findings/);
  });
});

describe('parseStudyConfig', () => {
  it('accepts a valid config and upper-cases participant codes', () => {
    const cfg = parseStudyConfig({ participants: { p07: [{ story_id: 'A', condition: 'findings_only' }] } });
    expect(Object.keys(cfg.participants)).toEqual(['P07']);
  });

  it('rejects unknown conditions and empty lists', () => {
    expect(() => parseStudyConfig({ participants: { P01: [{ story_id: 'A', condition: 'x' }] } })).toThrow(/condition/);
    expect(() => parseStudyConfig({ participants: { P01: [] } })).toThrow(/non-empty/);
    expect(() => parseStudyConfig([])).toThrow();
  });
});

describe('toCsv / toJson', () => {
  const rec: StudyRecord = {
    participant_code: 'P07',
    story_id: 'MOCK-001',
    condition: 'findings_only',
    order: 1,
    fixed_text: 'He said "hi", then\nleft',
    time_ms: 1234,
    clarity: 4,
    usefulness: 5,
    trust: 3,
  };

  it('writes the header and quotes commas, quotes and newlines', () => {
    const csv = toCsv([rec]);
    const [header] = csv.split('\r\n');
    expect(header).toBe('participant_code,story_id,condition,order,fixed_text,time_ms,clarity,usefulness,trust');
    expect(csv).toContain('"He said ""hi"", then\nleft",1234,4,5,3');
  });

  it('neutralises spreadsheet formulas in free text', () => {
    expect(toCsv([{ ...rec, fixed_text: '=1+1' }])).toContain(",'=1+1,");
  });

  it('serialises JSON with the participant code', () => {
    expect(JSON.parse(toJson('P07', [rec]))).toEqual({ participant_code: 'P07', records: [rec] });
  });
});
