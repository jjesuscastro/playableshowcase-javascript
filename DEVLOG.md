# Playable Showcase — Dev Log

## Project Overview

Internal tool for uploading, previewing, and organizing HTML playable ads.
Single-file HTML playables are uploaded, stored on disk, and served via Express.
React SPA (Vite) for the frontend. JSON file-based DB (no SQL).

**Stack:** Node.js + Express · React + Vite · React Router DOM · Multer · Puppeteer

---

## Architecture

```
PlayableShowcase/
├── server/
│   ├── index.js          — Express server (port 3000), serves /public and /uploads
│   ├── db.js             — JSON file-based database (ads + apps)
│   ├── routes/
│   │   ├── ads.js        — GET/PATCH /api/ads/:id, POST /api/ads/:id/screenshot
│   │   ├── upload.js     — POST /api/upload (multer, creates ad record)
│   │   └── apps.js       — CRUD /api/apps, GET /api/apps/lookup
│   └── utils/
│       └── screenshot.js — Puppeteer headless screenshot utility
├── client/
│   ├── vite.config.js    — outDir: '../public' (matches Express static path)
│   └── src/
│       ├── App.jsx        — Routes: / (Catalog), /apps, /viewer/:id
│       ├── api.js         — All fetch calls to Express API
│       ├── components/
│       │   ├── AppLayout.jsx/css   — Shared sidebar shell + mobile hamburger
│       │   ├── AdCard.jsx/css      — Catalog grid card (thumbnail + app icon)
│       │   ├── AppModal.jsx        — Create/edit application modal (shared)
│       │   ├── MetadataModal.jsx   — Edit playable metadata in Viewer
│       │   └── UploadPreviewModal.jsx/css — Upload flow modal
│       └── pages/
│           ├── Catalog.jsx/css     — Main grid + sidebar with search/filter
│           ├── Viewer.jsx/css      — Playable preview with device frame
│           └── Apps.jsx/css        — Application management page
├── uploads/              — Uploaded HTML files + thumbnail PNGs
└── public/               — Vite build output (served by Express)
```

---

## Features Implemented

### Catalog (`/`)
- Grid of AdCards with thumbnails, app icon, title, app name
- Sidebar: brand, upload button (hidden file input → UploadPreviewModal), app filter, search
- Search filters by: title, developer, app name, tags
- Apps sorted alphabetically in filter list

### Viewer (`/viewer/:id`)
- Device frame (phone/tablet/desktop) with scale-to-fit
- Rotate frame button
- Manual screenshot button (server-side Puppeteer)
- Auto-screenshot on iframe load if no thumbnail exists
- Sidebar: playable info, app icon + store links, repo@branch, tags, frame controls, edit button
- MetadataModal for editing: title, app, tags, developer, repo, branch, notes, replace HTML file

### Apps (`/apps`)
- List all applications with icon, name, store links
- Create/edit/delete apps
- App Store / Play Store URL auto-fill (lookupApp API)

### Upload Flow
- Upload HTML → UploadPreviewModal opens
- Left: live iframe preview of the playable
- Right: metadata form (title, app, tags, developer, repo, branch, notes)
- "Take Screenshot" button (required before Save) — calls Puppeteer server-side
- "New Application" inline button opens AppModal without leaving the flow
- Screenshot taken via server-side Puppeteer (not client-side canvas capture)

### Mobile
- Sidebar collapses to hamburger menu at ≤680px
- Overlay closes sidebar when tapped
- Upload preview frame uses aspect-ratio: 9/19.5

---

## Key Technical Decisions

### Screenshot: Server-side Puppeteer (not client-side html2canvas)
Client-side approaches (html2canvas, canvas.toDataURL) were tried and failed for various reasons:
- html2canvas can't access iframe CSS from parent window context → HTML overlays invisible
- WebGL `preserveDrawingBuffer: false` → canvas.toDataURL() always returns blank
- Composite-canvas fallback only captures WebGL, misses HTML UI layers

**Decision:** All screenshots go through `POST /api/ads/:id/screenshot` which runs Puppeteer.
Puppeteer captures the GPU-composited output, getting WebGL + HTML overlays correctly.

### Vite Build Output
`vite.config.js` sets `build: { outDir: '../public', emptyOutDir: true }`.
Express serves static files from `./public`. Without this, Vite outputs to `client/dist`
and Express throws `ENOENT: no such file or directory, stat '.../public/index.html'`.

### AdCard Thumbnail Display
`.ad-card__thumb` uses `aspect-ratio: 9 / 19.5` to match the 390×844 Puppeteer output.
`object-fit: cover` fills the container cleanly since both are the same ratio.

### AppModal Shared Component
AppModal was extracted from Apps.jsx into `components/AppModal.jsx` so it can be used
by both Apps.jsx (edit apps) and UploadPreviewModal.jsx (create app inline during upload).
Imports styles from `'../pages/Apps.css'` (note the relative path from components/).

### Sidebar Layout Pattern
All pages use `AppLayout` + consistent CSS class names:
- `.sb-brand` — top brand name
- `.sb-nav` — nav button area
- `.sb-btn` — sidebar button
- `.sb-divider` — horizontal rule
- `.sb-section-label` — uppercase section label
- `.viewer__sb-info` — padded content block inside a section

---

## Outstanding Issues

### 1. White Screenshots — Unity WebGL (UNRESOLVED)

