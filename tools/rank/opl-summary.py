import csv, sys, math, json, collections
f = sys.argv[1]
LIFTS = [('squat','Best3SquatKg'),('bench','Best3BenchKg'),('deadlift','Best3DeadliftKg')]
AGEB = [(14,17),(18,23),(24,34),(35,39),(40,44),(45,49),(50,54),(55,59),(60,64),(65,69),(70,79)]
def ab(a):
    for lo,hi in AGEB:
        if lo <= a <= hi: return f'{lo}-{hi}'
best = {}      # (name,sex,lift,ageband) -> (kg,bw,tested)
rows = 0
with open(f, newline='', encoding='utf8') as fh:
    for r in csv.DictReader(fh):
        rows += 1
        if r['Equipment'] != 'Raw' or r['Sex'] not in 'MF' or not r['Sex']: continue
        try: bw = float(r['BodyweightKg']); age = float(r['Age'])
        except ValueError: continue
        if not (35 <= bw <= 200) or r['Place'] in ('DQ','DD','NS'): continue
        b = ab(int(age))
        if not b: continue
        for lift, col in LIFTS:
            try: kg = float(r[col])
            except ValueError: continue
            if kg <= 0: continue
            k = (r['Name'], r['Sex'], lift, b)
            if k not in best or kg > best[k][0]: best[k] = (kg, bw, r['Tested'] == 'Yes')
print('rows', rows, 'bests', len(best), file=sys.stderr)
def pct(v, p):
    v = sorted(v); i = p/100*(len(v)-1); lo = int(i); hi = min(lo+1, len(v)-1); return v[lo] + (v[hi]-v[lo])*(i-lo)
out = {'rows': rows, 'lifts': {}}
for sex in 'MF':
    for lift, _ in LIFTS:
        base = [(kg,bw,t) for (n,s,l,b),(kg,bw,t) in best.items() if s == sex and l == lift and b in ('18-23','24-34')]
        # young adult 18-34: merge per lifter not needed (two bands may double count a lifter; acceptable, noted)
        lo, hi = (50,130) if sex == 'M' else (42,110)
        xs = [(math.log(bw), math.log(kg)) for kg,bw,t in base if lo <= bw <= hi]
        n = len(xs); mx = sum(x for x,_ in xs)/n; my = sum(y for _,y in xs)/n
        bexp = sum((x-mx)*(y-my) for x,y in xs)/sum((x-mx)**2 for x,_ in xs)
        res = [y - my - bexp*(x-mx) for x,y in xs]; sd = math.sqrt(sum(e*e for e in res)/n)
        bands = {}
        for b0 in range(40, 150, 10):
            v = [kg for kg,bw,t in base if b0 <= bw < b0+10]
            vt = [kg for kg,bw,t in base if b0 <= bw < b0+10 and t]
            if len(v) < 200: continue
            bands[f'{b0}-{b0+9}'] = {'n': len(v), 'n_tested': len(vt), **{f'p{p}': round(pct(v,p),1) for p in (5,10,25,50,75,90,95,99,99.9)}, 'max': max(v),
                                     **({f't_p{p}': round(pct(vt,p),1) for p in (50,90,99)} if len(vt) >= 200 else {})}
        # ceiling: per-band max vs bw, fit max = c*bw^k through band 99.9th
        ages = {}
        ref = None
        for lo_,hi_ in AGEB:
            b = f'{lo_}-{hi_}'
            v = [math.log(kg) - bexp*math.log(bw) for (n_,s,l,bb),(kg,bw,t) in best.items() if s == sex and l == lift and bb == b and lo <= bw <= hi]
            if len(v) >= 150: ages[b] = (len(v), pct(v,50))
        ref = ages['24-34'][1]
        ages = {b: {'n': n_, 'factor': round(math.exp(m-ref),3)} for b,(n_,m) in ages.items()}
        out['lifts'][f'{lift}_{sex}'] = {'n': len(base), 'n_fit': n, 'bw_exponent': round(bexp,3), 'median_at_ref': round(math.exp(my + bexp*(math.log(80 if sex=='M' else 60)-mx)),1), 'log_sd': round(sd,3), 'bands': bands, 'age': ages}
json.dump(out, open(sys.argv[2],'w'), indent=1)
