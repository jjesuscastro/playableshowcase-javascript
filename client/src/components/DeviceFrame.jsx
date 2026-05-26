import './DeviceFrame.css';

// Screen resolution (inner display area)
// Phone: 390×844 → 9:19.5 (iPhone 14)
// Tablet: 744×1133 → iPad mini 6th gen (≈ 2:3)
const SCREEN = {
  phone:  { portrait: { w: 390, h: 844 }, landscape: { w: 844, h: 390 } },
  tablet: { portrait: { w: 744, h: 1133 }, landscape: { w: 1133, h: 744 } },
};

// Bezel padding [top, right, bottom, left] sized so outer frame matches target ratio:
//   Phone outer:  410×888  → 9:19.5  ✓
//   Tablet outer: 768×1152 → 2:3     ✓
const BEZEL = {
  phone:  { portrait: [28, 10, 16, 10], landscape: [10, 28, 10, 16] },
  tablet: { portrait: [13, 12,  6, 12], landscape: [ 6, 13, 12, 12] },
};

export const FRAMES = {
  phone:  { label: 'Phone' },
  tablet: { label: 'Tablet' },
};

export function getFrameSize(frame, rotated) {
  const o = rotated ? 'landscape' : 'portrait';
  const { w, h } = SCREEN[frame][o];
  const [pt, pr, pb, pl] = BEZEL[frame][o];
  return { width: w + pl + pr, height: h + pt + pb };
}

export default function DeviceFrame({ frame = 'phone', filename, rotated = false, iframeRef, onIframeLoad }) {
  const o = rotated ? 'landscape' : 'portrait';
  const { w: sw, h: sh } = SCREEN[frame][o];
  const [pt, pr, pb, pl] = BEZEL[frame][o];
  const outerW = sw + pl + pr;
  const outerH = sh + pt + pb;
  const isPhone = frame === 'phone';

  // Notch
  const notchW = isPhone ? 90 : 14;
  const notchH = isPhone ? 24 : 14;
  const notchStyle = rotated
    ? { width: notchH, height: notchW, top: (outerH - notchW) / 2, left: (pl - notchH) / 2 }
    : { width: notchW, height: notchH, top: (pt - notchH) / 2, left: (outerW - notchW) / 2 };

  // Home bar (phone only)
  const homeStyle = isPhone
    ? rotated
      ? { width: 6, height: 40, top: (outerH - 40) / 2, right: (pr - 6) / 2 }
      : { width: 40, height: 6, bottom: (pb - 6) / 2, left: (outerW - 40) / 2 }
    : null;

  return (
    <div
      className={`device-frame device-frame--${frame}`}
      style={{ width: outerW, height: outerH }}
    >
      {/* Notch / camera dot */}
      <div className="device-frame__notch" style={notchStyle} />

      {/* Screen — exactly the device resolution.
          Corner radius = outer bezel radius − side bezel width, so the
          screen edge follows the body curve instead of looking pasted on. */}
      <div className="device-frame__screen" style={{
        top: pt, left: pl, width: sw, height: sh,
        borderRadius: isPhone ? 30 : 16,
      }}>
        <iframe
          ref={iframeRef}
          key={`${filename}-${frame}-${o}`}
          src={`/uploads/${filename}`}
          title="Playable ad"
          sandbox="allow-scripts allow-same-origin allow-forms"
          onLoad={onIframeLoad}
          style={{ width: sw, height: sh }}
        />
      </div>

      {/* Home indicator */}
      {homeStyle && <div className="device-frame__home" style={homeStyle} />}
    </div>
  );
}
