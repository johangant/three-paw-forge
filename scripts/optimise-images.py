"""Generate responsive JPEG/WebP images; requires Pillow and heif-convert for HEIC."""
from pathlib import Path
from PIL import Image, ImageOps
import json
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
output = root / 'public/images'
output.mkdir(parents=True, exist_ok=True)
manifest = {}
sources = sorted(source for source in (root / 'assets/source').iterdir()
                 if source.suffix.lower() in {'.jpg', '.jpeg', '.heic', '.heif'})
with tempfile.TemporaryDirectory(prefix='three-paw-images-') as temporary:
    for source in sources:
        decoded = source
        if source.suffix.lower() in {'.heic', '.heif'}:
            converter = shutil.which('heif-convert')
            if not converter:
                raise SystemExit('HEIC photos require heif-convert (libheif tools). Originals are unchanged.')
            decoded = Path(temporary) / f'{source.stem}.png'
            subprocess.run([converter, '--quiet', str(source), str(decoded)], check=True)
        with Image.open(decoded) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
        # Cap published images; retain full-resolution originals outside public/.
        widths = sorted({min(width, image.width) for width in (320, 640, 1280, 1600)})
        for width in widths:
            resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            resized.save(output / f'{source.stem}-{width}.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
            resized.save(output / f'{source.stem}-{width}.webp', 'WEBP', quality=80, method=6)
        manifest[source.stem] = {'width': image.width, 'height': image.height, 'widths': widths}
(root / 'assets/images.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Generated responsive JPEG/WebP images from {len(sources)} originals (maximum width 1600px, metadata removed).')
