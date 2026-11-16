# Rank fairness check (0.7.10)

How the new rank is worked out, and whether it is fair. All numbers come from the rating in `js/data/gym.js` (`RANK` … `rankGap`). `node tools/rank-table.js` prints the tables again, and `node tools/check.js` tests the rules at the bottom every time.

## What was used

| Part | Weight | What it is |
|---|---:|---|
| Peak strength | **60%** | Best estimated 1RM in the last 12 weeks, from finished normal sets of 12 reps or fewer |
| Working strength | **25%** | Average estimated 1RM of the **top 3 sets of your best workout** (a missing set counts as 0, so one lone set is only a third of this part) |
| Volume | **15%** | Most kg moved in one workout (sets × reps × kg), **square-rooted** (double the volume = +41% of this part). It is scaled so normal training at Intermediate equals your strength, and it can never count for more than your peak |

The weights are the starting values from the plan. The fairness check did not need to change them.

- **Body weight** changes how much every part is worth: each part is divided by body weight to the power 0.67. The standards are exact at 80 kg for men and 60 kg for women. Lighter lifters need a little more per kg of body weight, heavier lifters a little less. Example: 3 × 5 at 100 kg on bench is **Gold 1 for a 65 kg man** and **Silver 1 for a 120 kg man**. The 120 kg man needs about 150 kg for the same rank, which is the same effort relative to his size.
- **Women** use the women's standards, as before.
- **The yardstick:** a level's starting point is set where someone whose 1RM sits on that standard, and who trains normally (4 × 8 at 75%), would land.
- **Steady:** your best workouts of the last 12 weeks count in full. After that, older ones count 1% less for every extra week, but never less than 75%. One bad or skipped day can't lower the rank. Only a long break lowers it, and slowly.

## Changes the check led to

1. **Diamond was too far away for women's bench and deadlift, and for men's squat and deadlift.** The top band (Diamond 3 → 1) was as wide as Advanced → Elite. For women's bench that put Diamond 1 at 1.83 × body weight, and for women's deadlift at 3.0 × body weight, which is close to world-record level. The band is now capped at 15% above Elite. A 65 kg woman now needs about 105 kg on bench (was about 116 kg) and 175 kg on deadlift (was about 190 kg). Men's bench did not change.
2. **A lucky day could jump two levels at the top**, where a level is only about 5% wide. Now a peak from one workout counts at most 5% above your best from any other workout. As soon as a second workout comes close to it, it counts in full. It still moves you up, just never more than one level at a time.

## The checks

- **Beginner** (80 kg man, first month, 3 × 8 at 40 kg on bench): **Bronze 2**. After three months at 3 × 8 at 55 kg: **Silver 3**. A 65 kg woman doing 3 × 8 at 25 kg: **Silver 3**. Beginners land in Bronze to low Silver.
- **Average gym-goer** (80 kg man, bench 1RM about 80–110 kg): **Silver 2 to Gold 3**. Silver to Gold.
- **Strong lifter** (80 kg man, bench 1RM 140–155 kg): **Platinum**.
- **Diamond 1 is for very strong lifters only (a few percent), but a real person can reach it.** Estimated 1RM needed:

  | | Bench | Squat | Deadlift |
  |---|---:|---:|---:|
  | Man 65 kg | 151 | 211 | 230 |
  | Man 80 kg | 173.5 | 242.5 | 264.5 |
  | Woman 65 kg | 104.5 | 139.5 | 174.5 |
  | Woman 80 kg | 120.5 | 160.5 | 200.5 |

  All of these are within about 10% of the Elite standard. Strong club lifters reach them. No level needs world-record numbers, and none is reached by an empty bar.
- **Same effort, same rank, at any body weight:** the check tests that a lift scaled by body weight^0.67 gets the same level from 55 to 120 kg, for every lift.
- **One lucky set:** after eight weeks of 4 × 8 at 80 kg (Gold 3 for an 80 kg man), a single at 110 kg leaves the rank at **Gold 3**, and so does a single at 120 kg. The check tests every lift at four strength levels with a single set 25% heavier than usual: never more than one level up.
- **One bad workout** (3 × 8 at 60% of the usual weight): the rank stays the same, for every lift and level.
- **A break:** the same lifter stopping completely is still Gold 3 after 13 weeks, Silver 1 after 20 weeks and Silver 2 after 40 weeks. It never drops below 75% of the old rating.
- Also checked: more kg or more reps never gives a lower level, and every level needs more kg for a heavier lifter (55 → 120 kg).

## Kilograms needed for each level

Each cell shows **estimated 1RM · weight for 3 sets of 5**. The 1RM is the one needed if you train normally around it. The 3 × 5 weight is the one that reaches the level if that one workout is all you have logged. Bronze 3 is where everyone starts.

