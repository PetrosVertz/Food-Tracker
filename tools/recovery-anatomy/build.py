import sys, json, numpy as np
sys.path.insert(0,'.')
from scipy import ndimage as ndi
from skimage.measure import find_contours, approximate_polygon
from mapping import M,F
from skimage.segmentation import expand_labels
from PIL import Image
IM={'m':np.asarray(Image.open('../zip/APPROVED_MALE_2_5D.png').convert('L')).astype(float),'f':np.asarray(Image.open('../zip/APPROVED_FEMALE_2_5D.png').convert('L')).astype(float)}
HALO={'m':1,'f':2}; HALOT={'m':175,'f':185}
TOL=float(sys.argv[1]) if len(sys.argv)>1 else 0.55
BANDQ=[62,80,93]
TONE_T=[70,105,150,205]
def RR(x):
  from mapping import R
  return set(R(x))
ZONE={'m':RR('1-7,117-123,77,78,81,84-87,90,164-171,175,177,178,180,181'),'f':RR('1-12,16-18,96-102,105,106,65,66,71-74,137-140,142,146')}
HEADY={'m':{'f':0,'b':0},'f':{'f':0,'b':148}}
FOOT={'m':{'f':1076,'b':1100},'f':{'f':1050,'b':1082}}
def figcx(regs,mp,fig):
  xs=[r['cx'] for r in regs if r['fig']==fig and mp[r['n']] in ('abs','glutes','chest_mid','upper_back','lats')]
  return float(np.mean(xs))
