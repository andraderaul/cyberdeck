/* global React, Modal, Button, Badge */

function AboutModal({ onClose }) {
  return (
    <Modal
      onClose={onClose}
      variant="plain"
      title={<span className="modal-title plain">ASCII//CONVERT</span>}
    >
      <p>
        Turn any photo or your webcam into ASCII art — images made entirely of text characters.
        Upload a picture, tweak the settings, and export the result as an image or a text file.
        Everything happens in your browser, nothing is uploaded anywhere.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="label">AI Scan</span>
        <p>
          There's an optional feature that lets an AI describe what it sees in your ASCII art. To
          use it, you need your own API key from Anthropic, OpenAI, or Google. Your key is saved
          only on your device and goes straight to the AI service — we never see it or store it on
          any server.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="label">Made with AI</span>
        <p>
          This project was built in collaboration with AI — not just the code, but the design
          decisions, documentation, and architecture too.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href="https://github.com/andraderaul/ascii-art-converter"
          target="_blank" rel="noopener noreferrer"
          style={{
            color: 'var(--cyan)', fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-wide)',
            textDecoration: 'none', fontFamily: 'var(--font-mono)',
          }}
        >source code →</a>
        <a
          href="https://www.linkedin.com/in/andraderaul/"
          target="_blank" rel="noopener noreferrer"
          style={{
            color: 'var(--cyan)', fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-wide)',
            textDecoration: 'none', fontFamily: 'var(--font-mono)',
          }}
        >author →</a>
      </div>
    </Modal>
  );
}

function ApiKeyModal({ current, onSave, onRemove, onClose }) {
  const [provider, setProvider] = React.useState(current?.provider ?? 'anthropic');
  const [key, setKey] = React.useState(current?.key ?? '');

  function handleSave() {
    if (!key.trim()) return;
    onSave({ provider, key: key.trim() });
    onClose();
  }

  return (
    <Modal
      onClose={onClose}
      variant="cyber"
      title={<span className="modal-title">⚿ AI CONFIG</span>}
    >
      <div className="field">
        <label htmlFor="ai-provider" className="label">PROVIDER</label>
        <select
          id="ai-provider"
          className="select-input"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          style={{ cursor: 'pointer' }}
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT-4o)</option>
          <option value="gemini">Google (Gemini)</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="ai-key" className="label">API KEY</label>
        <input
          id="ai-key"
          type="password"
          className="text-input"
          value={key}
          placeholder="paste your key here"
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
          your key stays in your browser only — never sent to our servers
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        {current && (
          <button
            type="button"
            onClick={() => { onRemove(); onClose(); }}
            className="btn"
            style={{
              border: '1px solid var(--hot-pink)',
              background: 'var(--color-danger-bg)',
              color: 'var(--hot-pink)',
            }}
          >remove key</button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!key.trim()}
          className="btn primary"
          style={{ marginLeft: 'auto' }}
        >save key</button>
      </div>
    </Modal>
  );
}

// Demo analysis states. In real app these come from the AI Provider adapter.
const DEMO_ANALYSES = [
  {
    threatLevel: 'LOW',
    description: 'Subject rendered in ASCII fragments. Head bowed, draped in cloth — possibly hood or shawl. Posture indicates rest or concentration. No active threat vectors detected.',
    tags: ['draped_subject', 'head_bowed', 'identity_veiled', 'low_motion'],
  },
  {
    threatLevel: 'MODERATE',
    description: 'Faint humanoid outline at center frame. Lighting inconsistent — partial occlusion suggests low-vis environment or surveillance evasion attempt.',
    tags: ['humanoid', 'partial_occlusion', 'low_visibility'],
  },
];

const THREAT_COLOR = {
  LOW: 'var(--cyan)',
  MODERATE: 'var(--electric)',
  HIGH: 'var(--hot-pink)',
  CRITICAL: 'var(--hot-pink)',
  UNKNOWN: 'var(--muted)',
};
const THREAT_BG = {
  LOW: 'rgba(0,229,255,0.07)',
  MODERATE: 'rgba(255,230,0,0.07)',
  HIGH: 'rgba(255,45,120,0.07)',
  CRITICAL: 'rgba(255,45,120,0.12)',
  UNKNOWN: 'rgba(107,107,154,0.07)',
};

function AnalysisModal({ state, onClose, onRetry }) {
  return (
    <Modal
      onClose={onClose}
      variant="cyber"
      title={<span className="modal-title">◈ NEURAL SCAN RESULTS</span>}
      closeable={state.status !== 'loading'}
    >
      {state.status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
          <span className="pulse" style={{ color: 'var(--violet)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wider)' }}>
            ▸ SCANNING VISUAL FEED...
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
            interfacing with AI Provider
          </span>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div
            className="threat-row"
            style={{
              background: THREAT_BG[state.analysis.threatLevel],
              border: `1px solid ${THREAT_COLOR[state.analysis.threatLevel]}`,
            }}
          >
            <span className="threat-lbl">THREAT LEVEL</span>
            <span
              className="threat-val"
              style={{
                color: THREAT_COLOR[state.analysis.threatLevel],
                textShadow: state.analysis.threatLevel === 'CRITICAL'
                  ? `0 0 8px ${THREAT_COLOR[state.analysis.threatLevel]}` : undefined,
              }}
            >
              {state.analysis.threatLevel}
            </span>
          </div>
          <p style={{ color: 'var(--ghost)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-normal)', margin: 0 }}>
            {state.analysis.description}
          </p>
          <div className="tag-list">
            {state.analysis.tags.map((t) => <Badge key={t}>#{t}</Badge>)}
          </div>
        </>
      )}

      {state.status === 'auth-error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0' }}>
          <span style={{ color: 'var(--hot-pink)', fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)' }}>
            ✕ AUTH FAILED
          </span>
          <span style={{ color: 'var(--dim)', fontSize: 'var(--text-xs)', lineHeight: 'var(--leading-normal)' }}>
            Invalid or expired API key. Review your key in settings and try again.
          </span>
        </div>
      )}
    </Modal>
  );
}

Object.assign(window, { AboutModal, ApiKeyModal, AnalysisModal, DEMO_ANALYSES });
