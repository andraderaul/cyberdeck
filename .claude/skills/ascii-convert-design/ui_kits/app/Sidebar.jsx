/* global React, Label, ToggleGroup, Slider, COLOR_MODE_LIST, CHARSET_LIST */
// Sidebar control panel: source toggle, dropzone/webcam, then ConversionSettings

function UploadZone({ source, onLoadSample, onStartWebcam, onStopWebcam }) {
  const isLive = source?.kind === 'live';
  const [mode, setMode] = React.useState(isLive ? 'webcam' : 'upload');

  React.useEffect(() => {
    if (isLive && mode !== 'webcam') setMode('webcam');
  }, [isLive]);

  function switchMode(next) {
    setMode(next);
    if (next === 'webcam') onStartWebcam();
    if (next === 'upload' && isLive) onStopWebcam();
  }

  return (
    <div className="field" style={{ gap: 8 }}>
      <ToggleGroup
        ariaLabel="Source mode"
        options={['upload', 'webcam']}
        value={mode}
        onChange={switchMode}
        fullWidth
        labels={{ upload: '↑ upload', webcam: '◉ webcam' }}
      />
      {mode === 'upload' ? (
        <div className="dropzone" onClick={() => onLoadSample()}>
          <span className="big-glyph">⬆</span>
          <span className="cta">click to upload</span>
          <span className="hint">jpg · png · webp</span>
          <span className="hint" style={{ marginTop: 4, color: 'var(--fg-subtle)' }}>(demo loads a sample image)</span>
        </div>
      ) : (
        <div className={`dropzone live`}>
          <span className="big-glyph">◉</span>
          <span className="cta">LIVE</span>
          <span className="hint">adjust controls to tune the feed</span>
        </div>
      )}
    </div>
  );
}

function ControlPanel({ settings, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Slider
        label="resolution"
        value={settings.resolution}
        min={6} max={24} step={1}
        onChange={(resolution) => onChange({ resolution })}
        format={(v) => `${v}px`}
      />
      <div className="field">
        <Label>color mode</Label>
        <ToggleGroup
          ariaLabel="Color mode"
          options={COLOR_MODE_LIST}
          value={settings.colorMode}
          onChange={(colorMode) => onChange({ colorMode })}
          compact
        />
      </div>
      <div className="field">
        <Label>charset</Label>
        <ToggleGroup
          ariaLabel="Charset"
          options={CHARSET_LIST}
          value={settings.charset}
          onChange={(charset) => onChange({ charset })}
          compact
        />
      </div>
      <Slider
        label="brightness"
        value={settings.brightness}
        min={0.5} max={2.0} step={0.05}
        onChange={(brightness) => onChange({ brightness })}
      />
      <Slider
        label="contrast"
        value={settings.contrast}
        min={0.5} max={3.0} step={0.05}
        onChange={(contrast) => onChange({ contrast })}
      />
    </div>
  );
}

Object.assign(window, { UploadZone, ControlPanel });
