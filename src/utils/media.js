export function hexRgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
  if (!m) return [255, 255, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(h, a) {
  return (
    '#' +
    hexRgb(h)
      .map((v) => Math.max(0, Math.min(255, Math.round(v + a))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function toBW(src, w, h, dither, autoInv) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, w, h);
  x.drawImage(src, 0, 0, w, h);

  const im = x.getImageData(0, 0, w, h);
  const d = im.data;
  const g = new Float32Array(w * h);
  let sum = 0;

  for (let i = 0; i < w * h; i++) {
    g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    sum += g[i];
  }

  if (autoInv && sum / (w * h) < 110) {
    for (let i = 0; i < g.length; i++) g[i] = 255 - g[i];
  }

  for (let y = 0; y < h; y++) {
    for (let q = 0; q < w; q++) {
      const i = y * w + q;
      const o = g[i];
      const n = o < 128 ? 0 : 255;
      g[i] = n;
      if (dither) {
        const e = o - n;
        if (q + 1 < w) g[i + 1] += (e * 7) / 16;
        if (y + 1 < h) {
          if (q > 0) g[i + w - 1] += (e * 3) / 16;
          g[i + w] += (e * 5) / 16;
          if (q + 1 < w) g[i + w + 1] += e / 16;
        }
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g[i];
    d[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c.toDataURL('image/png');
}

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file'));
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = r.result;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function processSquareAvatar(file, size = 240, quality = 0.8) {
  const im = await readImageFile(file);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const m = Math.min(im.width, im.height);
  c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, size, size);
  return c.toDataURL('image/jpeg', quality);
}

export async function processLogoUpload(file) {
  const im = await readImageFile(file);
  const m = Math.min(im.width, im.height);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 256, 256);
  return {
    logo: c.toDataURL('image/jpeg', 0.85),
    logoBw: toBW(c, 200, 200, false, true),
  };
}

export async function processNotaImage(file) {
  const im = await readImageFile(file);
  let w = 384;
  let h = Math.round((im.height * w) / im.width);
  if (h > 420) {
    h = 420;
    w = Math.round((im.width * h) / im.height);
  }
  return toBW(im, w, h, true, false);
}

export function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const a = new AudioCtx();
    const o = a.createOscillator();
    const g = a.createGain();
    o.connect(g);
    g.connect(a.destination);
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.start();
    setTimeout(() => {
      o.frequency.value = 660;
    }, 180);
    setTimeout(() => {
      o.stop();
      a.close();
    }, 420);
  } catch {
    // Abaikan jika browser memblokir autoplay audio sebelum interaksi
  }
}