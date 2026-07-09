//import '@material/web/textfield/filled-text-field.js';
import { useState } from 'react';
import { OutlinedButton } from '../ui/MdButton';

export default function ChecklistItem({ label, onChange }) {
  const [value, setValue] = useState('');
  const [conforme, setConforme] = useState(null);

  const handleChange = (e) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div style={{ marginBottom: 16, padding: 8, border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 12 }}>
      <label style={{ display: 'block', marginBottom: 8 }}>{label}</label>
      <md-filled-text-field
        type="number"
        value={value}
        onInput={handleChange}
        style={{ width: '100%' }}
      ></md-filled-text-field>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <OutlinedButton onClick={() => setConforme(true)} style={{ flex: 1 }}>
          Conforme
        </OutlinedButton>
        <OutlinedButton onClick={() => setConforme(false)} style={{ flex: 1 }}>
          Não Conforme
        </OutlinedButton>
      </div>
    </div>
  );
}