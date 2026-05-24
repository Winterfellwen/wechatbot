const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const https = require('https');

// External PDF service - keep Render for heavy processing until cloud container is ready
const PDF_SERVICE = process.env.PDF_SERVICE_URL || 'https://wechatbot-pdf-service.onrender.com';

function httpRequest(url, method, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = { method, hostname: parsed.hostname, path: parsed.pathname + parsed.search, timeout: 50000, headers: { 'Content-Type': 'application/json' } };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ statusCode: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(50000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'upload': {
      // Note: file uploads go through cloud.uploadFile on client side directly.
      // This action is for recording file metadata after upload.
      const { fileID, fileName, fileType } = event;
      if (!fileID) return { success: false, error: 'fileID required' };
      // Store file record
      const db = cloud.database();
      await db.collection('files').add({
        data: { fileID, fileName: fileName || 'unknown', fileType: fileType || 'unknown', createdAt: new Date() }
      });
      return { success: true, fileID };
    }

    case 'convert': {
      // Download file from cloud storage, send to PDF service, return jobId
      const { fileID, from, to } = event;
      if (!fileID || !from || !to) return { success: false, error: 'fileID, from, to required' };

      const downloadResult = await cloud.downloadFile({ fileID });
      const fileBuffer = downloadResult.fileContent;

      // Convert to base64 for transfer
      const base64 = fileBuffer.toString('base64');

      // Call PDF service with file content
      const result = await httpRequest(PDF_SERVICE + '/api/pdf/convert', 'POST', {
        file: base64,
        fileName: event.fileName || 'document',
        from,
        to
      });

      if (result.statusCode === 200 && result.data && result.data.jobId) {
        return { success: true, jobId: result.data.jobId };
      }
      return { success: false, error: result.data.error || 'conversion failed' };
    }

    case 'status': {
      const { jobId } = event;
      if (!jobId) return { success: false, error: 'jobId required' };
      const result = await httpRequest(PDF_SERVICE + '/api/pdf/status?jobId=' + jobId, 'GET');
      return { success: true, ...result.data };
    }

    case 'download': {
      const { jobId } = event;
      if (!jobId) return { success: false, error: 'jobId required' };
      const result = await httpRequest(PDF_SERVICE + '/api/pdf/download?jobId=' + jobId, 'GET');
      if (result.statusCode === 200 && result.data && result.data.file) {
        // Upload result to cloud storage
        const uploadResult = await cloud.uploadFile({
          cloudPath: 'pdf-results/' + jobId + '/' + (result.data.fileName || 'result'),
          fileContent: Buffer.from(result.data.file, 'base64')
        });
        return { success: true, fileID: uploadResult.fileID, fileName: result.data.fileName || 'result' };
      }
      return { success: false, error: 'download failed' };
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};