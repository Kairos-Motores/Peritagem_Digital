import { useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import './PhotoCapture.css';

export default function PhotoCapture({ onCapture }) {
  const fileRef = useRef();
  const [enviando, setEnviando] = useState(false);
  const { success, error } = useToast();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setEnviando(true);
      try {
        if (onCapture) await onCapture(base64, file.name);
        success('Foto enviada!');
      } catch (err) {
        error('Erro ao enviar foto.');
      } finally {
        setEnviando(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 16 }}>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={enviando}
        className="photo-btn"
        aria-label="Tirar foto"
      >
        <span className="material-symbols-outlined">photo_camera</span>
      </button>
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