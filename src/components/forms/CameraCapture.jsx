import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { comprimirImagem } from '../../utils/imagem';

const MAX_LADO = 1600; // mesmo limite usado em utils/imagem.js

const botaoIconeStyle = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

// Captura de foto via getUserMedia em vez de <input capture>.
// Isso evita repassar pro navegador o arquivo cru que o app de câmera nativo
// devolve (em aparelhos com câmera de alta resolução isso pode passar de
// 20-30MB e travar a aba por falta de memória só de decodificar a imagem,
// antes mesmo de qualquer redimensionamento em JS ter chance de rodar).
// Pedindo o stream de vídeo já numa resolução modesta, a foto nunca existe
// em alta resolução na memória do navegador. Também dá acesso ao flash
// (torch), que o <input capture> não permite controlar.
export default function CameraCapture({ open, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchDisponivel, setTorchDisponivel] = useState(false);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    setPronto(false);
    setErro('');
    setTorchOn(false);
    setTorchDisponivel(false);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: MAX_LADO },
          height: { ideal: MAX_LADO },
        },
        audio: false,
      })
      .then((stream) => {
        if (!ativo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        setTorchDisponivel(!!caps.torch);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setPronto(true);
        }
      })
      .catch((err) => {
        console.error('Erro ao acessar a câmera:', err);
        setErro('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      });

    return () => {
      ativo = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    };
  }, [open]);

  const alternarFlash = useCallback(async () => {
    if (!trackRef.current || !torchDisponivel) return;
    const novoEstado = !torchOn;
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: novoEstado }] });
      setTorchOn(novoEstado);
    } catch (err) {
      console.error('Erro ao alternar flash:', err);
    }
  }, [torchOn, torchDisponivel]);

  const capturar = useCallback(() => {
    const video = videoRef.current;
    if (!video || !pronto) return;

    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > MAX_LADO || h > MAX_LADO) {
      if (w > h) {
        h = Math.round((h * MAX_LADO) / w);
        w = MAX_LADO;
      } else {
        w = Math.round((w * MAX_LADO) / h);
        h = MAX_LADO;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    onCapture(base64);
  }, [pronto, onCapture]);

  // Alternativa para quando a câmera não pode ser acessada (permissão negada,
  // navegador sem suporte a getUserMedia etc.) — volta ao seletor de arquivo
  // nativo, mas ainda redimensiona antes de guardar em memória.
  const handleArquivoFallback = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const base64 = await comprimirImagem(file);
      onCapture(base64);
    } catch (err) {
      console.error('Erro ao processar foto do seletor de arquivo:', err);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 4000,
          display: 'flex', flexDirection: 'column',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ flex: 1, width: '100%', objectFit: 'cover', backgroundColor: '#000' }}
        />

        {erro && (
          <div style={{
            position: 'absolute', top: '50%', left: 24, right: 24, transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <p style={{ color: '#fff', textAlign: 'center', fontSize: '0.95rem', margin: 0 }}>{erro}</p>
            <button
              onClick={() => fallbackInputRef.current?.click()}
              style={{
                padding: '10px 20px', borderRadius: 20, border: 'none',
                backgroundColor: 'var(--md-sys-color-primary)', color: '#fff',
                fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Selecionar foto do dispositivo
            </button>
            <input
              ref={fallbackInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleArquivoFallback}
            />
          </div>
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: 16 }}>
          <button onClick={onClose} style={{ ...botaoIconeStyle, backgroundColor: 'rgba(0,0,0,0.5)' }} aria-label="Fechar câmera">
            <span className="material-symbols-outlined">close</span>
          </button>
          {torchDisponivel && (
            <button
              onClick={alternarFlash}
              style={{
                ...botaoIconeStyle,
                backgroundColor: torchOn ? 'var(--md-sys-color-primary)' : 'rgba(0,0,0,0.5)',
              }}
              aria-label="Alternar flash"
            >
              <span className="material-symbols-outlined">{torchOn ? 'flash_on' : 'flash_off'}</span>
            </button>
          )}
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={capturar}
            disabled={!pronto}
            aria-label="Tirar foto"
            style={{
              width: 72, height: 72, borderRadius: '50%',
              backgroundColor: '#fff', border: '4px solid rgba(255,255,255,0.5)',
              cursor: pronto ? 'pointer' : 'default', opacity: pronto ? 1 : 0.5,
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
