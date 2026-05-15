const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const GIFEncoder = require('gif.js').GIFEncoder;

const SIZE = 80;
const OUT = path.join(__dirname, '..', 'images');

fs.mkdirSync(OUT, { recursive: true });

function success() {
  const c = createCanvas(SIZE, SIZE);
  const ctx = c.getContext('2d');
  ctx.beginPath();
  ctx.arc(40, 40, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, 42);
  ctx.lineTo(35, 54);
  ctx.lineTo(58, 28);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  fs.writeFileSync(path.join(OUT, 'success.png'), c.toBuffer());
}

function error() {
  const c = createCanvas(SIZE, SIZE);
  const ctx = c.getContext('2d');
  ctx.beginPath();
  ctx.arc(40, 40, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(26, 26);
  ctx.lineTo(54, 54);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(54, 26);
  ctx.lineTo(26, 54);
  ctx.stroke();
  fs.writeFileSync(path.join(OUT, 'error.png'), c.toBuffer());
}

function loading() {
  const frames = 12;
  const enc = new GIFEncoder(SIZE, SIZE);
  enc.setRepeat(0);
  enc.setDelay(80);

  for (let i = 0; i < frames; i++) {
    const c = createCanvas(SIZE, SIZE);
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.arc(40, 40, 30, 0, Math.PI * 2);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 5;
    ctx.stroke();
    const startAngle = -Math.PI / 2 + (i / frames) * Math.PI * 2;
    const endAngle = startAngle + Math.PI * 1.5;
    ctx.beginPath();
    ctx.arc(40, 40, 30, startAngle, endAngle);
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
    enc.addFrame(ctx.getImageData(0, 0, SIZE, SIZE).data);
  }

  enc.finish();
  const buf = Buffer.from(enc.stream().getData(), 'binary');
  fs.writeFileSync(path.join(OUT, 'loading.gif'), buf);
}

success();
error();
loading();
console.log('Generated: success.png, error.png, loading.gif');
