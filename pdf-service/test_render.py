import urllib.request, json, base64, os, time

HOST = 'https://pdf-converter-v2.onrender.com'

def test_convert(file_path, from_fmt, to_fmt):
    print(f'=== {from_fmt} -> {to_fmt} ===')
    with open(file_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    body = json.dumps({
        'file_base64': b64,
        'filename': os.path.basename(file_path),
        'from_fmt': from_fmt,
        'to_fmt': to_fmt
    }).encode()
    req = urllib.request.Request(f'{HOST}/convert', data=body, headers={'Content-Type':'application/json'})
    result = json.loads(urllib.request.urlopen(req, timeout=120).read())
    job_id = result['job_id']
    print(f'Job: {job_id}')

    for _ in range(60):
        time.sleep(3)
        s = json.loads(urllib.request.urlopen(f'{HOST}/status/{job_id}', timeout=30).read())
        if s['status'] == 'done':
            dl = urllib.request.urlopen(f"{HOST}/download/{s['result']}", timeout=60)
            data = dl.read()
            print(f'Result: {len(data)} bytes, header={data[:8]}')
            if to_fmt == 'pdf':
                assert data[:4] == b'%PDF', 'Not PDF!'
            else:
                assert data[:2] == b'PK', 'Not DOCX!'
            print('PASS')
            return data
        elif s['status'] == 'error':
            print(f'FAIL: {s.get("error","?")}')
            return None
        print(f'  Status: {s["status"]}')

    print('TIMEOUT')
    return None

test_convert(r'E:\AI\doc\CorrectDOC.docx', 'docx', 'pdf')
print()
test_convert(r'E:\AI\doc\resume-doc.pdf', 'pdf', 'docx')
print('ALL DONE')
