import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
sex=sys.argv[1]
lab=np.load(sex+'_lab.npy'); meta=json.load(open(sex+'_meta.json'))
ids=[i for i in np.unique(lab) if i]
com=ndi.center_of_mass(np.ones_like(lab),lab,ids); area=ndi.sum(np.ones_like(lab),lab,ids)
recs=[(0 if c[1]<meta['xmid'] else 1, round(c[0]/12), c[1], i, c, a) for i,c,a in zip(ids,com,area)]
recs.sort()
new=np.zeros_like(lab); info=[]
for k,(fig,_,_,i,c,a) in enumerate(recs,1):
  new[lab==i]=k; info.append({'n':k,'fig':'fb'[fig],'cx':round(c[1],1),'cy':round(c[0],1),'area':int(a)})
np.save(sex+'_lab2.npy',new); json.dump(info,open(sex+'_regions.json','w'))
rng=np.random.default_rng(7); pal=rng.integers(90,255,(new.max()+1,3)); pal[0]=[255,255,255]
img=Image.fromarray(pal[new].astype(np.uint8))
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',11)
except: font=None
big=img.resize((img.width*2,img.height*2),Image.NEAREST); d=ImageDraw.Draw(big)
for r in info:
  d.text((r['cx']*2-7,r['cy']*2-6),str(r['n']),fill=(0,0,0),font=font)
x=meta['xmid']*2
for fig,(x0,x1) in (('f',(0,x)),('b',(x,big.width))):
  for half,(y0,y1) in (('u',(0,1220)),('l',(1150,big.height))):
    big.crop((int(x0)+250 if fig=='f' else int(x0),y0,int(x1) if fig=='f' else int(x1)-250,y1)).save(f'{sex}_{fig}{half}.png')
print(len(info))
