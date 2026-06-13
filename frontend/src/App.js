import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';


function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

function luminance([r,g,b]) {
  return 0.299*r + 0.587*g + 0.114*b;
}

function PaletteStrip({ colors, label }) {
  return (
    <div className="palette-strip">
      {colors.map((c, i) => (
        <div
          key={i}
          className="color-swatch"
          style={{ background: c }}
          title={c}
        >
          <span
            className="swatch-label"
            style={{ color: luminance(hexToRgb(c)) > 128 ? '#000' : '#fff' }}
          >
            {c}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

export default function App() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activePalette, setActivePalette] = useState(null);
  const [dragging, setDragging] = useState(false);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  const getCurrentPalette = useCallback((t) => {
    if (!data) return null;
    let active = data.palettes[0];
    for (const p of data.palettes) {
      if (p.timestamp <= t) active = p;
      else break;
    }
    return active;
  }, [data]);

  useEffect(() => {
    if (data) {
      setActivePalette(getCurrentPalette(currentTime));
    }
  }, [currentTime, data, getCurrentPalette]);

  const handleFile = (f) => {
    if (!f || !f.name.endsWith('.mp4')) {
      setError('Please upload an MP4 file.');
      return;
    }
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setData(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('video', file);
      const res = await fetch(`${API}/process`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Processing failed');
      const json = await res.json();
      setData(json);
      setActivePalette(json.palettes[0]);
    } catch(e) {
      setError('Could not process video. Make sure the backend is running.');
    }
    setProcessing(false);
  };

  const handleTimelineClick = (e) => {
    if (!data || !timelineRef.current || !videoRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const t = pct * data.duration;
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const progress = data ? (currentTime / data.duration) * 100 : 0;

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">CINEMATICA</h1>
        <p className="tagline">color grading, made visible</p>
      </header>

      <main className="main">
        {!videoUrl ? (
          <div
            className={`dropzone ${dragging ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <div className="drop-content">
              <div className="drop-icon">▶</div>
              <p className="drop-title">Drop an MP4 here</p>
              <p className="drop-sub">or click to browse</p>
            </div>
            <input
              id="file-input"
              type="file"
              accept=".mp4"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="workspace">
            <div className="video-section">
              <video
                ref={videoRef}
                src={videoUrl}
                className="video-player"
                controls
                onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
              />

              {data && (
                <div className="timeline-wrap">
                  <div
                    className="timeline"
                    ref={timelineRef}
                    onClick={handleTimelineClick}
                  >
                    {data.palettes.map((p, i) => {
                      const next = data.palettes[i+1];
                      const left = (p.timestamp / data.duration) * 100;
                      const width = next
                        ? ((next.timestamp - p.timestamp) / data.duration) * 100
                        : 100 - left;
                      return (
                        <div
                          key={i}
                          className="timeline-segment"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          {p.colors.slice(0,3).map((c,j) => (
                            <div key={j} style={{ flex:1, background: c }} />
                          ))}
                        </div>
                      );
                    })}
                    <div className="playhead" style={{ left: `${progress}%` }} />
                  </div>
                  <div className="timeline-labels">
                    <span>{formatTime(0)}</span>
                    <span>{formatTime(data.duration)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="side-panel">
              {!data ? (
                <div className="process-section">
                  <p className="file-name">{file?.name}</p>
                  <button
                    className="process-btn"
                    onClick={handleProcess}
                    disabled={processing}
                  >
                    {processing ? (
                      <span className="processing">analyzing<span className="dots">...</span></span>
                    ) : 'extract palette'}
                  </button>
                  {error && <p className="error">{error}</p>}
                </div>
              ) : (
                <div className="palette-panel">
                  <div className="panel-meta">
                    <span>{data.total_scenes} scenes detected</span>
                    <span>{formatTime(data.duration)}</span>
                  </div>

                  {activePalette && (
                    <div className="active-palette">
                      <p className="palette-time">{formatTime(currentTime)}</p>
                      <PaletteStrip colors={activePalette.colors} />
                    </div>
                  )}

                  <div className="all-scenes">
                    <p className="scenes-label">all scenes</p>
                    {data.palettes.map((p, i) => (
                      <div
                        key={i}
                        className={`scene-row ${activePalette === p ? 'active' : ''}`}
                        onClick={() => {
                          if (videoRef.current) videoRef.current.currentTime = p.timestamp;
                          setCurrentTime(p.timestamp);
                        }}
                      >
                        <span className="scene-time">{formatTime(p.timestamp)}</span>
                        <div className="scene-colors">
                          {p.colors.map((c,j) => (
                            <div key={j} className="scene-dot" style={{ background: c }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="reset-btn"
                    onClick={() => { setFile(null); setVideoUrl(null); setData(null); }}
                  >
                    load new video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
