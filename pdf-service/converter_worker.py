"""
Subprocess worker — chunked PDF→DOCX with memory isolation.
Chunks are small enough to keep pdf2docx memory under control.
Blank-page-free merge: strips per-chunk section breaks (w:sectPr).
"""
import os, sys, shutil, gc, subprocess, uuid, time, zipfile
import struct, io, zlib, math
from pathlib import Path

UPLOAD_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-service"
CHUNK_MAX_PAGES = int(os.environ.get("CHUNK_MAX_PAGES", "15"))
CHUNK_MAX_SIZE = int(os.environ.get("CHUNK_MAX_SIZE", "15"))

def safe_unlink(p: Path):
    try:
        if p.exists(): p.unlink(missing_ok=True)
    except Exception: pass

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


# ========== DOCX repair (from master) ==========
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


# ========== DOCX merge (section-break-aware) ==========
def _remove_sectpr(body):
    """Remove all w:sectPr elements from an lxml body element."""
    from docx.oxml.ns import qn
    for sp in body.findall(qn('w:sectPr')):
        body.remove(sp)

def merge_docx(chunk_paths, output_path):
    from docx import Document
    from docx.oxml.ns import qn
    merged = Document()
    # Remove default empty paragraph
    if merged.paragraphs:
        merged.paragraphs[0]._element.getparent().remove(merged.paragraphs[0]._element)
    for i, cp in enumerate(chunk_paths):
        print(f"[worker]  Merge chunk {i+1}/{len(chunk_paths)}: {cp.name}", flush=True)
        chunk = Document(str(cp))
        body = chunk.element.body
        # Strip sectPr from chunk to prevent blank pages between chunks
        _remove_sectpr(body)
        for element in list(body):
            merged.element.body.append(element)
        chunk = None; gc.collect()
    merged.save(str(output_path))
    merged = None; gc.collect()
    print(f"[worker]  Merged: {output_path.name} size={output_path.stat().st_size}", flush=True)


# ========== PDF→DOCX (chunked, low memory per chunk) ==========
def pdf_to_docx(input_path, output_path):
    import fitz
    from pdf2docx import Converter
    pdf = fitz.open(str(input_path))
    num_pages = len(pdf)
    file_mb = input_path.stat().st_size / (1024 * 1024)
    print(f"[worker] PDF: {num_pages} pages, {file_mb:.1f}MB", flush=True)
    est_mb_pp = max(file_mb / max(num_pages, 1), 0.1)
    ppc = max(1, min(CHUNK_MAX_PAGES, int(CHUNK_MAX_SIZE / est_mb_pp)))
    num_chunks = math.ceil(num_pages / ppc)
    print(f"[worker] {num_chunks} chunk(s) of ~{ppc} pages", flush=True)
    pdf.close(); pdf = None; gc.collect()
    if num_chunks <= 1:
        cv = Converter(str(input_path))
        cv.convert(str(output_path))
        cv.close(); gc.collect()
        repair_docx(output_path)
        print(f"[worker] Done direct: {output_path.name}", flush=True)
        return
    chunk_files = []
    try:
        for ci in range(num_chunks):
            sp = ci * ppc; ep = min(sp + ppc, num_pages)
            cp = UPLOAD_DIR / f"{input_path.stem}_c{ci}.pdf"
            cd = UPLOAD_DIR / f"{input_path.stem}_c{ci}.docx"
            src = fitz.open(str(input_path))
            dst = fitz.open()
            dst.insert_pdf(src, from_page=sp, to_page=ep-1)
            dst.save(str(cp), garbage=4, deflate=True)
            dst.close(); src.close(); gc.collect()
            print(f"[worker] Chunk {ci+1}: p{sp+1}-{ep} → {cp.name} ({cp.stat().st_size//1024}KB)", flush=True)
            cv = Converter(str(cp))
            cv.convert(str(cd))
            cv.close(); gc.collect()
            print(f"[worker]  Chunk DOCX: {cd.name} ({cd.stat().st_size//1024}KB)", flush=True)
            chunk_files.append(cd)
        merge_docx(chunk_files, output_path)
    finally:
        for f in chunk_files: safe_unlink(f)
        for f in UPLOAD_DIR.glob(f"{input_path.stem}_c*.pdf"): safe_unlink(f)


# ========== DOCX→PDF (LibreOffice subprocess) ==========
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


# ========== MAIN ==========
def main():
    if len(sys.argv)!=5:
        print("Usage: converter_worker.py <input_path> <output_path> <from> <to>",file=sys.stderr); sys.exit(1)
    in_path=Path(sys.argv[1]); out_path=Path(sys.argv[2]); from_fmt=sys.argv[3]; to_fmt=sys.argv[4]
    if not in_path.exists(): print(f"Input not found: {in_path}",file=sys.stderr); sys.exit(1)
    try:
        t0=time.time()
        print(f"[worker] start {from_fmt}→{to_fmt} input={in_path.name} size={in_path.stat().st_size//1024}KB",flush=True)
        if from_fmt=="pdf" and to_fmt=="docx": pdf_to_docx(in_path, out_path)
        elif from_fmt=="docx" and to_fmt=="pdf": docx_to_pdf(in_path, out_path)
        else: print(f"Unsupported: {from_fmt}→{to_fmt}",file=sys.stderr); sys.exit(1)
        print(f"[worker] done in {time.time()-t0:.1f}s output={out_path.name} size={out_path.stat().st_size}",flush=True)
        sys.exit(0)
    except Exception as e:
        print(f"[worker] error: {e}",file=sys.stderr,flush=True); sys.exit(1)

if __name__=="__main__": main()
