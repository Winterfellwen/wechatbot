"""
Subprocess worker — chunked PDF→DOCX with proper image-preserving merge.
For small files: direct pdf2docx.
For large files: fitz-split → pdf2docx per chunk → ZIP-level merge (preserves images).
"""
import os, sys, shutil, gc, subprocess, uuid, time, zipfile, math, tempfile
import struct, io, zlib
from pathlib import Path
from lxml import etree

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'

UPLOAD_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-service"
CHUNK_MAX_PAGES = int(os.environ.get("CHUNK_MAX_PAGES", "15"))
CHUNK_MAX_SIZE = int(os.environ.get("CHUNK_MAX_SIZE", "15"))  # MB

def find_libreoffice() -> str | None:
    env = os.environ.get("LIBREOFFICE_PATH")
    if env and os.path.isfile(env): return env
    for c in ["/usr/bin/libreoffice","/usr/bin/soffice","/usr/local/bin/libreoffice",
              "/usr/local/bin/soffice","/snap/bin/libreoffice"]:
        if os.path.isfile(c): return c
    for b in ("libreoffice","soffice"):
        try:
            r = subprocess.run(["which",b],capture_output=True,text=True,timeout=5)
            if r.returncode==0 and r.stdout.strip(): return r.stdout.strip()
        except: pass
    return None


def repair_docx(path: Path):
    raw = path.read_bytes()
    out_buf = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(raw),'r') as zin:
        with zipfile.ZipFile(out_buf,'w',zipfile.ZIP_DEFLATED) as zout:
            for info in zin.infolist():
                name = info.filename
                try:
                    data = zin.read(name)
                except zipfile.BadZipFile:
                    b2 = io.BytesIO(raw); b2.seek(info.header_offset)
                    hdr = b2.read(30)
                    cm = struct.unpack('<H',hdr[8:10])[0]
                    cs = struct.unpack('<I',hdr[18:22])[0]
                    nl = struct.unpack('<H',hdr[26:28])[0]
                    el = struct.unpack('<H',hdr[28:30])[0]
                    if cs==0 or cs==0xFFFFFFFF: cs=info.compress_size
                    b2.seek(info.header_offset+30+nl+el)
                    compressed = b2.read(cs)
                    if cm==0: data=compressed
                    elif cm==8: data=zlib.decompress(compressed,-zlib.MAX_WBITS)
                    else: raise ValueError(f"Unknown compression {cm} in {name}")
                    info.CRC = zlib.crc32(data)&0xFFFFFFFF
                zout.writestr(info,data)
    path.write_bytes(out_buf.getvalue())


# ========== ZIP-level DOCX merge (preserves images) ==========

def _next_rId(existing):
    n = 1
    while True:
        c = f'rId{n}'
        if c not in existing:
            return c
        n += 1

def _next_media_num(existing):
    max_n = 0
    import re
    for name in existing:
        m = re.match(r'image(\d+)\.', name)
        if m:
            max_n = max(max_n, int(m.group(1)))
    return max_n + 1

