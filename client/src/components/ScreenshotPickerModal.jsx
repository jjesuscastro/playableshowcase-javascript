import { useEffect, useRef, useState } from 'react';
import { requestScreenshotCandidates, saveThumbnail } from '../api';
import './ScreenshotPickerModal.css';

export default function ScreenshotPickerModal({ ad, onDone, onSkip }) {
  const dialogRef = useRef();
  const startedRef = useRef(false);

  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | selecting | saving | error
  const [error, setError] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    setStatus('loading');
    setCandidates([]);
    setError('');
    setSelectedIdx(null);
    try {
      const { candidates: c } = await requestScreenshotCandidates(ad.id);
      setCandidates(c);
      setStatus('selecting');
    } catch (err) {
      setError(err.message || 'Screenshot capture failed');
      setStatus('error');
    }
  }

  async function handleSelect(dataUrl, idx) {
    setSelectedIdx(idx);
    setStatus('saving');
    try {
      const updated = await saveThumbnail(ad.id, dataUrl);
      onDone(updated);
    } catch {
      setStatus('error');
    }
  }

  return (
    <dialog ref={dialogRef} className="spm" onClose={onSkip}>
      <h2 className="spm__title">Update Thumbnail</h2>
      <p className="spm__desc">Choose a frame from the new playable</p>

      <div className="spm__body">
        {status === 'loading' && (
          <div className="spm__loading">Capturing frames…</div>
        )}

        {status === 'error' && (
          <div className="spm__error">Capture failed: {error}</div>
        )}

        {(status === 'selecting' || status === 'saving') && (
          <div className="spm__candidates">
            {candidates.map((dataUrl, i) => (
              <button
                key={i}
                type="button"
                className={`spm__candidate${selectedIdx === i ? ' spm__candidate--selected' : ''}`}
                onClick={() => handleSelect(dataUrl, i)}
                disabled={status === 'saving'}
                title={`Frame ${i + 1}`}
              >
                <img src={dataUrl} alt={`Frame ${i + 1}`} />
                {selectedIdx === i && (
                  <span className="spm__candidate-badge">
                    {status === 'saving' ? '…' : '✓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="spm__footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={fetchCandidates}
          disabled={status === 'loading' || status === 'saving'}
        >
          Retake
        </button>
        <button type="button" className="btn-secondary" onClick={onSkip}>
          Skip
        </button>
      </div>
    </dialog>
  );
}
