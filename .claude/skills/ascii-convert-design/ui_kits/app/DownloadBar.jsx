/* global React, Button */
// DownloadBar — bottom action area; varies by source kind.

function DownloadBar({ source, hasAiConfig, isRecording, elapsedSeconds, onAnalyze, onExportPng, onExportTxt, onCapture, onStartRec, onStopRec }) {
  const isLive = source?.kind === 'live';
  const analyzeBtn = hasAiConfig && source ? (
    <Button variant="analyze" onClick={onAnalyze}>◈ scan &amp; analyze</Button>
  ) : null;

  if (isLive && isRecording) {
    return (
      <>
        <Button variant="danger" onClick={onCapture}>◎ capture</Button>
        <Button variant="danger" onClick={onStopRec}>
          ● {formatSec(elapsedSeconds)} ⏹ stop
        </Button>
      </>
    );
  }
  if (isLive) {
    return (
      <>
        {analyzeBtn}
        <Button variant="danger" onClick={onCapture}>◎ capture</Button>
        <Button variant="secondary" onClick={onStartRec}>⏺ record</Button>
      </>
    );
  }
  return (
    <>
      {analyzeBtn}
      <Button variant="primary" onClick={onExportPng} disabled={!source}>export png</Button>
      <Button variant="secondary" onClick={onExportTxt} disabled={!source}>export txt</Button>
    </>
  );
}

function formatSec(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

Object.assign(window, { DownloadBar });
