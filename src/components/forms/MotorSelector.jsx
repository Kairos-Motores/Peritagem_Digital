// Pode ser um autocomplete no futuro
//import '@material/web/textfield/filled-text-field.js';

export default function MotorSelector({ value, onChange }) {
  return (
    <md-filled-text-field
      label="Motor"
      value={value}
      onInput={(e) => onChange(e.target.value)}
      style={{ width: '100%' }}
    ></md-filled-text-field>
  );
}