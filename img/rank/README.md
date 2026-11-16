# Rank plates

15 ranks, low to high: Bronze III, II, I → Silver → Gold → Platinum → Diamond.
III = 5 kg plate, II = 10 kg, I = 25 kg, then rank up to the next metal.

- `large/`: full detail (texture, engraved "KG" top + upside-down bottom, animations). Use at 36 px and up.
- `small/`: no texture or labels, small plates drawn a bit bigger so they still read. Use under 36 px.
- Files are vectors (viewBox 64×64): sharp at any size; set width/height in CSS.
- Animations are inside each file (CSS): every "I" step has a shine sweep; Diamond has rainbow fire + sparkles. They stop with Reduce Motion.
  Note: CSS animations inside an SVG run when it is inlined or used as <img>/<object>; inline it if you need several on one screen to look identical.
- Ids are unique across all 30 files, so you can inline any mix on one page. Inlining the same file twice duplicates its ids: generate in code instead (claude/rank-plates-gen.py in the project).
- Rank up / demote spin animation: see the "Rank Icons" canvas (Anim artboard) and claude/rank-anim-gen.py in the project.
