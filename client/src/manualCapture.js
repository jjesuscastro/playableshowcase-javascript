export async function captureElementFromTab(element) {
  if (!element) throw new Error('The playable preview is not ready yet.');
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Manual capture requires a browser that supports tab capture over HTTPS.');
  }

  // Called from a click handler so the browser can open its tab picker.
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false,
  });

  try {
    const track = stream.getVideoTracks()[0];
    const { displaySurface } = track.getSettings();
    if (displaySurface && displaySurface !== 'browser') {
      throw new Error('Choose this browser tab in the sharing picker, then try again.');
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Could not read the shared browser tab.'));
    });
    await video.play();
    if (video.requestVideoFrameCallback) {
      await new Promise(resolve => video.requestVideoFrameCallback(resolve));
    } else {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const rect = element.getBoundingClientRect();
    const scaleX = video.videoWidth / window.innerWidth;
    const scaleY = video.videoHeight / window.innerHeight;
    const sx = Math.max(0, Math.round(rect.left * scaleX));
    const sy = Math.max(0, Math.round(rect.top * scaleY));
    const sw = Math.min(video.videoWidth - sx, Math.round(rect.width * scaleX));
    const sh = Math.min(video.videoHeight - sy, Math.round(rect.height * scaleY));
    if (sw <= 0 || sh <= 0) throw new Error('Could not find the playable in the captured tab.');

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL('image/png');
  } finally {
    stream.getTracks().forEach(track => track.stop());
  }
}
