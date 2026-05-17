import json, urllib.request

# Check Render versions
r = urllib.request.urlopen('https://pdf-converter-v2.onrender.com/debug', timeout=15)
d = json.loads(r.read())
for k, v in d.items():
    print(f'Render {k}: {v}')

print()

# Check local versions
import pdf2docx as p2d
import fitz
import PIL
import os, platform
print(f'Local platform: {platform.platform()}')
print(f'Local pdf2docx: {p2d.__version__ if hasattr(p2d, "__version__") else "no __version__"}')
print(f'Local PyMuPDF: {fitz.version}')
print(f'Local Pillow: {PIL.__version__}')
