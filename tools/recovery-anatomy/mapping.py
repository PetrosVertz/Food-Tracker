def R(s): # "1-5,8" -> list
  out=[]
  for p in s.split(','):
    p=p.strip()
    if not p: continue
    if '-' in p: a,b=p.split('-'); out+=range(int(a),int(b)+1)
    else: out.append(int(p))
  return out
def build(d):
  m={}
  for k,v in d.items():
    for n in R(v): m[n]=k
  return m
M=build({
 'hair':'1-7,117-123','skin':'8-12,13-15,14,19,20,26,71,77,78,81,84-87,90,97,98,99,100,109-116,124-127,164-171,175,177,178,180,181,207-210',
 'traps':'16-18,21,128,129','delt_side':'22,23,28,132','chest_upper':'24,25','delt_front':'27,29','chest_mid':'30,31,32',
 'triceps':'33,42,138,139,140,142','biceps':'34,41','obliques':'35,36,39,40,43,44,47,48,54,55,63,64,145,146,148,149,153',
 'abs':'37,38,45,46,49,50,57,60','forearms':'51-53,56,58,59,61,62,67-70,143,144,147,150-152,154,158',
 'abductors':'65,66,74,75,76,155-157,159,160,163','skin2':'71','quads':'72,73,79,80,88,89,91-96,172,173',
 'adductors':'82,83,174,191,192','calves':'101-108,193-206','skinknee':'97,98,99,100',
 'delt_rear':'130,131','upper_back':'133-137','lats':'141','glutes':'161,162','hamstrings':'176,179,182-190',
})
for k in ('skin2','skinknee'):
  pass
F=build({
 'hair':'1-12,16-18,96-102,105,106','skin':'13-15,19-21,62,65,66,71-74,80-86,95,103,104,107,108,137-140,142,146,168,169',
 'traps':'22,23','chest_upper':'24,25','delt_front':'26,27','chest_mid':'28,29',
 'obliques':'30-33,35,38,41,42,45,46,51,52,124,125','abs':'36,37,43,44,53,54','triceps':'34,40,114-119,122,123',
 'biceps':'39','forearms':'47-50,55,56,59-61,126-128,131-134','abductors':'57,58,129,130','quads':'63,64,67,70,75-79,141,143',
 'adductors':'68,69,144,145','calves':'87-94,155-167','upper_back':'109,112,113','delt_rear':'110,111','lats':'120,121',
 'glutes':'135,136','hamstrings':'147-154',
})
# skin variants in male map: normalise
M={k:('skin' if v in('skin2','skinknee') else v) for k,v in M.items()}
