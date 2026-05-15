const fs = require('fs');
const path = require('path');
const config = require('./config');

function createQueue() {
  const jobs = {};
  const _queue = [];
  let _processing = false;

  function _save() {
    try {
      fs.writeFileSync(config.jobsFile, JSON.stringify(jobs));
    } catch (e) {
      console.error('[queue] save failed:', e.message);
    }
  }

  function _load() {
    try {
      if (fs.existsSync(config.jobsFile)) {
        const data = JSON.parse(fs.readFileSync(config.jobsFile, 'utf8'));
        Object.assign(jobs, data);
        console.log(`[queue] loaded ${Object.keys(jobs).length} jobs`);
      }
    } catch (e) {
      console.error('[queue] load failed:', e.message);
    }
  }

  function addJob(jobId, jobData) {
    jobs[jobId] = { ...jobData, status: 'pending', createdAt: Date.now() };
    _save();
    _queue.push(jobId);
    _processNext();
    return jobId;
  }

  function getJob(jobId) {
    return jobs[jobId] || null;
  }

  function updateJob(jobId, updates) {
    if (jobs[jobId]) {
      Object.assign(jobs[jobId], updates);
      _save();
    }
  }

  async function _processNext() {
    if (_processing || _queue.length === 0) return;
    _processing = true;

    const jobId = _queue.shift();
    if (!jobs[jobId]) { _processing = false; _processNext(); return; }

    updateJob(jobId, { status: 'processing' });

    try {
      const { processJob } = require('./index');
      await processJob(jobId);
      updateJob(jobId, { status: 'done' });
    } catch (err) {
      console.error(`[queue] job ${jobId} failed:`, err.message);
      updateJob(jobId, { status: 'error', error: err.message.substring(0, 200) });
    } finally {
      _processing = false;
      _processNext();
    }
  }

  function resumePending() {
    _load();
    const pending = Object.entries(jobs)
      .filter(([, j]) => j.status === 'pending' || j.status === 'processing')
      .map(([id]) => id);
    if (pending.length > 0) {
      console.log(`[queue] re-queueing ${pending.length} pending jobs`);
      pending.forEach(id => {
        if (jobs[id].status === 'processing') {
          updateJob(id, { status: 'pending', error: '服务重启，重新排队' });
        }
        _queue.push(id);
      });
      _processNext();
    }
  }

  _load();

  return { addJob, getJob, updateJob, resumePending };
}

module.exports = { createQueue };
