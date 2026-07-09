import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FilledButton } from '../ui/MdButton';

export default function SignaturePad({ onSave }) {
  const sigRef = useRef();

  const clear = () => sigRef.current.clear();
  const save = () => {
    const data = sigRef.current.toDataURL();
    onSave(data);
  };

  return (
    <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--md-sys-color-outline)', borderRadius: 12 }}>
      <SignatureCanvas
        ref={sigRef}
        canvasProps={{ width: 300, height: 150, style: { width: '100%', border: '1px dashed gray' } }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <FilledButton onClick={clear}>Limpar</FilledButton>
        <FilledButton onClick={save}>Salvar Assinatura</FilledButton>
      </div>
    </div>
  );
}