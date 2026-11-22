# RECOVERY+ anatomy: how `js/data/recovery-anatomy.js` is made

The four RECOVERY+ figures (male / female, front / back) are vector regions traced from the owner-approved sheets in
`docs/design/recovery-anatomy/APPROVED_MALE_2_5D.png` and `APPROVED_FEMALE_2_5D.png` (1312 × 1199 px, both views per sheet).
The app never loads these PNGs; it draws the SVG paths. Re-run this only if the approved artwork changes.

Needs Python 3 with numpy, Pillow, scipy, scikit-image (`pip install scipy scikit-image`) and Node + Playwright (for the comparison).
The scripts expect to run in a scratch folder whose sibling `../zip/` holds the two approved PNGs.

| Step | Script | What it does |
|---|---|---|
| 1 | `trace.py <png> m\|f <prefix>` | Finds the white separation lines (bright pixels + thin bright ridges), labels every dark area between them; tiny breaks in faint lines are closed only for labelling, then each pixel goes back to its own region. |
| 2 | `renum.py m\|f` | Numbers the regions top-to-bottom per figure and writes numbered close-up sheets (used to fill in `mapping.py`). |
| 3 | `mapping.py` | Region number → muscle-head id (the app's 21 ids) or `skin` / `hair`. Hand-made from the close-ups. |
| 4 | `build.py` | Applies the documented invisible splits (lats / lower back, pec mid / lower crescent, female front / side delt crescent, female back-of-neck traps band, male right delt mirrored from the left), gives each region back the soft pixels next to its lines (so lines keep the artwork's width), traces each region with sub-pixel contours, and traces the silhouette, wide white areas, 3 highlight bands (the artwork's own light areas) and the hair / hands / feet tone levels. |
| 5 | `emit.py` | Writes `js/data/recovery-anatomy.js`. |
| 6 | `render.js` + `compare.py` | Renders the SVG through the real renderer at the sheet's exact pixel size and makes the side-by-side / 50 % overlay / silhouette-difference sheets (`docs/design/recovery-anatomy/compare/`). |

Measured silhouette overlap with the approved sheets (intersection over union, last run): male front 0.940, male back 0.949,
female front 0.940, female back 0.948. Most of the remaining difference is the white lines themselves and the anti-aliased outer edge.

Licensing: the paths are new geometry traced from the owner's approved reference images; no Body Muscles (Apache-2.0) path is reused in
these files. `js/data/gym-anatomy.js` (Body Muscles, `licenses/body-muscles/`) is unchanged and still used by the exercise picker and info views.
