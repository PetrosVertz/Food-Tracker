import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
S=sys.argv[1]; Z=sys.argv[2]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
anat=json.load(open(S+'/work/anat.json'))
for sex,name in (('m','MALE'),('f','FEMALE')):
  ref=Image.open(f'{Z}/APPROVED_{name}_2_5D.png').convert('RGB'); svg=Image.open(f'{S}/cmp/{sex}_neutral.png').convert('RGB')
  for fig,label in (('f','front'),('b','back')):
    x,y,w,h=anat[sex]['box'][fig]; box=(x,y,x+w,y+h)
    r=ref.crop(box); s=svg.crop(box)
    ov=Image.blend(r,s,0.5)
    # silhouette difference: red = only in reference, cyan = only in SVG
    ra=np.asarray(r.convert('L'))<200; sa=np.asarray(s.convert('L'))<200
    diff=np.full((h,w,3),255,np.uint8); both=ra&sa; diff[both]=(70,70,70); diff[ra&~sa]=(230,40,40); diff[sa&~ra]=(0,170,220)
    iou=both.sum()/max(1,(ra|sa).sum())
    sheet=Image.new('RGB',(w*4+50,h+50),'white'); d=ImageDraw.Draw(sheet)
    for i,(im,t) in enumerate(((r,'Approved PNG'),(s,'SVG (neutral)'),(ov,'50% overlay'),(Image.fromarray(diff),'Silhouette diff'))):
      sheet.paste(im,(10+i*(w+10),40)); d.text((10+i*(w+10),8),t,fill=(0,0,0),font=font)
    sheet.save(f'{S}/cmp/{sex}_{fig}_compare.png')
    print(sex,label,'silhouette IoU %.4f'%iou,'ref-only px',int((ra&~sa).sum()),'svg-only px',int((sa&~ra).sum()))
