# Dev helper: build a contact sheet from recorded frames.
import sys, glob
from PIL import Image
d = sys.argv[1]; out = sys.argv[2]
fs = sorted(glob.glob(d + '/f*.png'))
ims = [Image.open(f).convert('RGB') for f in fs]
w, h = ims[0].size; sw, sh = w // 2, h // 2
sheet = Image.new('RGB', (sw * 3, sh * 4))
for i, im in enumerate(ims[:12]):
    sheet.paste(im.resize((sw, sh)), ((i % 3) * sw, (i // 3) * sh))
sheet.save(out)
