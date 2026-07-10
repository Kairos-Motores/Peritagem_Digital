import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/button/elevated-button.js';
import '@material/web/button/filled-tonal-button.js';

export function FilledButton({ children, ...props }) {
  return <md-filled-button {...props}>{children}</md-filled-button>;
}
export function OutlinedButton({ children, ...props }) {
  return <md-outlined-button {...props}>{children}</md-outlined-button>;
}
export function TextButton({ children, ...props }) {
  return <md-text-button {...props}>{children}</md-text-button>;
}
export function ElevatedButton({ children, ...props }) {
  return <md-elevated-button {...props}>{children}</md-elevated-button>;
}
export function FilledTonalButton({ children, ...props }) {
  return <md-filled-tonal-button {...props}>{children}</md-filled-tonal-button>;
}