### Bench · men

| Level | 55 kg | 65 kg | 80 kg | 100 kg | 120 kg |
|---|---:|---:|---:|---:|---:|
| Bronze 3 | – | – | – | – | – |
| Bronze 2 | 36.5 · 31 | 41 · 34.5 | 47 · 40 | 54.5 · 46 | 61.5 · 52 |
| Bronze 1 | 41.5 · 35.5 | 46.5 · 39.5 | 53.5 · 45.5 | 62 · 52.5 | 70 · 59.5 |
| Silver 3 | 47 · 40 | 52.5 · 45 | 60.5 · 51.5 | 70 · 59.5 | 79 · 67.5 |
| Silver 2 | 57.5 · 49.5 | 64 · 55.5 | 73.5 · 63.5 | 85.5 · 74 | 96.5 · 83.5 |
| Silver 1 | 67.5 · 59.5 | 75.5 · 66.5 | 87 · 76 | 101 · 88.5 | 114 · 100 |
| Gold 3 | 78 · 69 | 87.5 · 77 | 100.5 · 88.5 | 116.5 · 103 | 131.5 · 116 |
| Gold 2 | 88.5 · 78 | 99 · 87 | 113.5 · 100 | 132 · 116 | 149 · 131.5 |
| Gold 1 | 99 · 87 | 110.5 · 97 | 127 · 111.5 | 147.5 · 129.5 | 166.5 · 146.5 |
| Platinum 3 | 109 · 96 | 122 · 107 | 140.5 · 123 | 163 · 143 | 184 · 161.5 |
| Platinum 2 | 114.5 · 100.5 | 128 · 112 | 147 · 129 | 170.5 · 149.5 | 192.5 · 169 |
| Platinum 1 | 119.5 · 105 | 133.5 · 117 | 153.5 · 134.5 | 178.5 · 156.5 | 201.5 · 176.5 |
| Diamond 3 | 124.5 · 109 | 139.5 · 122 | 160.5 · 140.5 | 186 · 163 | 210 · 184 |
| Diamond 2 | 130 · 113.5 | 145.5 · 127 | 167 · 146 | 194 · 169.5 | 219 · 191.5 |
| Diamond 1 | 135 · 118 | 151 · 132 | 173.5 · 152 | 201.5 · 176.5 | 227.5 · 199 |

### Bench · women

| Level | 55 kg | 65 kg | 80 kg | 100 kg | 120 kg |
|---|---:|---:|---:|---:|---:|
| Bronze 3 | – | – | – | – | – |
| Bronze 2 | 19 · 16 | 21.5 · 18 | 24.5 · 21 | 28.5 · 24 | 32 · 27 |
| Bronze 1 | 24 · 20.5 | 26.5 · 22.5 | 30.5 · 26 | 35.5 · 30 | 40 · 34 |
| Silver 3 | 28.5 · 24.5 | 32 · 27.5 | 36.5 · 31.5 | 42.5 · 36.5 | 48 · 41.5 |
| Silver 2 | 33.5 · 29 | 37 · 32.5 | 42.5 · 37 | 49.5 · 43 | 56 · 48.5 |
| Silver 1 | 38 · 33.5 | 42.5 · 37.5 | 49 · 43 | 56.5 · 49.5 | 64 · 56 |
| Gold 3 | 42.5 · 38 | 47.5 · 42 | 55 · 48.5 | 63.5 · 56 | 72 · 63.5 |
| Gold 2 | 47.5 · 42 | 53 · 47 | 61 · 53.5 | 70.5 · 62.5 | 80 · 70.5 |
| Gold 1 | 52 · 46 | 58.5 · 51.5 | 67 · 59 | 77.5 · 68.5 | 88 · 77 |
| Platinum 3 | 57 · 50 | 63.5 · 56 | 73 · 64 | 84.5 · 74.5 | 95.5 · 84 |
| Platinum 2 | 66.5 · 58 | 74 · 65 | 85 · 74.5 | 99 · 86.5 | 111.5 · 98 |
| Platinum 1 | 75.5 · 66 | 84.5 · 74 | 97.5 · 85 | 113 · 98.5 | 127.5 · 111.5 |
| Diamond 3 | 85 · 74.5 | 95 · 83 | 109.5 · 95.5 | 127 · 111 | 143.5 · 125 |
| Diamond 2 | 89.5 · 78 | 100 · 87 | 115 · 100 | 133.5 · 116.5 | 150.5 · 131.5 |
| Diamond 1 | 93.5 · 81.5 | 104.5 · 91.5 | 120.5 · 105 | 139.5 · 121.5 | 158 · 137.5 |

