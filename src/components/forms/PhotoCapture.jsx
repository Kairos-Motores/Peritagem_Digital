import { useRef } from 'react';
import { FilledButton } from '../ui/MdButton';

export default function PhotoCapture({ onCapture }) {
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      onCapture(URL.createObjectURL(file));
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <FilledButton onClick={() => fileRef.current.click()}>
        Tirar Foto
      </FilledButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}