"""Render the stored OSM extract as a static area map. Requires Pillow; no network access."""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent.parent
data=json.loads((root/'assets/maps/contact-area.json').read_text())
west,south,east,north=data['bounds']
W,H,S=960,750,2
im=Image.new('RGB',(W*S,H*S),'#ede9db');draw=ImageDraw.Draw(im)
def merc(lat):return math.log(math.tan(math.pi/4+math.radians(lat)/2))
def point(p):return ((p[0]-west)/(east-west)*W*S,(merc(north)-merc(p[1]))/(merc(north)-merc(south))*H*S)
features=[(f['tags'],[point(p) for p in f['points']]) for f in data['features']]
for t,p in features:
 if p[0]!=p[-1]:continue
 fill=None
 if t.get('natural')=='water' or t.get('landuse')=='reservoir':fill='#b5d6df'
 elif t.get('natural') in ['wood','scrub'] or t.get('landuse') in ['forest','orchard']:fill='#c6d5b4'
 elif t.get('landuse') in ['grass','meadow','farmland','farmyard']:fill='#e0e5ca'
 elif t.get('building'):fill='#c9c4ba'
 if fill:draw.polygon(p,fill=fill)
for t,p in features:
 if t.get('waterway'):draw.line(p,fill='#98c5d6',width=2*S)
for t,p in features:
 h=t.get('highway')
 if not h:continue
 if h in ['footway','path','track','bridleway']:draw.line(p,fill='#c6bcaa',width=1*S);continue
 width={'secondary':9,'tertiary':7,'unclassified':5,'residential':5,'service':3}.get(h,4)
 draw.line(p,fill='#b3aa98',width=(width+2)*S,joint='curve')
 draw.line(p,fill='#f8e3a5' if h=='secondary' else '#fffefa',width=width*S,joint='curve')
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=ImageFont.truetype(font_path,14*S)
small=ImageFont.truetype(font_path,11*S)
# Place each road name along its visible segment, without inventing property positions.
seen=set()
for t,p in features:
 name=t.get('name')
 if not t.get('highway') or not name or name in seen:continue
 visible=[q for q in p if 100*S<q[0]<(W-100)*S and 45*S<q[1]<(H-70)*S]
 if not visible:continue
 seen.add(name);x,y=visible[len(visible)//2]
 draw.text((x,y-15*S),name,font=font,fill='#343c33',anchor='mm',stroke_width=3*S,stroke_fill='#f4f0e7')
draw.rounded_rectangle((16*S,16*S,192*S,53*S),radius=4*S,fill='#f4f0e7')
draw.text((28*S,27*S),'Dunminning Road area',font=small,fill='#20221f')
draw.text(((W-28)*S,24*S),'N',font=font,fill='#20221f',anchor='mt')
draw.line(((W-28)*S,47*S,(W-28)*S,77*S),fill='#20221f',width=2*S)
draw.polygon([((W-28)*S,42*S),((W-33)*S,53*S),((W-23)*S,53*S)],fill='#20221f')
metres_per_width=(east-west)*111320*math.cos(math.radians((north+south)/2))
bar=500/metres_per_width*W*S
x,y=24*S,(H-33)*S
draw.rectangle((14*S,(H-64)*S,x+bar+12*S,(H-17)*S),fill='#f4f0e7')
draw.line((x,y,x+bar,y),fill='#20221f',width=3*S)
draw.text((x,y-21*S),'500 m',font=small,fill='#20221f')
credit='© OpenStreetMap contributors'
b=draw.textbbox((0,0),credit,font=small);cw=b[2]-b[0]
draw.rectangle(((W-12)*S-cw-12*S,(H-36)*S,W*S,H*S),fill='#f4f0e7')
draw.text(((W-8)*S,(H-25)*S),credit,font=small,fill='#20221f',anchor='rt')
im=im.resize((W,H),Image.Resampling.LANCZOS)
im.save(root/'public/images/contact-area-map.jpg','JPEG',quality=88,optimize=True,progressive=True)
print('Rendered contact-area-map.jpg')
