"""
Subprocess worker — direct pdf2docx for PDF→DOCX, LibreOffice for DOCX→PDF.
Memory is fully reclaimed when this process exits.
"""
import os, sys, shutil, gc, subprocess, uuid, time, zipfile
import struct, io, zlib
from pathlib import Path

UPLOAD_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-service"

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


def pdf_to_docx(in_path: Path, out_path: Path):
    from pdf2docx import Converter
    print(f"[worker] pdf2docx: {in_path.name} ({in_path.stat().st_size//1024}KB)", flush=True)
    cv = Converter(str(in_path))
    cv.convert(str(out_path))
    cv.close(); gc.collect()
    repair_docx(out_path)
    print(f"[worker] done: {out_path.name} ({out_path.stat().st_size//1024}KB)", flush=True)


def kill_lo():
    try:
        subprocess.run(["pkill","-f","libreoffice"],capture_output=True,timeout=10)
        subprocess.run(["pkill","-f","soffice.bin"],capture_output=True,timeout=10)
    except: pass

def docx_to_pdf(in_path: Path, out_path: Path):
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
        print(f"[worker] start {from_fmt}→{to_fmt} input={in_path.name} size={in_path.stat().st_size//1024}KB",flush=True)
        if from_fmt=="pdf" and to_fmt=="docx": pdf_to_docx(in_path, out_path)
        elif from_fmt=="docx" and to_fmt=="pdf": docx_to_pdf(in_path, out_path)
        else: print(f"Unsupported: {from_fmt}→{to_fmt}",file=sys.stderr); sys.exit(1)
        print(f"[worker] done in {time.time()-t0:.1f}s output={out_path.name} size={out_path.stat().st_size}",flush=True)
        sys.exit(0)
    except Exception as e:
        print(f"[worker] error: {e}",file=sys.stderr,flush=True); sys.exit(1)

if __name__=="__main__": main()
