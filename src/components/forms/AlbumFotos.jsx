import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlbumFotos({ os, fotos = [], onUpload, onViewFoto, readonly = false }) {
  const [quadradoAtivo, setQuadradoAtivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Mapeia número → foto (ex.: 5 → { name: 'OS-001_foto_5.jpg', url: '...' })
  const fotosPorNumero = {};
  fotos.forEach(foto => {
    const match = foto.name.match(/_foto_(\d+)\.jpg$/);
    if (match) {
      fotosPorNumero[parseInt(match[1], 10)] = foto;
    }
  });

  const totalFotos = Object.keys(fotosPorNumero).length;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSalvar = async () => {
    if (!quadradoAtivo || !previewUrl) return;
    setLoading(true);
    try {
      const numero = quadradoAtivo;
      const fileName = `${os}_foto_${numero}.jpg`;
      await onUpload(previewUrl, fileName, numero);
      setPreviewUrl(null);
      setQuadradoAtivo(null);
    } catch (err) {
      alert('Erro ao salvar foto.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    setPreviewUrl(null);
    setQuadradoAtivo(null);
  };

  const abrirCamera = (numero) => {
    if (readonly) return;
    setQuadradoAtivo(numero);
    document.getElementById('camera-input-album').click();
  };

  const grid = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <div style={{ marginTop: 32, marginBottom: 32 }}>
      {/* Cabeçalho com botão de expandir/colapsar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
        <h2 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)', fontSize: '1.1rem' }}>Álbum de Fotos</h2>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Colapsar álbum' : 'Expandir álbum'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: 20,
            padding: '6px 14px',
            cursor: 'pointer',
            color: 'var(--md-sys-color-primary)',
            fontSize: '0.85rem',
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, transition: 'transform 0.3s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
          <span>{expanded ? 'Colapsar' : 'Expandir'}</span>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 400 }}>
            ({totalFotos} foto{totalFotos !== 1 ? 's' : ''})
          </span>
        </button>
      </div>

      {/* Área expansível com animação */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="album-grid"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingTop: 8 }}>
              {grid.map(num => {
                const foto = fotosPorNumero[num];
                const temFoto = !!foto;
                return (
                  <motion.div
                    key={num}
                    whileHover={{ scale: temFoto ? 1.02 : 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (temFoto) {
                        onViewFoto(foto);
                      } else if (!readonly) {
                        abrirCamera(num);
                      }
                    }}
                    style={{
                      aspectRatio: '1 / 1',
                      backgroundColor: temFoto ? 'transparent' : 'var(--md-sys-color-surface-variant)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: temFoto ? 'var(--md-sys-elevation-1)' : 'none',
                    }}
                  >
                    {temFoto ? (
                      <img
                        src={foto.url}
                        alt={`Foto ${num}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 36, color: 'var(--md-sys-color-on-surface-variant)' }}
                      >
                        photo_camera
                      </span>
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    >
                      {num}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input oculto para câmera */}
      <input
        id="camera-input-album"
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Modal de pré‑visualização */}
      {previewUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <img
            src={previewUrl}
            alt="Prévia"
            style={{ maxWidth: '90%', maxHeight: '60vh', borderRadius: 12, marginBottom: 20 }}
          />
          <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 20, textAlign: 'center' }}>
            Deseja salvar esta foto como <strong>número {quadradoAtivo}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleCancelar}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'var(--md-sys-color-surface-variant)',
                color: 'var(--md-sys-color-on-surface-variant)',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: '#fff',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}