### Squat · men

| Level | 55 kg | 65 kg | 80 kg | 100 kg | 120 kg |
|---|---:|---:|---:|---:|---:|
| Bronze 3 | – | – | – | – | – |
| Bronze 2 | 57.5 · 49 | 64 · 55 | 73.5 · 63 | 85.5 · 73 | 96.5 · 82.5 |
| Bronze 1 | 67.5 · 58.5 | 75.5 · 65.5 | 87 · 75 | 101 · 87.5 | 114 · 98.5 |
| Silver 3 | 78 · 68 | 87.5 · 76 | 100.5 · 87.5 | 116.5 · 101.5 | 131.5 · 115 |
| Silver 2 | 83 · 73 | 93 · 81.5 | 107 · 94 | 124 · 109 | 140 · 123 |
| Silver 1 | 88.5 · 78 | 99 · 87 | 113.5 · 100 | 132 · 116 | 149 · 131 |
| Gold 3 | 93.5 · 82.5 | 104.5 · 92.5 | 120.5 · 106.5 | 139.5 · 123.5 | 157.5 · 139.5 |
| Gold 2 | 109 · 96 | 122 · 107.5 | 140.5 · 123.5 | 163 · 143.5 | 184 · 162 |
| Gold 1 | 124.5 · 109.5 | 139.5 · 122.5 | 160.5 · 141 | 186 · 163.5 | 210 · 184.5 |
| Platinum 3 | 140.5 · 123 | 157 · 137.5 | 180.5 · 158 | 209.5 · 183.5 | 236.5 · 207.5 |
| Platinum 2 | 150.5 · 132 | 168.5 · 147.5 | 193.5 · 169.5 | 225 · 197 | 254 · 222.5 |
| Platinum 1 | 161 · 141 | 180 · 157.5 | 207 · 181 | 240 · 210 | 271.5 · 237.5 |
| Diamond 3 | 171.5 · 150 | 191.5 · 167.5 | 220.5 · 192.5 | 255.5 · 223.5 | 289 · 252.5 |
| Diamond 2 | 180 · 157 | 201 · 175.5 | 231.5 · 202 | 268.5 · 234.5 | 303.5 · 265 |
| Diamond 1 | 188.5 · 164.5 | 211 · 184 | 242.5 · 211.5 | 281.5 · 245.5 | 318 · 277.5 |

### Squat · women

| Level | 55 kg | 65 kg | 80 kg | 100 kg | 120 kg |
|---|---:|---:|---:|---:|---:|
| Bronze 3 | – | – | – | – | – |
| Bronze 2 | 33.5 · 28 | 37 · 31.5 | 42.5 · 36 | 49.5 · 42 | 56 · 47.5 |
| Bronze 1 | 38 · 32 | 42.5 · 36 | 49 · 41.5 | 56.5 · 48 | 64 · 54 |
| Silver 3 | 42.5 · 36.5 | 47.5 · 41 | 55 · 47 | 63.5 · 54.5 | 72 · 61.5 |
| Silver 2 | 52 · 45 | 58.5 · 50.5 | 67 · 58 | 77.5 · 67.5 | 88 · 76 |
| Silver 1 | 61.5 · 54 | 69 · 60.5 | 79 · 69.5 | 92 · 80.5 | 103.5 · 91 |
| Gold 3 | 71 · 63 | 79.5 · 70 | 91 · 80.5 | 106 · 93.5 | 119.5 · 105.5 |
| Gold 2 | 75.5 · 67 | 84.5 · 74.5 | 97.5 · 86 | 113 · 99.5 | 127.5 · 112.5 |
| Gold 1 | 80.5 · 71 | 90 · 79.5 | 103.5 · 91 | 120 · 105.5 | 135.5 · 119.5 |
| Platinum 3 | 85 · 75 | 95 · 84 | 109.5 · 96.5 | 127 · 112 | 143.5 · 126.5 |
| Platinum 2 | 94.5 · 83 | 106 · 93 | 121.5 · 107 | 141 · 124 | 159.5 · 140 |
| Platinum 1 | 104 · 91.5 | 116.5 · 102 | 133.5 · 117 | 155 · 136 | 175.5 · 153.5 |
| Diamond 3 | 113.5 · 99.5 | 127 · 111 | 146 · 127.5 | 169 · 148 | 191 · 167.5 |
| Diamond 2 | 119 · 104 | 133 · 116.5 | 153 · 134 | 177.5 · 155.5 | 200.5 · 175.5 |
| Diamond 1 | 125 · 109 | 139.5 · 122 | 160.5 · 140 | 186 · 163 | 210.5 · 184 |

