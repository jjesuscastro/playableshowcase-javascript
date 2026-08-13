const fs = require('fs');

const FINAL_SETTLE_MS = 800;
const BURST_DELAYS_MS = [0, 500, 500];
const CANDIDATE_GAPS_MS = [2000, 2000]; // delays between candidates: T+0, T+2s, T+4s
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getPuppeteer() {
  return require('puppeteer-core');
}

function getBrowserExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  return EDGE_PATHS.find(p => fs.existsSync(p));
}

function getLaunchArgs() {
  const executablePath = getBrowserExecutablePath();
  if (!executablePath) {
    throw new Error('No browser executable found. Set PUPPETEER_EXECUTABLE_PATH to Chrome or Edge.');
  }

  return {
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  };
}

async function withPage(url, width, height, fn) {
  const puppeteer = getPuppeteer();
  const browser = await puppeteer.launch(getLaunchArgs());
  try {
    const page = await browser.newPage();
    // isMobile ensures the CSS viewport meta tag is respected the same way a
    // mobile browser would, so playables that size themselves via vw/vh or
    // window.innerWidth match what the device frame shows.
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
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

    // Hide scrollbars and fire resize so JS-based layout callbacks re-run
    // with the correct viewport dimensions.
    await page.evaluate(() => {
      document.documentElement.style.overflow = 'hidden';
      if (document.body) document.body.style.overflow = 'hidden';
      window.dispatchEvent(new Event('resize'));
    });

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

    await wait(FINAL_SETTLE_MS);
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function captureScreenshot(url, width = 390, height = 844) {
  return withPage(url, width, height, async (page) => {
    let bestBuffer = null;
    for (const delay of BURST_DELAYS_MS) {
      if (delay) await wait(delay);
      const buffer = await page.screenshot({ type: 'png' });
      if (!bestBuffer || buffer.length > bestBuffer.length) bestBuffer = buffer;
    }
    console.log(`[screenshot] selected ${bestBuffer.length} bytes`);
    return bestBuffer;
  });
}

async function captureScreenshotCandidates(url, width = 390, height = 844) {
  return withPage(url, width, height, async (page) => {
    const buffers = [];
    buffers.push(await page.screenshot({ type: 'png' }));
    for (const gap of CANDIDATE_GAPS_MS) {
      await wait(gap);
      buffers.push(await page.screenshot({ type: 'png' }));
    }
    console.log(`[screenshot] captured ${buffers.length} candidates`);
    return buffers;
  });
}

module.exports = { captureScreenshot, captureScreenshotCandidates };
