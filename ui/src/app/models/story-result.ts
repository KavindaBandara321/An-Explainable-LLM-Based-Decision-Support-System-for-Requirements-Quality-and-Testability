export type DefectCode = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';
export type FindingSource = 'rule' | 'llm' | 'both';
export type Confidence = 'High' | 'Medium' | 'Low';
export type FindingLabel = 'confirmed' | 'rule only' | 'AI only' | 'possible issue';

export const DEFECT_CODES: readonly DefectCode[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
export const SOURCES: readonly FindingSource[] = ['rule', 'llm', 'both'];
export const CONFIDENCES: readonly Confidence[] = ['High', 'Medium', 'Low'];
export const LABELS: readonly FindingLabel[] = ['confirmed', 'rule only', 'AI only', 'possible issue'];

export const DEFECT_NAMES: Record<DefectCode, string> = {
  D1: 'Well-formedness',
  D2: 'Business value',
  D3: 'Atomicity',
  D4: 'Unambiguity',
  D5: 'Verifiability',
  D6: 'Contextual completeness',
};

export interface Finding {
  defect: DefectCode;
  span_text: string;
  /** Character offset into StoryResult.text (inclusive). */
  span_start: number;
  /** Character offset into StoryResult.text (exclusive). */
  span_end: number;
  source: FindingSource;
  rule_id?: string;
  /** Share of 5 LLM runs that agreed, 0..1. */
  llm_agreement?: number;
  confidence: Confidence;
  label: FindingLabel;
  /** Traceable, rule-derived evidence (matched words + rule ID). */
  evidence: string;
  /** LLM-written reason; shown as "AI-generated justification" and may be unfaithful. */
  justification?: string;
}

export interface ImprovedStory {
  text: string;
  acceptance_criteria_gherkin: string;
  assumptions: string[];
}

export interface StoryResult {
  story_id: string;
  text: string;
  findings: Finding[];
  improved?: ImprovedStory;
}
