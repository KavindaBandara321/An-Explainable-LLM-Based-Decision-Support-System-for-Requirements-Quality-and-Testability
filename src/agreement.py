"""Step 5: inter-annotator agreement (Cohen's kappa) per dimension.

Run from the project root after both annotators have finished:
  python src/agreement.py                 -> pilot workbooks
  python src/agreement.py --full          -> full workbooks
Outputs: results/<tag>_agreement.csv and results/<tag>_disagreements.csv
"""
import sys
from pathlib import Path

import pandas as pd
from sklearn.metrics import cohen_kappa_score

ROOT = Path(__file__).resolve().parents[1]
DIMS = ["D1", "D2", "D3", "D4", "D5", "D6"]


def load(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name="Labelling")
    df.columns = [c.split(" ")[0] if c.split(" ")[0] in DIMS else c for c in df.columns]
    return df.set_index("story_id")


def interpret(k: float) -> str:
    if pd.isna(k):
        return "undefined (one annotator used only one value)"
    for limit, label in [(0.2, "slight"), (0.4, "fair"), (0.6, "moderate"), (0.8, "substantial")]:
        if k <= limit:
            return label
    return "almost perfect"


def main():
    tag = "full" if "--full" in sys.argv else "pilot"
    a = load(ROOT / "labelling" / f"{tag}_annotator_A.xlsx")
    b = load(ROOT / "labelling" / f"{tag}_annotator_B.xlsx")
    common = a.index.intersection(b.index)
    a, b = a.loc[common], b.loc[common]

    missing = {d: int(a[d].isna().sum() + b[d].isna().sum()) for d in DIMS}
    if any(missing.values()):
        print("WARNING: empty cells found (per dimension, both files):", missing)

    rows, dis = [], []
    for d in DIMS:
        ok = a[d].notna() & b[d].notna()
        x, y = a.loc[ok, d].str.strip(), b.loc[ok, d].str.strip()
        k = cohen_kappa_score(x, y) if len(x) else float("nan")
        rows.append({
            "dimension": d,
            "n": len(x),
            "kappa": round(k, 3) if pd.notna(k) else None,
            "interpretation": interpret(k),
            "percent_agreement": round((x == y).mean() * 100, 1) if len(x) else None,
            "yes_A": int((x == "Yes").sum()),
            "yes_B": int((y == "Yes").sum()),
            "meets_target_0.6": bool(pd.notna(k) and k >= 0.6),
        })
        for sid in x.index[x != y]:
            dis.append({"story_id": sid, "dimension": d, "story_text": a.loc[sid, "story_text"],
                        "A": x[sid], "B": y[sid],
                        "evidence_A": a.loc[sid, "evidence_words"], "evidence_B": b.loc[sid, "evidence_words"],
                        "notes_A": a.loc[sid, "notes"], "notes_B": b.loc[sid, "notes"]})

    out = ROOT / "results"
    out.mkdir(exist_ok=True)
    res = pd.DataFrame(rows)
    res.to_csv(out / f"{tag}_agreement.csv", index=False)
    pd.DataFrame(dis).sort_values(["dimension", "story_id"]).to_csv(out / f"{tag}_disagreements.csv", index=False) if dis else None
    print(res.to_string(index=False))
    print(f"\nDisagreements: {len(dis)} (saved to results/{tag}_disagreements.csv)")


if __name__ == "__main__":
    main()
