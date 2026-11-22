import sys, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage.segmentation import expand_labels
from skimage.measure import find_contours, approximate_polygon
src,sex,outp=sys.argv[1],sys.argv[2],sys.argv[3]
im=np.asarray(Image.open(src).convert('L')).astype(float)
H,W=im.shape
th=im-ndi.grey_opening(im,size=(7,7))
line=(th>22)|(im>150)
bg=im>235
# labels from slightly thickened lines (closes hairline breaks)
sep=ndi.binary_dilation(line,iterations=1)
dark=~line
lab,n=ndi.label(~sep)
sz=np.bincount(lab.ravel())
seed=np.where((lab>0)&(sz[lab]>=150),lab,0)
full=expand_labels(seed,distance=6)
full[~dark]=0
# leftover small dark islands (hair strands etc): own labels if >=25px
rest=dark&(full==0)
rl,rn=ndi.label(rest); rs=np.bincount(rl.ravel())
off=full.max()+1
full=np.where((rl>0)&(rs[rl]>=25),rl+off,full)
ids=[i for i in np.unique(full) if i]
# split figures: gap in x
cols=(~bg).sum(0); xs=np.where(cols>0)[0]; g=np.argmax(np.diff(xs)); xmid=(xs[g]+xs[g+1])/2
np.save(outp+'_lab.npy',full)
json.dump({'W':W,'H':H,'xmid':float(xmid)},open(outp+'_meta.json','w'))
print(sex,'regions',len(ids),'xmid',xmid)
