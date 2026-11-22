import json
res=json.load(open('anat.json'))
out={}
for sex in ('m','f'):
  r=res[sex]; o={'W':r['W'],'H':r['H']}
  for fig in 'fb':
    ps=[p for p in r['parts'] if p['fig']==fig]; idx={p['n']:i for i,p in enumerate(ps) if p['c']==0}
    o[fig]={'box':r['box'][fig],'sil':r['extra'][fig]['sil'],'wl':r['extra'][fig]['wl'],'z':r['extra'][fig]['z'],'hl':r['extra'][fig]['hl'],
      'p':[[p['id'],p['d']]+([idx[p['n']]] if p['c']==1 else []) for p in ps]}
  out[sex]=o
hdr='''// RECOVERY+ anatomy (male + female, front + back) — vector regions reconstructed from the owner-approved reference sheets
// docs/design/recovery-anatomy/APPROVED_MALE_2_5D.png and APPROVED_FEMALE_2_5D.png (1312 x 1199, both figures per sheet).
// How it was made (tools/recovery-anatomy/README.md): every dark area between the artwork's white lines was traced into its own path, in
// the sheet's own pixel coordinates, so the silhouettes, proportions and line positions are the approved drawing's. Each path is tagged with one
// of the 21 existing muscle-head ids (js/data/gym.js HEADS), or 'skin' / 'hair' (never coloured). A few heads that the artwork draws as one
// shape (lats + lower back, pec middle + lower, front + side delt on the female, the female's back of neck) are split without a drawn line:
// the second path is drawn on top of the first, so the neutral figure looks exactly like the artwork.
// Per figure: box (sheet px), sil (outer silhouette), wl (wide white areas), z (hair / hands / feet: [shape, 4 tone levels] traced from the artwork), hl (3 highlight bands traced from the artwork's own light areas: breast and pec volume,
// knee caps, muscle bellies; drawn as faint white over any colour), p: [headId, d] regions, parents first; split pieces after as [headId, d, parentIndex], drawn only when coloured differently from the parent. Used ONLY by RECOVERY+ (js/recovery-anatomy.js). The exercise picker keeps js/data/gym-anatomy.js.
'''
open('/home/user/Food-Tracker/js/data/recovery-anatomy.js','w').write(hdr+'const RA_DATA = '+json.dumps(out,separators=(',',':'))+';\n')
