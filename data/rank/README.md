# Rank benchmark data (new engine, not live)

Small, versioned, offline. Open data only. Method: `docs/RANKING_ALGORITHM.md`. Research and licences: `docs/RANKING_RESEARCH.md`.

| File | What it is | Edit by hand? |
|---|---|---|
| `rank-config.json` | The settings: the 15 rank bands, the scoring weights, the coherence rules, which exercises have a benchmark, the variation factors, the source list | **Yes**: this is the place to change a number |
| `sources/gymstreak/*` | GymStreak's published tables, unchanged, with their README files | No |
| `sources/openpowerlifting-summary.json` | Our summary of the OpenPowerlifting bulk file (the 830 MB original is not stored here) | No: rebuild with `tools/rank/opl-summary.py` |
| `benchmarks.v1.json` | The benchmark database the engine reads | No: generated |
| `../../js/data/rank-bench.js` | The same database as a script the app and the simulator load | No: generated |
| `synthetic-test.json` | **Invented test numbers** for pull-ups and curls. Not data. Never loaded by the app | Only for tests |

After changing `rank-config.json` or a source: `node tools/rank/build-bench.js`, then `node tools/rank/sim.js` to see the effect and `node tools/check.js --boot`.

Rebuilding the OpenPowerlifting summary: download `openpowerlifting-latest.zip` from https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html, unzip, then
`python3 tools/rank/opl-summary.py <the csv> <output.json>` and copy the `rows` and `lifts` parts into `sources/openpowerlifting-summary.json`.

## Licences and credit

- **GymStreak (2026). How lifters actually train: GymStreak Training Data Study**, and **How lifters progress: GymStreak product data study**. https://www.gymstreak.com/research/how-lifters-train . Licence: Creative Commons Attribution 4.0 (CC BY 4.0). The files in `sources/gymstreak/` are unchanged copies; the benchmark database is derived from them (curves fitted to the published percentiles).
- **OpenPowerlifting**. Public domain. This page uses data from the OpenPowerlifting project, https://www.openpowerlifting.org. You may download a copy of the data at https://data.openpowerlifting.org.
- **Tsoukos A, Bogdanis GC (2025)**, J Funct Morphol Kinesiol 10(2):178, doi:10.3390/jfmk10020178, CC BY 4.0 (one variation factor).

No value in this folder comes from Strength Level, Symmetric Strength or Buffro. Their standards are proprietary and were read for method only.

If ranks from these benchmarks are ever shown in the app, the two credit lines above must be visible somewhere in it (for example Settings › About).
