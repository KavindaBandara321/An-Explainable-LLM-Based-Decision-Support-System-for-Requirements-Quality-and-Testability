import { STUDY_CSV_COLUMNS, StudyRecord } from '../models/study';

/** Neutralises spreadsheet formula injection for free text typed by participants. */
function neutralise(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: string | number): string {
  const s = typeof value === 'number' ? String(value) : neutralise(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV with CRLF line endings and a header row. */
export function toCsv(records: readonly StudyRecord[]): string {
  const lines = [STUDY_CSV_COLUMNS.join(',')];
  for (const r of records) lines.push(STUDY_CSV_COLUMNS.map((c) => cell(r[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function toJson(participantCode: string, records: readonly StudyRecord[]): string {
  return JSON.stringify({ participant_code: participantCode, records }, null, 2);
}

/** Saves a file in the browser. Nothing leaves the device. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
