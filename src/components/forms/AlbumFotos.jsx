import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../hooks/useToast';

export default function AlbumFotos({ os, fotos = [], filial = 'SemFilial', cliente = 'SemCliente', readonly = false, onUpdate, onViewFoto }) {
  const [expanded, setExpanded] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const { success, error } = useToast();
  const userToken = sessionStorage.getItem('dv_token');

  const fotosComNumero = fotos.filter(f => /_\d+\.jpg$/.test(f.name));
  const fotosTemp = fotos.filter(f => f.name.includes('_temp_'));

  const fotosPorNumero = {};
  fotosComNumero.forEach(foto => {
    const match = foto.name.match(/_(\d+)\.jpg$/);
    if (match) fotosPorNumero[parseInt(match[1])] = foto;
  });

  const totalFotos = Object.keys(fotosPorNumero).length;

  const toggleSelecao = (fotoId) => {
    setSelecionadas(prev => prev.includes(fotoId) ? prev.filter(id => id !== fotoId) : [...prev, fotoId]);
  };

  const confirmarSelecao = async () => {
    if (selecionadas.length === 0) return;
    setSalvando(true);
    try {
      const quadradosDisponiveis = [];
      for (let i = 1; i <= 18; i++) {
        if (!fotosPorNumero[i]) quadradosDisponiveis.push(i);
      }

      const alvos = selecionadas.slice(0, quadradosDisponiveis.length).map((fotoId, idx) => {
        const foto = fotosTemp.find(f => f.id === fotoId);
        let itemId = null;
        if (foto && foto.name) {
          const parts = foto.name.split('_temp_');
          if (parts.length > 0) itemId = parts[0];
        }
        return { fotoId, quadradoNumero: quadradosDisponiveis[idx], itemId };
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/renomear-fotos-album`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ os, filial, cliente, selecoes: alvos }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Erro ao renomear');
      }

      const data = await res.json();
      const erros = data.resultados.filter(r => r.status === 'erro');
      if (erros.length > 0) {
        error('Algumas fotos não puderam ser renomeadas.');
        console.error(erros);
      } else {
        success('Fotos adicionadas ao álbum!');
        setModalAberto(false);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error(err);
      error(err.message || 'Erro ao renomear fotos.');
    } finally {
      setSalvando(false);
    }
  };

  const grid = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <div style={{ marginTop: 32, marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
        <h2 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)', fontSize: '1.1rem' }}>Álbum de Fotos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {!readonly && (
            <button
              onClick={() => setModalAberto(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--md-sys-color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_photo_alternate</span>
              Preencher álbum
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent',
              border: '1px solid var(--md-sys-color-outline)',
              borderRadius: 20,
              padding: '6px 14px',
              cursor: 'pointer',
              color: 'var(--md-sys-color-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
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
      </div>

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
                      if (temFoto && onViewFoto) {
                        onViewFoto(foto);
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
                      <img src={foto.url} alt={`Foto ${num}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--md-sys-color-on-surface-variant)' }}>
                        photo_camera
                      </span>
                    )}
                    <span style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}>
                      {num}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {modalAberto && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 24,
            width: '90%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto',
          }}>
            <h3 style={{ marginTop: 0 }}>Selecionar fotos para o álbum</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {fotosTemp.map(foto => (
                <div
                  key={foto.id}
                  onClick={() => toggleSelecao(foto.id)}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    border: `3px solid ${selecionadas.includes(foto.id) ? 'var(--md-sys-color-primary)' : 'transparent'}`,
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <img src={foto.url} alt={foto.name} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                  {selecionadas.includes(foto.id) && (
                    <span className="material-symbols-outlined" style={{
                      position: 'absolute', top: 4, right: 4,
                      color: 'var(--md-sys-color-primary)', fontSize: 24,
                    }}>
                      check_circle
                    </span>
                  )}
                </div>
              ))}
              {fotosTemp.length === 0 && <p>Nenhuma foto pendente. Use o checklist para adicionar fotos aos itens.</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModalAberto(false)} style={{
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid var(--md-sys-color-outline)',
                background: 'transparent', color: 'var(--md-sys-color-on-surface)',
                cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={confirmarSelecao} disabled={salvando || selecionadas.length === 0} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'var(--md-sys-color-primary)', color: '#fff',
                cursor: 'pointer',
              }}>{salvando ? 'Salvando...' : 'Adicionar selecionadas'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}