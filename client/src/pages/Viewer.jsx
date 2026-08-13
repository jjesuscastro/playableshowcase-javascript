import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAd, listApps, listDevelopers, updateAd, updateAdFile } from '../api';
import AppLayout from '../components/AppLayout';
import DeviceFrame, { FRAMES, getFrameSize } from '../components/DeviceFrame';
import MainSidebar from '../components/MainSidebar';
import MetadataModal from '../components/MetadataModal';
import ScreenshotPickerModal from '../components/ScreenshotPickerModal';
import './Viewer.css';

const VIEWER_LAYOUT = {
  sidebarWidth: 220,
  mobileBreakpoint: 680,
  desktopFrameMargin: 32,
  mobileFrameMargin: 8,
  fallbackScale: 0.8,
  scaleTransitionMs: 180,
};

export default function Viewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ad, setAd] = useState(null);
  const [apps, setApps] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [frame, setFrame] = useState('phone');
  const [rotated, setRotated] = useState(false);
  const [muted, setMuted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pickingScreenshot, setPickingScreenshot] = useState(false);
  const stageRef = useRef();
  const [stageDims, setStageDims] = useState(() => ({
    width: window.innerWidth - VIEWER_LAYOUT.sidebarWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    getAd(id).then(setAd).catch(() => navigate('/'));
    listApps().then(setApps).catch(() => {});
    listDevelopers().then(setDevelopers).catch(() => {});
  }, [id, navigate]);

  useEffect(() => {
    if (!stageRef.current) return undefined;

    let rafId = null;
    const measure = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect) return;
        setStageDims({ width: rect.width, height: rect.height });
      });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(stageRef.current);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    measure();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  const scale = useMemo(() => {
    const { width: fw, height: fh } = getFrameSize(frame, rotated);
    const { width: sw, height: sh } = stageDims;
    if (!sw || !sh) return VIEWER_LAYOUT.fallbackScale;

    const margin = sw <= VIEWER_LAYOUT.mobileBreakpoint
      ? VIEWER_LAYOUT.mobileFrameMargin
      : VIEWER_LAYOUT.desktopFrameMargin;

    return Math.min(1, (sw - margin) / fw, (sh - margin) / fh);
  }, [stageDims, frame, rotated]);

  async function handleSave({ newFile, ...data }) {
    if (newFile) await updateAdFile(id, newFile);
    const updated = await updateAd(id, data);
    setAd(updated);
    setEditing(false);
    if (newFile) {
      setPickingScreenshot(true);
    }
  }

  if (!ad) return <div className="viewer__loading">Loading...</div>;

  const app = apps.find(a => a.id === ad.appId);

  const sidebar = (
    <MainSidebar active="viewer">
      <div className="sb-divider" />
      <span className="sb-section-label">Playable</span>
      <div className="viewer__sb-info">
        <span className="viewer__sb-title">{ad.title}</span>
        {ad.developer && <span className="viewer__sb-developer">{ad.developer}</span>}
      </div>

      {app && (
        <>
          <div className="sb-divider" />
          <span className="sb-section-label">Application</span>
          <div className="viewer__sb-info">
            <div className="viewer__app-row">
              {app.icon_url
                ? <img src={app.icon_url} className="viewer__app-icon" alt="" onError={e => { e.target.style.display = 'none'; }} />
                : <div className="viewer__app-icon viewer__app-icon--placeholder" />
              }
              <span className="viewer__app-name">{app.name}</span>
            </div>
            {(app.ios_url || app.android_url) && (
              <div className="viewer__store-links">
                {app.ios_url && (
                  <a href={app.ios_url} target="_blank" rel="noreferrer" className="viewer__store-link viewer__store-link--ios">
                    App Store
                  </a>
                )}
                {app.android_url && (
                  <a href={app.android_url} target="_blank" rel="noreferrer" className="viewer__store-link viewer__store-link--android">
                    Google Play
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {ad.repo && (
        <>
          <div className="sb-divider" />
          <span className="sb-section-label">Repo</span>
          <div className="viewer__sb-info">
            <span className="viewer__sb-mono">{ad.repo}@{ad.branch || 'main'}</span>
          </div>
        </>
      )}

      {ad.tags?.length > 0 && (
        <>
          <div className="sb-divider" />
          <span className="sb-section-label">Tags</span>
          <div className="viewer__sb-info">
            <div className="viewer__tags">
              {ad.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          </div>
        </>
      )}

      <div className="viewer__spacer" />
      <div className="sb-divider" />

      <div className="viewer__controls">
        <span className="sb-section-label" style={{ padding: '8px 14px 4px' }}>Frame</span>
        <div className="viewer__frame-btns">
          {Object.entries(FRAMES).map(([key, { label }]) => (
            <button
              key={key}
              className={`viewer__frame-btn${frame === key ? ' active' : ''}`}
              onClick={() => { setFrame(key); setRotated(false); }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="viewer__ctrl-row">
          <button
            className={`viewer__ctrl-btn${rotated ? ' active' : ''}`}
            onClick={() => setRotated(r => !r)}
            title="Rotate"
          >
            Rotate
          </button>
          <button
            className={`viewer__ctrl-btn${muted ? ' active' : ''}`}
            onClick={() => setMuted(m => !m)}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
        <div className="viewer__ctrl-row">
          <button className="btn-primary viewer__edit-btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="viewer__ctrl-btn" onClick={() => setPickingScreenshot(true)}>
            Screenshot
          </button>
          <a
            href={`/uploads/${ad.filename}`}
            download={`${ad.title}.html`}
            className="viewer__ctrl-btn viewer__download-btn"
            title="Download HTML"
          >
            ↓ HTML
          </a>
        </div>
      </div>
    </MainSidebar>
  );

  return (
    <AppLayout sidebar={sidebar}>
      <div className="viewer__stage" ref={stageRef}>
        <div
          className="viewer__frame-wrapper"
          style={{
            transform: `translate(-50%, -50%) scale(${scale})`,
            transition: `transform ${VIEWER_LAYOUT.scaleTransitionMs}ms ease`,
          }}
        >
          <DeviceFrame
            frame={frame}
            filename={ad.filename}
            rotated={rotated}
            muted={muted}
          />
        </div>
      </div>

      {editing && (
        <MetadataModal ad={ad} apps={apps} developers={developers} onSave={handleSave} onClose={() => setEditing(false)} />
      )}

      {pickingScreenshot && (
        <ScreenshotPickerModal
          ad={ad}
          onDone={shot => { setAd(shot); setPickingScreenshot(false); }}
          onSkip={() => setPickingScreenshot(false)}
        />
      )}
    </AppLayout>
  );
}
