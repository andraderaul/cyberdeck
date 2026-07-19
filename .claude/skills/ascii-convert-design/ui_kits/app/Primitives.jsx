/* global React */
// Shared primitives: Button, ToggleGroup, Slider, Label, Modal, Badge, Toast

function Label({ children }) {
  return <span className="label">{children}</span>;
}

function Button({ variant = 'secondary', children, ...rest }) {
  return (
    <button type="button" className={`btn ${variant}`} {...rest}>{children}</button>
  );
}

function ToggleGroup({ options, value, onChange, fullWidth, labels, compact, ariaLabel }) {
  return (
    <fieldset
      aria-label={ariaLabel}
      className={`toggles ${fullWidth ? 'full' : ''}`}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`toggle ${compact ? 'compact' : ''} ${value === opt ? 'active' : ''}`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </fieldset>
  );
}

function Slider({ label, value, min, max, step, onChange, format = (v) => v.toFixed(1) }) {
  return (
    <div className="field">
      <div className="field-head">
        <Label>{label}</Label>
        <span className="field-val">{format(value)}</span>
      </div>
      <input
        type="range"
        className="slider-range"
        aria-label={label}
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function Modal({ children, onClose, title, variant = 'cyber', closeable = true }) {
  return (
    <div className="modal-overlay" role="presentation" onClick={closeable ? onClose : undefined}>
      <div
        className={`modal-dialog ${variant}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          {typeof title === 'string'
            ? <span className={`modal-title ${variant === 'plain' ? 'plain' : ''}`}>{title}</span>
            : title}
          {closeable && (
            <button type="button" className="modal-close" onClick={onClose} aria-label="close">✕</button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

function Toast({ message, onDismiss }) {
  return (
    <div className="toast" role="alert">
      <span className="glyph">⚠</span>
      <span className="msg">{message}</span>
      <button type="button" onClick={onDismiss} className="x" aria-label="dismiss">×</button>
    </div>
  );
}

Object.assign(window, { Label, Button, ToggleGroup, Slider, Modal, Badge, Toast });
