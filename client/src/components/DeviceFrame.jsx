import { useEffect, useRef } from 'react';
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

// Injected into the live iframe document to mute without reloading.
// Handles HTML5 audio/video and Web Audio API (including Emscripten/Unity's AL layer).
const MUTE_CODE = `(function(){
  document.querySelectorAll("audio,video").forEach(function(e){e.muted=true;e.volume=0;});
  var AC=window.AudioContext||window.webkitAudioContext;
  if(AC){
    if(!AC.prototype.__savedResume){AC.prototype.__savedResume=AC.prototype.resume;}
    AC.prototype.resume=function(){return Promise.resolve();};
  }
  try{Object.keys(window).forEach(function(k){try{
    var v=window[k];
    if(v&&typeof v==="object"&&typeof v.suspend==="function"&&typeof v.state==="string"&&v.state==="running"){v.suspend();}
  }catch(e){}});}catch(e){}
  try{if(window.AL&&window.AL.currentCtx&&window.AL.currentCtx.ctx){window.AL.currentCtx.ctx.suspend();}}catch(e){}
})();`;

const UNMUTE_CODE = `(function(){
  document.querySelectorAll("audio,video").forEach(function(e){e.muted=false;e.volume=1;});
  var AC=window.AudioContext||window.webkitAudioContext;
  if(AC&&AC.prototype.__savedResume){
    AC.prototype.resume=AC.prototype.__savedResume;
    delete AC.prototype.__savedResume;
  }
  try{Object.keys(window).forEach(function(k){try{
    var v=window[k];
    if(v&&typeof v==="object"&&typeof v.resume==="function"&&typeof v.state==="string"&&v.state==="suspended"){v.resume();}
  }catch(e){}});}catch(e){}
  try{if(window.AL&&window.AL.currentCtx&&window.AL.currentCtx.ctx){window.AL.currentCtx.ctx.resume();}}catch(e){}
})();`;

function injectIntoIframe(iframe, code) {
  try {
    const doc = iframe?.contentDocument;
    if (!doc || doc.readyState === 'loading') return false;
    const s = doc.createElement('script');
    s.textContent = code;
    (doc.head || doc.documentElement).appendChild(s);
    s.remove();
    return true;
  } catch {
    return false;
  }
}

export default function DeviceFrame({ frame = 'phone', filename, rotated = false, muted = false, iframeRef: externalRef, onIframeLoad }) {
  const innerRef = useRef();
  const ref = externalRef ?? innerRef;

  // When muted prop changes on an already-loaded iframe, inject immediately.
  useEffect(() => {
    injectIntoIframe(ref.current, muted ? MUTE_CODE : UNMUTE_CODE);
  }, [muted]);

  function handleLoad(e) {
    // Re-apply mute state after any iframe reload (e.g. frame/rotation change).
    if (muted) injectIntoIframe(e.target, MUTE_CODE);
    onIframeLoad?.(e);
  }

  const o = rotated ? 'landscape' : 'portrait';
  const { w: sw, h: sh } = SCREEN[frame][o];
  const [pt, pr, pb, pl] = BEZEL[frame][o];
  const outerW = sw + pl + pr;
  const outerH = sh + pt + pb;
  const isPhone = frame === 'phone';

  const notchW = isPhone ? 90 : 14;
  const notchH = isPhone ? 24 : 14;
  const notchStyle = rotated
    ? { width: notchH, height: notchW, top: (outerH - notchW) / 2, left: (pl - notchH) / 2 }
    : { width: notchW, height: notchH, top: (pt - notchH) / 2, left: (outerW - notchW) / 2 };

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
      <div className="device-frame__notch" style={notchStyle} />
      <div className="device-frame__screen" style={{
        top: pt, left: pl, width: sw, height: sh,
        borderRadius: isPhone ? 30 : 16,
      }}>
        <iframe
          ref={ref}
          key={`${filename}-${frame}-${o}`}
          src={`/uploads/${filename}`}
          title="Playable ad"
          sandbox="allow-scripts allow-same-origin allow-forms"
          onLoad={handleLoad}
          style={{ width: sw, height: sh }}
        />
      </div>
      {homeStyle && <div className="device-frame__home" style={homeStyle} />}
    </div>
  );
}