**Symptom:** Clicking "Take Screenshot" on Unity WebGL playables returns a white/blank image.

**Root cause analysis:**
Unity WebGL uses `preserveDrawingBuffer: false` by default.
This means after the GPU compositor reads the WebGL framebuffer to display the frame,
the buffer is cleared. `canvas.toDataURL()` called between frames returns blank.

**Fixes attempted:**
1. `html2canvas` with frozen canvas data — failed (doesn't capture HTML overlays)
2. Canvas composite fallback — failed (same issue)
3. Puppeteer with `networkidle2` + 1500ms wait — failed (Unity initializes after network idle)
4. Puppeteer with `waitForFunction` polling `canvas.toDataURL()` — failed (still blank due to preserveDrawingBuffer)
5. **`evaluateOnNewDocument` monkey-patch to force `preserveDrawingBuffer: true`** — partial
   - Monkey-patches `HTMLCanvasElement.prototype.getContext` before any page scripts run
   - Forces `{ preserveDrawingBuffer: true }` on all webgl/webgl2 contexts
   - Changed `waitUntil: 'networkidle2'` → `'load'` because Unity's fetch requests
     keep the network permanently busy, causing networkidle2 timeout on large files
   - Test script confirmed this works in isolation (saw "PL Island House" 3D screenshot)
   - **But user still reports white screenshots in the actual app**

**Suspected remaining cause:**
The server process was NOT restarted after screenshot.js was changed.
Node.js caches `require()`d modules — the old code runs until the server restarts.
Or: there are additional Unity playables with different initialization patterns.

**What to try next:**
- Restart the server (`Ctrl+C` then `node index.js` or `npm start` in `/server`)
- If still white: add console logging to screenshot.js to see what `waitForFunction` detects
- Consider: `page.waitForFunction` might not see `window.unityInstance` if Unity sets it
  as a local variable (not on window) — check the actual Unity HTML template used
- Nuclear option: after canvas polling resolves, take 3 screenshots 500ms apart and
  keep the largest (most content = most bytes)

**Current screenshot.js logic (server/utils/screenshot.js):**
```js
// 1. Inject monkey-patch BEFORE page scripts run
await page.evaluateOnNewDocument(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
      attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true });
    }
    return orig.call(this, type, attrs);
  };
});

// 2. Navigate (load, not networkidle2)
await page.goto(url, { waitUntil: 'load', timeout: 60000 });

// 3. Poll canvas for non-blank pixels (up to 20s)
await page.waitForFunction(() => {
  const canvases = Array.from(document.querySelectorAll('canvas'))
    .filter(c => c.width > 0 && c.height > 0);
  return canvases.some(c => {
    try {
      const d = c.toDataURL('image/png');
      return (d.split(',')[1] || '').length > 2000;
    } catch { return false; }
  });
}, { timeout: 20000, polling: 500 });

// 4. Settle 800ms, then screenshot
await new Promise(r => setTimeout(r, 800));
const buffer = await page.screenshot({ type: 'png' });
```

---

### 2. Simulated Device Too Small on Mobile (UNRESOLVED)

**Symptom:** On mobile viewports, the device frame in Viewer is very small — doesn't fill the available space.

**Root cause:**
`.viewer__stage` is a flex child of `.app-layout__main` which is `display: flex; flex-direction: column`.
The stage needs `flex: 1; min-height: 0` to grow and fill the column.
`min-height: 0` is required because flex children default to `min-height: auto`,
preventing them from shrinking below their content size.

**Fix was applied** (Viewer.css sets `flex: 1; min-height: 0` on `.viewer__stage`)
but mobile may still show the device too small because:
- On mobile, the hamburger bar takes 56px at the top (`padding-top: 56px` on `.app-layout__main`)
- The scale calculation in Viewer.jsx uses `stageDims` from a ResizeObserver
- If ResizeObserver fires before layout settles, `stageDims` could be stale
- The scale formula: `Math.min(1, (sw - 32) / fw, (sh - 32) / fh)` where fw/fh are frame dimensions

**What to try next:**
- Verify `.viewer__stage` actually has `flex: 1; min-height: 0` in the built CSS
  (run `npm run build` in `/client` and check `/public/assets/index-*.css`)
- On mobile, check if `stageDims.height` reflects the full available height minus hamburger
- The `DeviceFrame` component's `getFrameSize(frame, rotated)` returns fixed pixel dimensions —
  if the stage is e.g. 400px tall on mobile but the frame is 844px, scale = 400/844 ≈ 0.47
  which might feel too small. Consider increasing margin or adjusting min-scale.

---

## Playable Fields (DB Schema)

Each ad record:
```json
{
  "id": "uuid",
  "filename": "uuid.html",
  "title": "string",
  "appId": "uuid (ref to apps)",
  "tags": ["string"],
  "developer": "string",
  "repo": "string",
  "branch": "string",
  "notes": "string",
  "thumbnail": "uuid-thumb.png",
  "uploaded_at": 1234567890,
  "updated_at": 1234567890
}
```

Each app record:
```json
{
  "id": "uuid",
  "name": "string",
  "ios_url": "string",
  "android_url": "string",
  "icon_url": "string"
}
```

---

## Dev Commands

```bash
# Server (from /server)
node index.js
# or if package.json has start script:
npm start

# Client dev server (from /client)
npm run dev

# Client production build (from /client)
npm run build
# Output goes to /public (Express static root)
```
