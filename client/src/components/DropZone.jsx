import { useRef, useState } from 'react';
import './DropZone.css';

export default function DropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files].filter(f => f.name.endsWith('.html'));
    if (files.length) onFiles(files);
  }

  function handleChange(e) {
    const files = [...e.target.files];
    if (files.length) onFiles(files);
    e.target.value = '';
  }

  return (
    <div
      className={`dropzone${dragging ? ' dropzone--active' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".html"
        multiple
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <span className="dropzone__icon">+</span>
      <p>Drop <strong>.html</strong> files here or click to browse</p>
    </div>
  );
}
