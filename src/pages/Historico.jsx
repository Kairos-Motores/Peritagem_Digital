import { useEffect, useState } from 'react';
import { useDataverse } from '../hooks/useDataverse';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/ui/LoadingScreen';
import TopBar from '../components/navigation/TopBar';
import FloatingNav from '../components/navigation/FloatingNav';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../assets/Medro llogo horizontal-Medro.svg';

export default function Historico() {
  const username = sessionStorage.getItem('dv_username');
  const { getCabecalhosPorFilial, getUsuarioLogado } = useDataverse();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!username) return;
        const userData = await getUsuarioLogado(username);
        const filial = userData?.cr4a1_filial;
        const cabecalhos = await getCabecalhosPorFilial(filial);

        const concluidas = cabecalhos.filter(cab => cab.cr4a1_status === 'Concluída');

        const cardsData = concluidas.map(cab => ({
          os: cab.cr4a1_os,
          peritador: cab.cr4a1_peritador,
          status: cab.cr4a1_status,
          percentual: 100,
          concluido: true,
          temFotos: cab.cr4a1_tem_fotos,
        }));

        const cardsUnicos = cardsData.filter(
          (card, index, self) => index === self.findIndex(c => c.os === card.os)
        );
        setCards(cardsUnicos);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  if (loading) return <LoadingScreen message="Carregando histórico" />;

  const cardsFiltrados = busca.trim()
    ? cards.filter(card => card.os.toLowerCase().includes(busca.toLowerCase()))
    : cards;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Histórico" showBack={false} logoSrc={Logo} />
      <div className="page-content" style={{ paddingBottom: 100 }}>
        <h2
          style={{
            color: 'var(--md-sys-color-on-background)',
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          Peritagens concluídas
        </h2>

        {/* Barra de pesquisa */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span
            className="material-symbols-outlined"
            style={{ position: 'absolute', left: 12, top: 10, color: 'var(--md-sys-color-on-surface-variant)', fontSize: 20 }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Pesquisar OS..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: 28,
              border: '1px solid var(--md-sys-color-outline)',
              backgroundColor: 'var(--md-sys-color-surface-variant)',
              color: 'var(--md-sys-color-on-surface)',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {cardsFiltrados.length === 0 && (
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Nenhum histórico encontrado.</p>
        )}
        <motion.div layout style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <AnimatePresence>
            {cardsFiltrados.map((card, index) => (
              <motion.div
                key={card.os}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
                whileHover={{ scale: 1.02, y: -2, boxShadow: 'var(--md-sys-elevation-3)' }}
                whileTap={{ scale: 0.98, boxShadow: 'var(--md-sys-elevation-2)' }}
                onClick={() => navigate(`/inspecao/${encodeURIComponent(card.os)}`)}
                style={{
                  flex: '1 1 calc(50% - 16px)',
                  minWidth: '180px',
                  backgroundColor: 'var(--md-sys-color-primary)',
                  color: '#FFFFFF',
                  padding: 16,
                  borderRadius: 'var(--md-sys-shape-corner-large)',
                  boxShadow: 'var(--md-sys-elevation-2)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                  touchAction: 'manipulation',
                  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <strong style={{ fontSize: '1rem', fontWeight: 600 }}>OS: {card.os}</strong>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {card.temFotos && (
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#fff' }}>
                          image
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9 }}>✓ Concluída</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: 16, fontWeight: 400 }}>
                    {card.peritador || 'N/D'}
                  </p>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, display: 'block', textAlign: 'right', marginTop: 4 }}>
                    100%
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
      <FloatingNav />
    </div>
  );
}