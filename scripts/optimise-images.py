"""Regenerate responsive JPEG assets from local JPEG sources; requires Pillow."""
from pathlib import Path
from PIL import Image, ImageOps
import json

root = Path(__file__).resolve().parent.parent
output = root / 'public/images'
output.mkdir(parents=True, exist_ok=True)
manifest = {}
for source in sorted((root / 'assets/source').glob('*.jpg')):
    image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    widths = sorted({min(320, image.width), min(640, image.width), image.width})
    for width in widths:
        resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        resized.save(output / f'{source.stem}-{width}.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
    manifest[source.stem] = {'width': image.width, 'height': image.height, 'widths': widths}
(root / 'assets/images.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Generated responsive images. If dimensions changed, update HTML srcset and width/height attributes.')
