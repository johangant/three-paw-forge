"""Generate responsive JPEG/WebP images; requires Pillow and heif-convert for HEIC."""
from pathlib import Path
from PIL import Image, ImageOps
import json
import argparse
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
output = root / 'public/images'
output.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--group', choices=['all', 'work', 'patch'], default='all', help='Regenerate one organised source group, or all images.')
args = parser.parse_args()
manifest_path = root / 'assets/images.json'
manifest = json.loads(manifest_path.read_text()) if args.group != 'all' and manifest_path.exists() else {}
if args.group == 'work':
    manifest = {key: value for key, value in manifest.items() if not key.startswith('work/')}
source_root = root / 'assets/source'
scan_root = source_root if args.group == 'all' else source_root / args.group
sources = sorted(source for source in scan_root.rglob('*')
                 if source.suffix.lower() in {'.jpg', '.jpeg', '.heic', '.heif'})
with tempfile.TemporaryDirectory(prefix='three-paw-images-') as temporary:
    for source in sources:
        relative = source.relative_to(source_root)
        # Work gets a namespaced URL to prevent identical camera filenames in
        # different project folders colliding. Keep existing Patch URLs stable.
        key = relative.with_suffix('').as_posix() if relative.parts[0] == 'work' else source.stem
        destination = output / key
        destination.parent.mkdir(parents=True, exist_ok=True)
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
            resized.save(destination.with_name(f'{destination.name}-{width}.jpg'), 'JPEG', quality=82, optimize=True, progressive=True)
            resized.save(destination.with_name(f'{destination.name}-{width}.webp'), 'WEBP', quality=80, method=6)
        manifest[key] = {'width': image.width, 'height': image.height, 'widths': widths}
(root / 'assets/images.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Generated responsive JPEG/WebP images from {len(sources)} originals (maximum width 1600px, metadata removed).')
