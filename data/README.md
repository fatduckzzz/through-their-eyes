# Chart audit data

Open data behind the "Charts" chapter. Charts are from Our World in Data (CC BY 4.0); each row links to its source.

- `chart-audit-sample.csv`: **120 charts drawn at random** from the 4292 charts in the Our World in Data sitemap (seed 20261119, drawn 2026-11-18). The checker's thresholds were frozen on 2026-11-18, before this sample was analysed.
- `chart-audit-trial-set.csv`: 30 hand-picked charts used to try the checker (6 per chart kind). **Not a sample.** Three of them appear up close in the story.

Columns: `flagged_any`, `protan`, `deutan`, `tritan` are 1 when the checker flags at least one pair of colours that collapse for that type of colour vision; `pairs_flagged` counts flagged pairs; `colours_found` counts category colours the checker found.

## Limits (please keep these with any figure you quote)
1. The checker has **not** been validated against people with colour vision deficiency. A flag is not proof that a reader fails.
2. One publisher, one house style. This is not "all charts".
3. The checker reads pixels. Sequential map scales and dense charts may be over-flagged, so results are given by chart kind.
4. Whether a direct label or another second cue rescues a flagged pair is **not** measured.

Overall: 51 of 120 charts (43%, 95% interval 34–51%) have at least one flagged pair; 28 of 120 (23%) have a pair that becomes nearly identical (simulated colour difference under 13) for some type.
