import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/button/elevated-button.js';

const styleProps = {
  style: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    minWidth: 'auto',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontWeight: '600',
    letterSpacing: '0.5px',
    transition: 'transform 0.1s, box-shadow 0.2s',
    cursor: 'pointer',
  },
};

export function FilledButton({ children, ...props }) {
  return <md-filled-button {...styleProps} {...props}>{children}</md-filled-button>;
}

export function OutlinedButton({ children, ...props }) {
  return <md-outlined-button {...styleProps} {...props}>{children}</md-outlined-button>;
}

export function TextButton({ children, ...props }) {
  return <md-text-button {...styleProps} {...props}>{children}</md-text-button>;
}

export function ElevatedButton({ children, ...props }) {
  return <md-elevated-button {...styleProps} {...props}>{children}</md-elevated-button>;
}