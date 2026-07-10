/*import '@material/web/card/elevated-card.js';
import '@material/web/card/filled-card.js';
import '@material/web/card/outlined-card.js';*/

export function ElevatedCard({ children, ...props }) {
  return <md-elevated-card {...props}>{children}</md-elevated-card>;
}
export function FilledCard({ children, ...props }) {
  return <md-filled-card {...props}>{children}</md-filled-card>;
}
export function OutlinedCard({ children, ...props }) {
  return <md-outlined-card {...props}>{children}</md-outlined-card>;
}