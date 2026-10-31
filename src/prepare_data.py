"""Step 1-3: load, clean and sample the Dalpiaz (2018) user story datasets.

Run from the project root:  python src/prepare_data.py
Outputs:
  data/processed/all_stories.csv   every cleaned story
  data/processed/cleaning_log.csv  every line that was joined, dropped or de-duplicated
  data/sample/stories_300.csv      the stratified sample with dev/test split and pilot flag
"""
import re
from pathlib import Path

import pandas as pd

SEED = 42
TOTAL = 300
DEV_SHARE = 100   # stories in the development set (the rest are test)
PILOT = 40        # pilot stories, taken only from the development set

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"


def clean_text(s: str) -> str:
    s = s.replace("�", "'").replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip()


def load_project(path: Path):
    project = path.stem  # e.g. g02-federalspending
    stories, log = [], []
    for line_no, raw in enumerate(path.read_text(encoding="utf-8-sig", errors="replace").splitlines(), 1):
        text = clean_text(raw)
        if not text:
            continue
        if re.match(r"^as\b", text, flags=re.I):
            stories.append({"project": project, "line_no": line_no, "text": text})
        elif stories and text[0].islower():
            # continuation of the previous story that was split over two lines
            stories[-1]["text"] = f"{stories[-1]['text']} {text}"
            log.append({"project": project, "line_no": line_no, "action": "joined to previous line", "text": text})
        else:
            log.append({"project": project, "line_no": line_no, "action": "dropped (not a user story)", "text": text})
    # remove exact duplicates within a project (case-insensitive), keep the first
    seen, unique = set(), []
    for s in stories:
        key = s["text"].lower().rstrip(".")
        if key in seen:
            log.append({"project": project, "line_no": s["line_no"], "action": "dropped (duplicate)", "text": s["text"]})
            continue
        seen.add(key)
        unique.append(s)
    return unique, log


def allocate(counts: pd.Series, total: int, seed: int) -> dict:
    """Spread `total` as evenly as possible across projects, capped by availability."""
    alloc = {p: 0 for p in counts.index}
    remaining = total
    rng = pd.Series(range(len(counts)), index=counts.index).sample(frac=1, random_state=seed).index
    while remaining > 0:
        open_p = [p for p in rng if alloc[p] < counts[p]]
        if not open_p:
            raise ValueError("Not enough stories to sample from")
        share = max(1, remaining // len(open_p))
        for p in open_p:
            take = min(share, counts[p] - alloc[p], remaining)
            alloc[p] += take
            remaining -= take
            if remaining == 0:
                break
    return alloc


def stratified_take(df: pd.DataFrame, n_total: int, seed: int) -> pd.DataFrame:
    counts = df.groupby("project").size()
    alloc = allocate(counts, n_total, seed)
    parts = [g.sample(n=alloc[p], random_state=seed) for p, g in df.groupby("project") if alloc[p] > 0]
    return pd.concat(parts)


def main():
    stories, log = [], []
    for path in sorted(RAW.glob("*.txt")):
        s, l = load_project(path)
        stories += s
        log += l
    df = pd.DataFrame(stories)
    df["story_id"] = df["project"].str.split("-").str[0] + "_" + df["line_no"].astype(str).str.zfill(3)
    df = df[["story_id", "project", "line_no", "text"]]
    (ROOT / "data" / "processed").mkdir(parents=True, exist_ok=True)
    df.to_csv(ROOT / "data" / "processed" / "all_stories.csv", index=False)
    pd.DataFrame(log).to_csv(ROOT / "data" / "processed" / "cleaning_log.csv", index=False)

    sample = stratified_take(df, TOTAL, SEED)
    dev = stratified_take(sample, DEV_SHARE, SEED)
    sample["split"] = "test"
    sample.loc[dev.index, "split"] = "dev"
    pilot = stratified_take(sample[sample["split"] == "dev"], PILOT, SEED)
    sample["pilot"] = False
    sample.loc[pilot.index, "pilot"] = True
    sample = sample.sort_values(["project", "line_no"])
    (ROOT / "data" / "sample").mkdir(parents=True, exist_ok=True)
    sample.to_csv(ROOT / "data" / "sample" / "stories_300.csv", index=False)

    print(f"Projects: {df['project'].nunique()}  |  cleaned stories: {len(df)}  |  log entries: {len(log)}")
    summary = sample.pivot_table(index="project", columns="split", values="story_id", aggfunc="count", fill_value=0)
    summary["pilot"] = sample.groupby("project")["pilot"].sum()
    summary["available"] = df.groupby("project").size()
    print(summary.to_string())
    print(f"\nTotal: {len(sample)}  dev: {(sample.split == 'dev').sum()}  test: {(sample.split == 'test').sum()}  pilot: {sample.pilot.sum()}")


if __name__ == "__main__":
    main()
