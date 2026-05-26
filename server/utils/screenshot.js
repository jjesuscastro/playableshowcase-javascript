const puppeteer = require('puppeteer');
const fs = require('fs');

const FINAL_SETTLE_MS = 800;
const CANDIDATE_DELAYS_MS = [0, 500, 500];
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBrowserExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  return EDGE_PATHS.find(p => fs.existsSync(p));
}

async function captureScreenshot(url, width = 390, height = 844) {
  const executablePath = getBrowserExecutablePath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    page.on('console', msg => console.log(`[screenshot:${msg.type()}] ${msg.text()}`));

    // Unity clears WebGL buffers by default, so force readable buffers before
    // page scripts create their contexts.
    await page.evaluateOnNewDocument(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true });
        }
        return orig.call(this, type, attrs);
      };
    });

    console.log(`[screenshot] loading ${url}`);
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });

    try {
      await page.waitForFunction(() => {
        const canvases = Array.from(document.querySelectorAll('canvas'))
          .filter(c => c.width > 0 && c.height > 0);
        return canvases.some(c => {
          try {
            const d = c.toDataURL('image/png');
            return (d.split(',')[1] || '').length > 2000;
          } catch {
            return false;
          }
        });
      }, { timeout: 20000, polling: 500 });
      console.log('[screenshot] canvas pixels detected');
    } catch (err) {
      console.log(`[screenshot] canvas readiness timed out: ${err.message}`);
    }

    // HTML overlays and Unity's first fully composited frame can lag behind
    // canvas readiness, so capture a short burst and keep the richest PNG.
    await wait(FINAL_SETTLE_MS);
    let bestBuffer = null;
    for (const delay of CANDIDATE_DELAYS_MS) {
      if (delay) await wait(delay);
      const buffer = await page.screenshot({ type: 'png' });
      if (!bestBuffer || buffer.length > bestBuffer.length) bestBuffer = buffer;
    }

    console.log(`[screenshot] selected ${bestBuffer.length} bytes`);
    return bestBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { captureScreenshot };