def merge_docx(chunk_paths, output_path):
    """Merge DOCX chunks preserving images via ZIP-level manipulation."""
    if len(chunk_paths) == 1:
        shutil.copy2(str(chunk_paths[0]), str(output_path))
        return

    work = Path(tempfile.mkdtemp())
    try:
        # Extract first chunk as base
        base = work / 'base'
        base.mkdir()
        with zipfile.ZipFile(str(chunk_paths[0]), 'r') as z:
            z.extractall(str(base))

        # Parse base body
        base_doc = etree.parse(str(base / 'word' / 'document.xml'))
        base_body = base_doc.find(f'{{{W}}}body')
        for sp in base_body.findall(f'{{{W}}}sectPr'):
            base_body.remove(sp)

        # Parse base rels
        base_rels = etree.parse(str(base / 'word' / '_rels' / 'document.xml.rels'))
        rels_root = base_rels.getroot()

        # Track existing rIds and media files
        existing_rIds = set(rel.get('Id') for rel in rels_root)
        media_dir = base / 'word' / 'media'
        media_dir.mkdir(exist_ok=True)
        existing_media = set(f.name for f in media_dir.iterdir()) if media_dir.exists() else set()

        # Parse content types
        ct_doc = etree.parse(str(base / '[Content_Types].xml'))
        ct_root = ct_doc.getroot()
        registered_exts = set(ov.get('Extension') for ov in ct_root.findall(f'{{{CT}}}Default'))
        registered_overrides = set(ov.get('PartName') for ov in ct_root.findall(f'{{{CT}}}Override'))

        for cp in chunk_paths[1:]:
            with zipfile.ZipFile(str(cp), 'r') as z:
                # Parse chunk body
                chunk_doc = etree.fromstring(z.read('word/document.xml'))
                chunk_body = chunk_doc.find(f'{{{W}}}body')
                for sp in chunk_body.findall(f'{{{W}}}sectPr'):
                    chunk_body.remove(sp)

                # Parse chunk rels
                chunk_rels_xml = z.read('word/_rels/document.xml.rels')
                chunk_rels = etree.fromstring(chunk_rels_xml)

                rId_map = {}
                for rel in chunk_rels:
                    old_id = rel.get('Id')
                    target = rel.get('Target', '')
                    rtype = rel.get('Type', '')

                    if not target.startswith('media/'):
                        # Non-media target: keep old rId if unique, else remap
                        if old_id not in existing_rIds:
                            rId_map[old_id] = old_id
                            existing_rIds.add(old_id)
                            # Add rel to base
                            rels_root.append(rel)
                        else:
                            new_id = _next_rId(existing_rIds)
                            rId_map[old_id] = new_id
                            existing_rIds.add(new_id)
                            rel.set('Id', new_id)
                            rels_root.append(rel)
                        continue

                    # Media file — copy to base
                    media_name = target.split('/')[-1]
                    ext = media_name.rsplit('.', 1)[-1] if '.' in media_name else 'png'

                    new_num = _next_media_num(existing_media)
                    new_media_name = f'image{new_num}.{ext}'

                    media_data = z.read(f'word/{target}')
                    (media_dir / new_media_name).write_bytes(media_data)
                    existing_media.add(new_media_name)

                    # Register content type if new extension
                    if ext not in registered_exts:
                        ext_node = etree.SubElement(ct_root, f'{{{CT}}}Default')
                        ext_node.set('Extension', ext)
                        ext_node.set('ContentType', f'image/{ext}')
                        registered_exts.add(ext)

                    new_id = _next_rId(existing_rIds)
                    existing_rIds.add(new_id)
                    rId_map[old_id] = new_id

                    # Update and add relationship
                    rel.set('Id', new_id)
                    rel.set('Target', f'media/{new_media_name}')
                    rels_root.append(rel)

                # Update body element references
                body_str = etree.tostring(chunk_body).decode()
                for old_id, new_id in rId_map.items():
                    body_str = body_str.replace(f'"{old_id}"', f'"{new_id}"')
                    body_str = body_str.replace(f'"#{old_id}"', f'"#{new_id}"')
                    body_str = body_str.replace(f'r:embed="{old_id}"', f'r:embed="{new_id}"')
                    body_str = body_str.replace(f'r:link="{old_id}"', f'r:link="{new_id}"')

                # Append to base body
                new_body = etree.fromstring(body_str.encode())
                for child in list(new_body):
                    base_body.append(child)

        # Write back
        base_doc.write(str(base / 'word' / 'document.xml'),
                       xml_declaration=True, encoding='UTF-8', standalone=True)
        base_rels.write(str(base / 'word' / '_rels' / 'document.xml.rels'),
                        xml_declaration=True, encoding='UTF-8', standalone=True)
        ct_doc.write(str(base / '[Content_Types].xml'),
                     xml_declaration=True, encoding='UTF-8', standalone=True)

        # Repack as ZIP
        with zipfile.ZipFile(str(output_path), 'w', zipfile.ZIP_DEFLATED) as zout:
            for root, dirs, files in os.walk(str(base)):
                for fname in files:
                    fpath = Path(root) / fname
                    arcname = str(fpath.relative_to(base))
                    zout.write(str(fpath), arcname)

    finally:
        shutil.rmtree(work, ignore_errors=True)


