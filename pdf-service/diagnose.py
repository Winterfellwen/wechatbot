import json, os, sys

# --- Check deploys ---
with open(os.environ['TEMP'] + '/deploys_last3.json', encoding='utf-8-sig') as f:
    deploys = json.load(f)
print('=== Recent Deploys ===')
for x in deploys:
    d = x['deploy']
    print(f"  {d['status']:15} {d['commit']['message'][:60]}")
    if d.get('error'):
        print(f"  ERROR: {d['error']}")

# --- Check Render versions ---
import urllib.request
print('\n=== Render Environment ===')
try:
    r = urllib.request.urlopen('https://pdf-converter-v2.onrender.com/debug', timeout=15)
    info = json.loads(r.read())
    for k, v in info.items():
        print(f'  {k}: {v}')
except Exception as e:
    print(f'  ERROR: {e}')

print('\n=== Local Environment ===')
import pdf2docx as p2d
import fitz
import PIL
import platform
import subprocess
print(f'  Platform: {platform.platform()}')
print(f'  pdf2docx: {p2d.__version__ if hasattr(p2d, "__version__") else "no __version__"}')
print(f'  PyMuPDF: {fitz.version}')
print(f'  Pillow: {PIL.__version__}')

# Check LibreOffice locally
try:
    r = subprocess.run(['where', 'soffice'], capture_output=True, text=True, timeout=5)
    if r.returncode == 0:
        print(f'  LibreOffice: {r.stdout.strip()}')
    else:
        print('  LibreOffice: not in PATH')
except:
    print('  LibreOffice: check failed')
