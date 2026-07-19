/* global React, ReactDOM,
   UploadZone, ControlPanel, AsciiCanvas, DownloadBar,
   AboutModal, ApiKeyModal, AnalysisModal, DEMO_ANALYSES, Toast */

const DEFAULT_SETTINGS = {
  resolution: 12,
  brightness: 1.0,
  contrast: 1.0,
  colorMode: 'matrix',
  charset: 'sharp',
};

const SAMPLES = ['portrait', 'city', 'cat'];

function App() {
  const [settings, setSettings] = React.useState(DEFAULT_SETTINGS);
  const [source, setSource] = React.useState(null);     // null | {kind:'image', sample} | {kind:'live'}
  const [sampleIdx, setSampleIdx] = React.useState(0);
  const [activeModal, setActiveModal] = React.useState(null);
  const [aiConfig, setAiConfig] = React.useState(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [toast, setToast] = React.useState(null);

  const canvasRef = React.useRef(null);

  // Recording timer
  React.useEffect(() => {
    if (!isRecording) return;
    setElapsedSeconds(0);
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  const patchSettings = React.useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  function loadSample() {
    const next = SAMPLES[sampleIdx % SAMPLES.length];
    setSource({ kind: 'image', sample: next });
    setSampleIdx((i) => i + 1);
  }
  function startWebcam() { setSource({ kind: 'live' }); }
  function stopWebcam()  { setSource(null); setIsRecording(false); }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) { showToast('PNG Export failed'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ascii-art.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  }

  function exportTxt() {
    // Pull a text snapshot off the canvas — for demo, we just produce a
    // plausible block from the current charset.
    const lines = [];
    const map = window.CHARSET_MAPS[settings.charset];
    for (let y = 0; y < 24; y++) {
      let line = '';
      for (let x = 0; x < 64; x++) {
        const i = Math.floor((Math.sin(x*0.2) + Math.cos(y*0.25) + 2) / 4 * (map.length - 1));
        line += map[Math.min(map.length - 1, Math.max(0, i))];
      }
      lines.push(line);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ascii-art.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function capture() { exportPng(); }

  async function handleAnalyze() {
    if (!aiConfig) return;
    setActiveModal({ kind: 'analysis', state: { status: 'loading' } });
    // Pretend to call the AI provider
    await new Promise((r) => setTimeout(r, 1400));
    // Pick a demo analysis
    const a = DEMO_ANALYSES[Math.floor(Math.random() * DEMO_ANALYSES.length)];
    setActiveModal({ kind: 'analysis', state: { status: 'success', analysis: a } });
  }

  return (
    <div className="app">
      <header className="header">
        <span className="brand">ASCII//CONVERT</span>
        <span className="sep">—</span>
        <span className="tag">image → ascii art</span>
        <div className="right">
          <button className="h-btn" onClick={() => setActiveModal({ kind: 'about' })}>about</button>
          <button
            className={`h-btn ${aiConfig ? 'active' : ''}`}
            onClick={() => setActiveModal({ kind: 'apiKey' })}
            title="Configure AI key"
          >⚿ {aiConfig ? 'ai configured' : 'configure ai'}</button>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <UploadZone
            source={source}
            onLoadSample={loadSample}
            onStartWebcam={startWebcam}
            onStopWebcam={stopWebcam}
          />
          <div className="divider" />
          <ControlPanel settings={settings} onChange={patchSettings} />
        </aside>

        <main className="main">
          <div className="stage">
            {source ? (
              <AsciiCanvas source={source} settings={settings} canvasRef={canvasRef} />
            ) : (
              <span className="stage-empty">upload an image or enable webcam to begin</span>
            )}
          </div>
          <div className="actions">
            <DownloadBar
              source={source}
              hasAiConfig={!!aiConfig}
              isRecording={isRecording}
              elapsedSeconds={elapsedSeconds}
              onAnalyze={handleAnalyze}
              onExportPng={exportPng}
              onExportTxt={exportTxt}
              onCapture={capture}
              onStartRec={() => setIsRecording(true)}
              onStopRec={() => { setIsRecording(false); showToast('Recording saved'); }}
            />
          </div>
        </main>
      </div>

      {activeModal?.kind === 'apiKey' && (
        <ApiKeyModal
          current={aiConfig}
          onSave={setAiConfig}
          onRemove={() => setAiConfig(null)}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal?.kind === 'about' && (
        <AboutModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal?.kind === 'analysis' && (
        <AnalysisModal
          state={activeModal.state}
          onClose={() => setActiveModal(null)}
          onRetry={handleAnalyze}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
