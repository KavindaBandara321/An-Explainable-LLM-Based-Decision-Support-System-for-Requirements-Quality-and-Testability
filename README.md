# User story quality – data preparation

MSc Advanced Software Engineering project (Kavinda Bandara).
Dataset: Dalpiaz, F. (2018) *Requirements data sets (user stories)*, Mendeley Data, doi:10.17632/7zbk8zsd8y.1

## Setup
```
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
```
Put the dataset .txt files in `data/raw/` (named like `g02-federalspending.txt`).

## Run in this order
| Step | Command | Output |
|---|---|---|
| 1. Clean and sample | `python src/prepare_data.py` | `data/processed/all_stories.csv`, `data/processed/cleaning_log.csv`, `data/sample/stories_300.csv` |
| 2. Pilot workbooks | `python src/make_labelling_sheets.py` | `labelling/pilot_annotator_A.xlsx`, `labelling/pilot_annotator_B.xlsx` |
| 3. Pilot agreement | `python src/agreement.py` | `results/pilot_agreement.csv`, `results/pilot_disagreements.csv` |
| 4. Full workbooks (after the pilot) | `python src/make_labelling_sheets.py --full` | `labelling/full_annotator_A.xlsx`, `labelling/full_annotator_B.xlsx` |
| 5. Full agreement | `python src/agreement.py --full` | `results/full_agreement.csv`, `results/full_disagreements.csv` |

## Design decisions
- Random seeds are fixed (sampling 42, row shuffle 7), so every run gives the same sample.
- 15 stories per project: 5 development + 10 test. The 40 pilot stories (2 per project) come only from the development set.
- **Never use test-set stories when writing rules or prompts.** They are labelled for ground truth only.
- Cleaning joins stories split over two lines, drops non-story lines and removes exact duplicates. Every change is in `cleaning_log.csv`.
- Re-running step 1 after adding new files changes the sample. Only do this **before** labelling starts.