### Deadlift · men

| Level | 55 kg | 65 kg | 80 kg | 100 kg | 120 kg |
|---|---:|---:|---:|---:|---:|
| Bronze 3 | – | – | – | – | – |
| Bronze 2 | 73 · 62 | 81.5 · 69.5 | 93.5 · 79.5 | 108.5 · 92.5 | 122.5 · 104.5 |
| Bronze 1 | 83 · 71.5 | 93 · 80 | 107 · 92 | 124 · 107 | 140 · 120.5 |
| Silver 3 | 93.5 · 81 | 104.5 · 91 | 120.5 · 104.5 | 139.5 · 121 | 157.5 · 137 |
| Silver 2 | 104 · 91 | 116.5 · 101.5 | 133.5 · 116.5 | 155 · 135.5 | 175 · 153 |
| Silver 1 | 114.5 · 100.5 | 128 · 112.5 | 147 · 129 | 170.5 · 150 | 192.5 · 169.5 |
| Gold 3 | 124.5 · 110 | 139.5 · 123 | 160.5 · 141.5 | 186 · 164.5 | 210 · 185.5 |
| Gold 2 | 135 · 119 | 151 · 133.5 | 173.5 · 153 | 201.5 · 178 | 227.5 · 201 |
| Gold 1 | 145.5 · 128 | 162.5 · 143.5 | 187 · 164.5 | 217 · 191 | 245 · 216 |
| Platinum 3 | 156 · 137 | 174.5 · 153.5 | 200.5 · 176 | 232.5 · 204.5 | 262.5 · 231 |
| Platinum 2 | 166 · 146 | 186 · 163.5 | 213.5 · 187.5 | 248 · 218 | 280 · 246 |
| Platinum 1 | 176.5 · 155 | 197.5 · 173.5 | 227 · 199 | 263.5 · 231 | 297.5 · 261 |
| Diamond 3 | 187 · 164 | 209 · 183.5 | 240.5 · 210.5 | 279 · 244.5 | 315 · 276.5 |
| Diamond 2 | 196.5 · 172 | 219.5 · 192.5 | 252.5 · 221 | 293 · 256.5 | 331 · 290 |
| Diamond 1 | 205.5 · 180 | 230 · 201.5 | 264.5 · 231.5 | 307 · 268.5 | 346.5 · 303.5 |

### Deadlift · women

| Level | 55 kg | 65 kg | 80 kg | 100 kg | 120 kg |
|---|---:|---:|---:|---:|---:|
| Bronze 3 | – | – | – | – | – |
| Bronze 2 | 38 · 32 | 42.5 · 36 | 49 · 41.5 | 56.5 · 48 | 64 · 54 |
| Bronze 1 | 47.5 · 41 | 53 · 45.5 | 61 · 52.5 | 70.5 · 61 | 80 · 68.5 |
| Silver 3 | 57 · 49.5 | 63.5 · 55.5 | 73 · 63.5 | 84.5 · 74 | 95.5 · 83.5 |
| Silver 2 | 61.5 · 54 | 69 · 60.5 | 79 · 69.5 | 92 · 80.5 | 103.5 · 91 |
| Silver 1 | 66.5 · 58.5 | 74 · 65 | 85 · 75 | 99 · 87 | 111.5 · 98 |
| Gold 3 | 71 · 63 | 79.5 · 70 | 91 · 80.5 | 106 · 93.5 | 119.5 · 105.5 |
| Gold 2 | 80.5 · 71 | 90 · 79.5 | 103.5 · 91 | 120 · 105.5 | 135.5 · 119.5 |
| Gold 1 | 90 · 79 | 100.5 · 88.5 | 115.5 · 101.5 | 134 · 118 | 151.5 · 133 |
| Platinum 3 | 99.5 · 87 | 111 · 97.5 | 127.5 · 112 | 148 · 130 | 167.5 · 147 |
| Platinum 2 | 113.5 · 99.5 | 127 · 111 | 146 · 127.5 | 169 · 148 | 191 · 167.5 |
| Platinum 1 | 127.5 · 111.5 | 142.5 · 124.5 | 164 · 143.5 | 190.5 · 166.5 | 215 · 188 |
| Diamond 3 | 142 · 123.5 | 158.5 · 138.5 | 182 · 159 | 211.5 · 184.5 | 239 · 208.5 |
| Diamond 2 | 149 · 130 | 166.5 · 145 | 191 · 167 | 222 · 193.5 | 251 · 218.5 |
| Diamond 1 | 156 · 136 | 174.5 · 152 | 200.5 · 174.5 | 232.5 · 202.5 | 263 · 229 |