# ========== PDF→DOCX (direct or chunked) ==========
def pdf_to_docx(input_path, output_path):
    import fitz
    from pdf2docx import Converter

    pdf = fitz.open(str(input_path))
    num_pages = len(pdf)
    file_mb = input_path.stat().st_size / (1024 * 1024)
    print(f"[worker] PDF: {num_pages}p {file_mb:.1f}MB", flush=True)

    est_mb_pp = max(file_mb / max(num_pages, 1), 0.1)
    ppc = max(1, min(CHUNK_MAX_PAGES, int(CHUNK_MAX_SIZE / est_mb_pp)))
    num_chunks = math.ceil(num_pages / ppc)
    pdf.close(); gc.collect()

    if num_chunks <= 1:
        print(f"[worker] Direct convert...", flush=True)
        cv = Converter(str(input_path))
        cv.convert(str(output_path))
        cv.close(); gc.collect()
        repair_docx(output_path)
        print(f"[worker] Done: {output_path.name}", flush=True)
        return

    print(f"[worker] Splitting into {num_chunks} chunks (~{ppc}p each)", flush=True)
    chunk_pdfs, chunk_docxs = [], []
    try:
        for ci in range(num_chunks):
            sp = ci * ppc; ep = min(sp + ppc, num_pages)
            cp = UPLOAD_DIR / f"{input_path.stem}_c{ci}.pdf"
            cd = UPLOAD_DIR / f"{input_path.stem}_c{ci}.docx"
            chunk_pdfs.append(cp); chunk_docxs.append(cd)

            src = fitz.open(str(input_path))
            dst = fitz.open()
            dst.insert_pdf(src, from_page=sp, to_page=ep-1)
            dst.save(str(cp), garbage=4, deflate=True)
            dst.close(); src.close(); gc.collect()
            print(f"[worker]  Chunk {ci+1}: p{sp+1}-{ep} -> {cp.name}", flush=True)

            cv = Converter(str(cp))
            cv.convert(str(cd))
            cv.close(); gc.collect()
            print(f"[worker]  Chunk DOCX: {cd.name} ({cd.stat().st_size//1024}KB)", flush=True)

        print(f"[worker] Merging {num_chunks} DOCX with image preservation...", flush=True)
        merge_docx(chunk_docxs, output_path)
        print(f"[worker] Merged: {output_path.name}", flush=True)
    finally:
        for f in chunk_pdfs: safe_unlink(f)
        for f in chunk_docxs: safe_unlink(f)


def safe_unlink(p: Path):
    try:
        if p.exists(): p.unlink(missing_ok=True)
    except: pass


# ========== DOCX→PDF (LibreOffice) ==========
def kill_lo():
    try:
        subprocess.run(["pkill","-f","libreoffice"],capture_output=True,timeout=10)
        subprocess.run(["pkill","-f","soffice.bin"],capture_output=True,timeout=10)
    except: pass

def docx_to_pdf(in_path, out_path):
    lo = find_libreoffice()
    if not lo: raise RuntimeError("LibreOffice not found")
    tag = uuid.uuid4().hex[:8]
    home = UPLOAD_DIR/f"lo_home_{tag}"; home.mkdir(parents=True,exist_ok=True)
    tmp = UPLOAD_DIR/f"lo_out_{tag}"; tmp.mkdir(exist_ok=True)
    try:
        env = os.environ.copy()
        for k in ("SAL_USE_VCLPLUGIN",): env.pop(k,None)
        env["HOME"]=str(home); env["SAL_DISABLE_OPENGL_CHECK"]="1"
        env["SAL_VIDEO_DISABLE_ACCELERATE"]="1"; env["LIBREOFFICE_MEMORY_MULTIPLIER"]="0.3"
        cmd=[lo,f"-env:UserInstallation=file://{home}","--headless","--norestore",
             "--nofirststartwizard","--convert-to","pdf:writer_pdf_Export","--outdir",str(tmp),str(in_path)]
        kill_lo()
        r=subprocess.run(cmd,capture_output=True,text=True,timeout=300,env=env)
        if r.returncode!=0:
            kill_lo(); r=subprocess.run(cmd,capture_output=True,text=True,timeout=300,env=env)
        pfs=list(tmp.glob("*.pdf"))
        if not pfs: raise RuntimeError(f"LO no PDF. stderr: {(r.stderr or '')[:1000]}")
        if pfs[0].stat().st_size==0: raise RuntimeError("LO empty PDF")
        shutil.copy2(pfs[0], out_path)
    finally:
        shutil.rmtree(tmp,ignore_errors=True); shutil.rmtree(home,ignore_errors=True); kill_lo(); gc.collect()


def main():
    if len(sys.argv)!=5:
        print("Usage: converter_worker.py <input_path> <output_path> <from> <to>",file=sys.stderr); sys.exit(1)
    in_path=Path(sys.argv[1]); out_path=Path(sys.argv[2]); from_fmt=sys.argv[3]; to_fmt=sys.argv[4]
    if not in_path.exists(): print(f"Input not found: {in_path}",file=sys.stderr); sys.exit(1)
    try:
        t0=time.time()
        s = in_path.stat().st_size
        print(f"[worker] start {from_fmt}->{to_fmt} {in_path.name} {s//1024}KB",flush=True)
        if from_fmt=="pdf" and to_fmt=="docx": pdf_to_docx(in_path, out_path)
        elif from_fmt=="docx" and to_fmt=="pdf": docx_to_pdf(in_path, out_path)
        else: print(f"Unsupported: {from_fmt}->{to_fmt}",file=sys.stderr); sys.exit(1)
        print(f"[worker] done in {time.time()-t0:.1f}s out={out_path.name} sz={out_path.stat().st_size}",flush=True)
        sys.exit(0)
    except Exception as e:
        print(f"[worker] error: {e}",file=sys.stderr,flush=True); sys.exit(1)

if __name__=="__main__": main()
