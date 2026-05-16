const fs = require('fs');

const BASE = 'https://doc-ai-service-zfic.onrender.com';

function createMinimalPdf(text, pageCount) {
  // Build a minimal valid PDF with multiple pages
  let pdf = '%PDF-1.4\n';
  const objects = [];
  const offsets = [];

  function addObj(content) {
    offsets.push(pdf.length);
    const num = objects.length + 1;
    pdf += `${num} 0 obj\n${content}\nendobj\n`;
    objects.push(num);
    return num;
  }

  // Pages content (one stream per page)
  const pageRefs = [];
  for (let i = 0; i < pageCount; i++) {
    const content = `BT /F1 24 Tf 100 700 Td (${text} - Page ${i+1}) Tj ET`;
    const stream = addObj(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageObj = addObj(
      `<< /Type /Page /Parent ${objects[0]+1} 0 R /MediaBox [0 0 612 792] /Contents ${stream} 0 R /Resources << /Font << /F1 2 0 R >> >> >>`
    );
    pageRefs.push(pageObj);
  }

  // Font
  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  // Pages
  const kids = pageRefs.map(r => `${r} 0 R`).join(' ');
  const pagesObj = addObj(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

  // Catalog
  addObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 0; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root ${objects.length} 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += xrefOffset + '\n';
  pdf += '%%EOF';

  return Buffer.from(pdf, 'latin1');
}

async function createTestPdf() {
  const pdfBuf = createMinimalPdf('Hello World Test Document', 2);
  const pdfPath = '/tmp/test-vision.pdf';
  fs.writeFileSync(pdfPath, pdfBuf);
  console.log('PDF created:', pdfBuf.length, 'bytes');
  return pdfPath;
}

async function uploadPdf(filePath) {
  const fileBuf = fs.readFileSync(filePath);
  const blob = new Blob([fileBuf], { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', blob, 'test-vision.pdf');
  form.append('to', 'html');
  form.append('mode', 'raw');

  const url = `${BASE}/convert`;
  console.log('Uploading to', url);

  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json();
  console.log('Upload response:', JSON.stringify(data));
  return data;
}

async function pollJob(jobId) {
  const url = `${BASE}/status/${jobId}`;
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log(`Poll ${i+1}:`, JSON.stringify(data));
      if (data.status === 'done') return data;
      if (data.status === 'error') throw new Error(data.error);
    } catch (e) {
      console.log(`Poll ${i+1} error:`, e.message);
    }
  }
  throw new Error('Timeout waiting for job');
}

(async () => {
  try {
    const pdfPath = await createTestPdf();
    console.log('--- Uploading to doc-ai-service ---');
    const uploadResult = await uploadPdf(pdfPath);

    if (!uploadResult.job_id) {
      console.error('Upload failed:', uploadResult);
      return;
    }

    console.log('\n--- Polling job ---');
    const jobResult = await pollJob(uploadResult.job_id);

    console.log('\n--- Downloading result ---');
    const url = `${BASE}/download/${jobResult.resultFile}`;
    const res = await fetch(url);
    const html = await res.text();
    console.log('=== OUTPUT HTML (first 3000 chars) ===\n');
    console.log(html.substring(0, 3000));
    console.log('\n\n=== END ===');
    fs.writeFileSync('/tmp/test-vision-output.html', html);
    console.log('Full output saved to /tmp/test-vision-output.html');

    console.log('\n--- TEST COMPLETE ---');
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();
