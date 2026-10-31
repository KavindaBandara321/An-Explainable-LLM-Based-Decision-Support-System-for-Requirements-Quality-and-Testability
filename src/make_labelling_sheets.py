"""Step 4: create identical labelling workbooks for two annotators.

Run from the project root:
  python src/make_labelling_sheets.py            -> pilot (40 stories)
  python src/make_labelling_sheets.py --full     -> all 300 stories (after the pilot)
"""
import sys
from pathlib import Path

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Protection, Side
from openpyxl.worksheet.datavalidation import DataValidation

SHUFFLE_SEED = 7
ROOT = Path(__file__).resolve().parents[1]
FONT = "Arial"

DIMENSIONS = [
    ("D1", "Well-formedness", "Missing role or missing means (the 'As a ... I want ...' template is broken)."),
    ("D2", "Business value", "No 'so that ...' clause, or the clause gives no real reason."),
    ("D3", "Atomicity / minimality", "Several features in one story, or extra notes/explanations in the text."),
    ("D4", "Unambiguity", "Vague or subjective words, ambiguous pronouns, loopholes ('if possible')."),
    ("D5", "Verifiability", "A tester could not write a clear pass/fail check: unmeasurable claims, open-ended terms, no observable outcome."),
    ("D6", "Contextual completeness", "Actor too general ('a user'), or an essential rule, condition or edge case is missing."),
]


def build(df: pd.DataFrame, path: Path, annotator: str, title: str):
    wb = Workbook()
    thin = Side(style="thin", color="BFBFBF")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    ins = wb.active
    ins.title = "Instructions"
    rows = [
        (f"{title} – Annotator {annotator}", True),
        ("", False),
        ("1. Read the labelling guideline before you start.", False),
        ("2. Label each story on its own. Do not discuss stories with the other annotator until you have both finished.", False),
        ("3. For each dimension D1–D6 choose Yes (the defect is present) or No (not present). Every cell must be filled.", False),
        ("4. If Yes, copy the exact words that show the defect into 'evidence_words' (for D1/D2, write 'missing role', 'missing so that', etc.).", False),
        ("5. Use 'notes' for doubts or borderline cases. These are discussed after the pilot.", False),
        ("6. Do not edit story_id or story_text (these columns are locked).", False),
        ("", False),
        ("Dimension", True),
    ]
    for r, (text, bold) in enumerate(rows, 1):
        ins.cell(r, 1, text).font = Font(name=FONT, bold=bold, size=12 if r == 1 else 10)
    for i, (code, name, desc) in enumerate(DIMENSIONS, len(rows) + 1):
        ins.cell(i, 1, f"{code} – {name}").font = Font(name=FONT, bold=True, size=10)
        ins.cell(i, 2, desc).font = Font(name=FONT, size=10)
        ins.cell(i, 2).alignment = Alignment(wrap_text=True, vertical="top")
    ins.column_dimensions["A"].width = 34
    ins.column_dimensions["B"].width = 95

    ws = wb.create_sheet("Labelling")
    headers = ["story_id", "story_text"] + [f"{c} {n}" for c, n, _ in DIMENSIONS] + ["evidence_words", "notes"]
    widths = [12, 70] + [14] * 6 + [35, 35]
    ws.append(headers)
    for i, c in enumerate(ws[1], 1):
        c.font = Font(name=FONT, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="1F3864")
        c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
        c.border = border
        ws.column_dimensions[c.column_letter].width = widths[i - 1]
    ws.row_dimensions[1].height = 32
    input_fill = PatternFill("solid", fgColor="FFF2CC")
    for _, row in df.iterrows():
        ws.append([row["story_id"], row["text"]] + [None] * 8)
        r = ws.max_row
        for c in ws[r]:
            c.font = Font(name=FONT, size=10)
            c.alignment = Alignment(wrap_text=True, vertical="top")
            c.border = border
            if c.column > 2:
                c.protection = Protection(locked=False)
                c.fill = input_fill
    last = ws.max_row
    dv = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True, showErrorMessage=True,
                        errorTitle="Invalid value", error="Choose Yes or No")
    ws.add_data_validation(dv)
    dv.add(f"C2:H{last}")
    ws.freeze_panes = "C2"
    ws.protection.sheet = True
    ws.protection.formatCells = False
    ws.protection.formatColumns = False
    ws.protection.formatRows = False
    wb.active = 1
    wb.save(path)


def main():
    full = "--full" in sys.argv
    df = pd.read_csv(ROOT / "data" / "sample" / "stories_300.csv")
    if not full:
        df = df[df["pilot"]]
    df = df.sample(frac=1, random_state=SHUFFLE_SEED)
    tag = "full" if full else "pilot"
    title = "Full labelling (300 stories)" if full else "Pilot labelling (40 stories)"
    out = ROOT / "labelling"
    out.mkdir(exist_ok=True)
    for a in ("A", "B"):
        p = out / f"{tag}_annotator_{a}.xlsx"
        build(df, p, a, title)
        print(f"Created {p.relative_to(ROOT)} with {len(df)} stories")


if __name__ == "__main__":
    main()