def run(sex,mp,ops):
  lab=np.load(sex+'_lab2.npy'); im=IM[sex]
  lab0=lab.copy(); lab=expand_labels(lab,distance=HALO[sex]); lab[im>HALOT[sex]]=0
  regs=json.load(open(sex+'_regions.json')); meta=json.load(open(sex+'_meta.json'))
  H,W=lab.shape; rb={r['n']:r for r in regs}
  cx={f:figcx(regs,mp,f) for f in 'fb'}
  parents=[]; children=[]
  for r in regs: parents.append((mp[r['n']], r['fig'], lab==r['n'], r['n']))
  def mask(n): return lab==n
  def mirror(m,c):
    out=np.zeros_like(m); ys,xs=np.nonzero(m); xm=np.round(2*c-xs).astype(int); ok=(xm>=0)&(xm<W); out[ys[ok],xm[ok]]=True; return out
  for op in ops:
    k=op[0]
    if k=='mirror':   # pixels of region n inside mirrored region src (dilated) become id
      _,n,src,id_=op; fig=rb[n]['fig']; mm=ndi.binary_dilation(mirror(mask(src),cx[fig]),iterations=3); children.append((id_,fig,mask(n)&mm,n))
    elif k=='lowerfrac':  # a crescent along the region's own lower edge (follows the pec's curve), (1-frac) of its height thick
      _,ns,frac,id_=op; m=np.zeros_like(lab,bool)
      for n in ns: m|=mask(n)
      for c in children:
        if c[3] in ns: m&=~c[2]
      ys=np.nonzero(m)[0]; band=(1-frac)*(ys.max()-ys.min()); m2=np.zeros_like(m)
      for x in np.nonzero(m.any(0))[0]:
        col=np.nonzero(m[:,x])[0]; yb=col.max(); sel=col[col>yb-band]; m2[sel,x]=True
      m2=ndi.binary_opening(m2,iterations=3)&m
      children.append((id_,rb[ns[0]]['fig'],m2,ns[0]))
    elif k=='outer':  # outer fraction of width (away from fig centre)
      _,n,frac,id_=op; m=mask(n); fig=rb[n]['fig']; ys,xs=np.nonzero(m)
      d=np.abs(xs-cx[fig]); band=frac*(d.max()-d.min()); m2=np.zeros_like(m)
      for y in np.unique(ys):   # a crescent along the outer contour of each row (follows the shoulder's curve)
        r=ys==y; dm=d[r].max(); sel=r&(d>dm-band); m2[ys[sel],xs[sel]]=True
      m2=ndi.binary_opening(m2,iterations=3)&m
      children.append((id_,fig,m2,n))
    elif k=='central':  # lower back: rows below frac of combined height, central share of row extent
      _,ns,frac,share,id_=op; m=np.zeros_like(lab,bool)
      for n in ns: m|=mask(n)
      fig=rb[ns[0]]['fig']; ys=np.nonzero(m)[0]; y0=int(ys.min()+frac*(ys.max()-ys.min())); m2=np.zeros_like(m)
      for y in range(y0,ys.max()+1):
        xs=np.nonzero(m[y])[0]
        if not len(xs): continue
        tt=(y-y0)/max(1,ys.max()-y0); hw=(0.12+share*tt)*(xs.max()-xs.min())/2; sel=xs[np.abs(xs-cx[fig])<=hw]; m2[y,sel]=True
      # soften the top edge into a rounded point
      children.append((id_,fig,ndi.binary_opening(m2,iterations=4)&m,ns[0]))
    elif k=='yband':  # region n rows in [y0,y1) become id
      _,n,y0,y1,id_=op; m=mask(n).copy(); m[:y0]=False; m[y1:]=False; children.append((id_,rb[n]['fig'],m,n))
    elif k=='below':  # regions ns rows >= y become id
      _,ns,y,id_=op
      for n in ns:
        m=mask(n).copy(); m[:y]=False
        if m.any(): children.append((id_,rb[n]['fig'],m,n))
  # children overlap their parent by 1px so no seam shows
  children=[(i,f,ndi.binary_dilation(m,iterations=1)&mask(n) if True else m,n) for i,f,m,n in children]
  # figure boxes
  boxes={}
  for f in 'fb':
    m=np.zeros_like(lab,bool)
    for r in regs:
      if r['fig']==f: m|=lab==r['n']
    ys,xs=np.nonzero(m); boxes[f]=[int(xs.min())-6,int(ys.min())-6,int(xs.max()-xs.min())+12,int(ys.max()-ys.min())+12]
  def trace(m,sig=0.75,tol=None,minpts=4):
    tol=TOL if tol is None else tol
    pad=np.pad(m.astype(float),2); sm=ndi.gaussian_filter(pad,sig)
    out=[]
    for c in find_contours(sm,0.5):
      if len(c)<6: continue
      p=approximate_polygon(c,tol)
      if len(p)<minpts: continue
      pts=[(x-2,y-2) for y,x in p[:-1]]
      s='M%.1f %.1f'%pts[0]; px,py=pts[0]; segs=[]
      for x,y in pts[1:]:
        dx=round(x-px,1); dy=round(y-py,1); segs.append(('%g %g'%(dx,dy)).replace(' -','-')); px+=dx; py+=dy
      out.append(s+'l'+' '.join(segs).replace(' -','-')+'z')
    return ''.join(out)
  parts=[]
  for lst,kind in ((parents,0),(children,1)):
    for id_,fig,m,n in lst:
      if kind==0 and n in ZONE[sex] : continue
      if m.sum()<4: continue
      d=trace(m)
      if d: parts.append({'id':id_,'fig':fig,'d':d,'c':kind,'n':n})
  extra={}
  for f in 'fb':
    x,y,w,h=boxes[f]; sub=np.zeros_like(lab,bool); sub[max(0,y):y+h,max(0,x):x+w]=True
    body=(im<215)&sub; body=ndi.binary_closing(body,iterations=2); body=ndi.binary_fill_holes(body)
    bl,bn=ndi.label(body); bs=np.bincount(bl.ravel()); bs[0]=0; body=bs[bl]>=60
    sil=trace(body,1.0,0.9)
    dk=(lab>0)&sub; inner=ndi.binary_erosion(dk,iterations=2)
    num=ndi.gaussian_filter(im*dk,2.5); den=ndi.gaussian_filter(dk.astype(float),2.5); Ls=np.where(den>.05,num/np.maximum(den,1e-6),0)
    vals=Ls[inner]; bands=[]
    for q in BANDQ:
      t=np.percentile(vals,q); m=inner&(Ls>t); m=ndi.binary_opening(m,iterations=1)
      bands.append(trace(m,1.0,0.9,minpts=6))
    # white areas wider than the stroke lines (sternum diamond, between the thighs)
    wl=body&(lab==0)&(im>150); wl=ndi.binary_opening(wl,iterations=2)
    # non-muscle detail zones (hair, hands, feet): posterised tones straight from the artwork
    zm=np.zeros_like(body)
    for r in regs:
      if r['fig']==f and r['n'] in ZONE[sex]: zm|=lab0==r['n']
    zm[FOOT[sex][f]:]=True
    if HEADY[sex][f]:
      yy,xx=np.mgrid[0:H,0:W]; zm|=yy<HEADY[sex][f]-0.012*(xx-cx[f])**2
    zm=ndi.binary_dilation(zm,iterations=3)&body
    sm=ndi.gaussian_filter(im,0.6); tones=[trace(zm,0.9,0.7)]
    for t in TONE_T: tones.append(trace(zm&(sm>t),0.7,0.6,minpts=4))
    extra[f]={'sil':sil,'hl':bands,'wl':trace(wl,1.0,0.8),'z':tones}
  return {'W':W,'H':H,'cx':cx,'box':boxes,'parts':parts,'extra':extra}
OPS={'m':[('mirror',29,28,'delt_side'),('lowerfrac',[30],.7,'chest_lower'),('lowerfrac',[31],.7,'chest_lower'),
          ('central',[141],.56,.5,'lower_back'),('below',[203,205,199,200,201,202,204,206],1112,'skin')],
     'f':[('mirror',29,39,'biceps'),('lowerfrac',[29],.7,'chest_lower'),('lowerfrac',[28],.7,'chest_lower'),
          ('outer',26,.45,'delt_side'),('outer',27,.45,'delt_side'),('yband',109,0,148,'hair'),('yband',109,148,250,'traps'),
          ('central',[120,121],.56,.5,'lower_back'),('below',[159,160,161,162,163,164,165,166,167],1080,'skin')]}
res={}
for sex,mp in (('m',M),('f',F)):
  res[sex]=run(sex,mp,OPS[sex]); print(sex,len(res[sex]['parts']),'parts',sum(len(p['d']) for p in res[sex]['parts']),'chars')
json.dump(res,open('anat.json','w'))
