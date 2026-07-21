import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDataverse } from '../hooks/useDataverse';
import { useNavigate } from 'react-router-dom';
import SyncStatus from '../components/sync/SyncStatus';
import { FilledButton } from '../components/ui/MdButton';
import ProgressBar from '../components/ui/ProgressBar';
import LoadingScreen from '../components/ui/LoadingScreen';
import TopBar from '../components/navigation/TopBar';
import FloatingNav from '../components/navigation/FloatingNav';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../assets/Medro llogo horizontal-Medro.svg';

export default function Home() {
  const username = sessionStorage.getItem('dv_username');
  const {
    getUsuarioLogado,
    getCabecalhosPorFilial,
    getModeloItens,
    getInspecoes,
    getCabecalhoByOS,
    getOSPendentes,
  } = useDataverse();

  const [dadosUsuario, setDadosUsuario] = useState(null);
  const [cards, setCards] = useState([]);
  const [osPendentes, setOsPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Pull‑to‑refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStart = useRef(0);
  const mainContainerRef = useRef(null);

  // Estados de busca
  const [buscaAndamento, setBuscaAndamento] = useState('');
  const [buscaPendentes, setBuscaPendentes] = useState('');

  // Modal e toque longo
  const [modalOS, setModalOS] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [cardDetalhes, setCardDetalhes] = useState(null);

  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  // Ref para armazenar a função fetchData (estável)
  const fetchDataRef = useRef();

  // Função de busca central (colocada dentro do useEffect e guardada na ref)
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!username) return;
        setLoading(true);
        const userData = await getUsuarioLogado(username);
        setDadosUsuario(userData);
        const filial = userData?.cr4a1_filial;

        const [modeloItens, cabecalhos, todosItens, pendentes] = await Promise.all([
          getModeloItens(),
          getCabecalhosPorFilial(filial),
          getInspecoes(),
          getOSPendentes(filial),
        ]);

        // ---- Peritagens em andamento ----
        const tiposDoModelo = [...new Set(modeloItens.map(i => i.cr4a1_tipo).filter(Boolean))];
        const totalTipos = tiposDoModelo.length;

        const itensPorOS = {};
        todosItens.forEach(item => {
          const os = item.cr4a1_os;
          if (!itensPorOS[os]) itensPorOS[os] = new Set();
          itensPorOS[os].add(item.cr4a1_item);
        });

        const cardsData = cabecalhos
          .filter(cab => cab.cr4a1_status !== 'Concluída')
          .map(cab => {
            const os = cab.cr4a1_os;
            const itensRespondidosSet = itensPorOS[os] || new Set();
            let somaProgresso = 0;
            const progressoPorTipo = {};
            tiposDoModelo.forEach(tipo => {
              const itensDoTipo = modeloItens.filter(i => i.cr4a1_tipo === tipo);
              const totalItensTipo = itensDoTipo.length;
              const respondidosTipo = itensDoTipo.filter(item =>
                itensRespondidosSet.has(item.cr4a1_item)
              ).length;
              const progressoTipo = totalItensTipo > 0 ? respondidosTipo / totalItensTipo : 0;
              somaProgresso += progressoTipo;
              progressoPorTipo[tipo] = { respondidos: respondidosTipo, total: totalItensTipo };
            });
            const percentual = totalTipos > 0 ? Math.round((somaProgresso / totalTipos) * 100) : 0;
            const concluido = cab.cr4a1_status === 'Concluída' || percentual === 100;
            return {
              os,
              peritador: cab.cr4a1_peritador,
              status: cab.cr4a1_status,
              percentual: concluido ? 100 : percentual,
              temFotos: cab.cr4a1_tem_fotos,
              concluido,
              totalTipos,
              progressoPorTipo,
              itensFaltantesPorTipo: Object.entries(progressoPorTipo)
                .filter(([_, info]) => info.respondidos < info.total)
                .map(([tipo, info]) => ({ tipo, faltantes: info.total - info.respondidos })),
            };
          });

        const cardsUnicos = cardsData.filter(
          (card, index, self) => index === self.findIndex(c => c.os === card.os)
        );
        setCards(cardsUnicos);
        setOsPendentes(pendentes || []);
      } catch (err) {
        console.error('Erro ao carregar Home:', err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchDataRef.current = fetchData;   // armazena a função mais recente
    fetchData();                        // executa na montagem
  }, [username]);

  // Pull‑to‑refresh handlers
  const handleTouchStart = (e) => {
    pullStart.current = e.touches[0].clientY;
  };
  const handleTouchEnd = async (e) => {
    const pullDistance = e.changedTouches[0].clientY - pullStart.current;
    if (pullDistance > 100 && !isRefreshing && mainContainerRef.current?.scrollTop === 0) {
      setIsRefreshing(true);
      if (fetchDataRef.current) fetchDataRef.current();
    }
  };

  // Handlers de toque longo (mantidos)
  const handlePressStart = useCallback((os) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setModalOS(os);
    }, 600);
  }, []);

  const handlePressEnd = useCallback((os, e) => {
    clearTimeout(longPressTimer.current);
    if (!isLongPress.current) {
      e?.preventDefault();
      navigate(`/inspecao/${encodeURIComponent(os)}`);
    }
  }, [navigate]);

  const handleMouseDown = useCallback((os) => {
    handlePressStart(os);
  }, [handlePressStart]);

  const handleMouseUp = useCallback((os, e) => {
    handlePressEnd(os, e);
  }, [handlePressEnd]);

  // Modal (mantido)
  useEffect(() => {
    if (modalOS) {
      setModalLoading(true);
      const cardEncontrado = cards.find(c => c.os === modalOS);
      getCabecalhoByOS(modalOS)
        .then(data => {
          setModalData({
            ...data,
            percentual: cardEncontrado?.percentual,
            concluido: cardEncontrado?.concluido,
          });
          setCardDetalhes(cardEncontrado);
          setModalLoading(false);
        })
        .catch(() => { setModalData(null); setModalLoading(false); });
    } else {
      setModalData(null);
      setCardDetalhes(null);
    }
  }, [modalOS, cards, getCabecalhoByOS]);

  const closeModal = () => { setModalOS(null); setModalData(null); };

  if (loading) return <LoadingScreen message="Buscando inspeções" />;

  const cardsFiltrados = buscaAndamento.trim()
    ? cards.filter(card => card.os.toLowerCase().includes(buscaAndamento.toLowerCase()))
    : cards;
  const pendentesFiltrados = buscaPendentes.trim()
    ? osPendentes.filter(item => item.cr4a1_os_comp.toLowerCase().includes(buscaPendentes.toLowerCase()))
    : osPendentes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Kairós Peritagem" showBack={false} logoSrc={Logo} />
      <div
        ref={mainContainerRef}
        className="page-content"
        style={{
          paddingBottom: 100,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 24,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isRefreshing && (
          <div style={{ width: '100%', textAlign: 'center', padding: 8 }}>
            <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
          </div>
        )}

        {/* ========== COLUNA ESQUERDA: EM ANDAMENTO ========== */}
        <div style={{ flex: '1 1 55%', minWidth: 280 }}>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              color: 'var(--md-sys-color-on-background)',
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            Bem-vindo, {dadosUsuario?.cr4a1_title || username}
          </motion.h1>
          <SyncStatus />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            style={{ marginTop: 24, marginBottom: 32 }}
          >
            <FilledButton onClick={() => navigate('/nova')} style={{ width: '100%' }}>
              Nova Inspeção
            </FilledButton>
          </motion.div>

          <h2
            style={{
              color: 'var(--md-sys-color-on-background)',
              fontSize: '1.2rem',
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            Em andamento
          </h2>

          {/* Barra de pesquisa para em andamento */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: 12,
                top: 10,
                color: 'var(--md-sys-color-on-surface-variant)',
                fontSize: 20,
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Pesquisar OS..."
              value={buscaAndamento}
              onChange={(e) => setBuscaAndamento(e.target.value)}
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

          <motion.div layout style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {cardsFiltrados.length === 0 && (
              <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                Nenhuma peritagem encontrada.
              </p>
            )}
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
                  onTouchStartCapture={() => handlePressStart(card.os)}
                  onTouchEndCapture={(e) => handlePressEnd(card.os, e)}
                  onMouseDownCapture={() => handleMouseDown(card.os)}
                  onMouseUpCapture={(e) => handleMouseUp(card.os, e)}
                  style={{
                    flex: '1 1 calc(50% - 16px)',
                    minWidth: '180px',
                    backgroundColor: card.concluido
                      ? 'var(--md-sys-color-primary)'
                      : 'var(--md-sys-color-surface)',
                    color: card.concluido ? '#FFFFFF' : 'var(--md-sys-color-on-surface)',
                    padding: 16,
                    borderRadius: 'var(--md-sys-shape-corner-large)',
                    boxShadow: card.concluido
                      ? 'var(--md-sys-elevation-2)'
                      : 'var(--md-sys-elevation-1)',
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <strong style={{ fontSize: '1rem', fontWeight: 600 }}>OS: {card.os}</strong>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {card.temFotos && (
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: '1.1rem',
                              color: card.concluido ? '#fff' : 'var(--md-sys-color-primary)',
                            }}
                          >
                            image
                          </span>
                        )}
                        {card.concluido && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9 }}>
                            ✓ Concluída
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        opacity: 0.7,
                        marginBottom: 16,
                        fontWeight: 400,
                      }}
                    >
                      {card.peritador || 'N/D'}
                    </p>
                  </div>
                  <ProgressBar
                    percentual={card.percentual}
                    concluido={card.concluido}
                    tooltip={
                      !card.concluido && card.itensFaltantesPorTipo.length > 0
                        ? `Faltam itens em: ${card.itensFaltantesPorTipo.map(t => t.tipo).join(', ')}`
                        : null
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ========== COLUNA DIREITA: OS PENDENTES ========== */}
        <div style={{ flex: '1 1 40%', minWidth: 240 }}>
          <h2
            style={{
              color: 'var(--md-sys-color-on-background)',
              fontSize: '1.2rem',
              fontWeight: 500,
              marginBottom: 12,
              marginTop: 8,
            }}
          >
            OS pendentes de peritagem
          </h2>

          {/* Barra de pesquisa para pendentes */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: 12,
                top: 10,
                color: 'var(--md-sys-color-on-surface-variant)',
                fontSize: 20,
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Pesquisar OS..."
              value={buscaPendentes}
              onChange={(e) => setBuscaPendentes(e.target.value)}
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

          {pendentesFiltrados.length === 0 && (
            <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Nenhuma OS pendente.
            </p>
          )}

          {/* Contêiner com rolagem própria */}
          <div
            style={{
              maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto',
              paddingRight: 4,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AnimatePresence>
                {pendentesFiltrados.map((item, index) => (
                  <motion.div
                    key={item.cr4a1_os_comp}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, boxShadow: 'var(--md-sys-elevation-2)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      navigate(
                        `/nova?os=${encodeURIComponent(item.cr4a1_os_comp)}&cliente=${encodeURIComponent(item.cr4a1_cliente || '')}`
                      )
                    }
                    style={{
                      backgroundColor: 'var(--md-sys-color-surface)',
                      borderRadius: 16,
                      padding: 16,
                      boxShadow: 'var(--md-sys-elevation-1)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>OS: {item.cr4a1_os_comp}</strong>
                      {item.cr4a1_cliente && (
                        <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: 4 }}>
                          {item.cr4a1_cliente}
                        </p>
                      )}
                    </div>
                    <span
                      className="material-symbols-outlined"
                      style={{ color: 'var(--md-sys-color-primary)' }}
                    >
                      arrow_forward
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
      <FloatingNav />

      {/* Modal de resumo (toque longo) */}
      {modalOS &&
        createPortal(
          <motion.div
            className="modal-overlay"
            onClick={closeModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.4)' }}
          >
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'relative', padding: 28, maxWidth: 400, width: '90%' }}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <button className="modal-close" onClick={closeModal} style={{ top: 12, right: 12 }}>
                ✕
              </button>
              <h2 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)', fontSize: '1.3rem' }}>
                Resumo da OS {modalOS}
              </h2>
              {modalLoading ? (
                <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Carregando...</p>
              ) : modalData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem' }}>
                  <p><strong>Cliente:</strong> {modalData.cr4a1_cliente || '-'}</p>
                  <p><strong>Área:</strong> {modalData.cr4a1_area || '-'}</p>
                  <p><strong>Modelo:</strong> {modalData.cr4a1_modelo || '-'}</p>
                  <p><strong>Fabricante:</strong> {modalData.cr4a1_fabricante || '-'}</p>
                  <p><strong>Peritador:</strong> {modalData.cr4a1_peritador || '-'}</p>
                  <p><strong>Mecânico:</strong> {modalData.cr4a1_mecanico || '-'}</p>
                  <p><strong>Status:</strong> {modalData.cr4a1_status || '-'}</p>
                  {modalData.cr4a1_data_peritagem && (
                    <p><strong>Data Início:</strong> {new Date(modalData.cr4a1_data_peritagem).toLocaleString()}</p>
                  )}
                  {modalData.cr4a1_data_peritagem_fim && (
                    <p><strong>Data Fim:</strong> {new Date(modalData.cr4a1_data_peritagem_fim).toLocaleString()}</p>
                  )}

                  {!modalData.concluido && cardDetalhes?.itensFaltantesPorTipo?.length > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: 'var(--md-sys-color-surface-variant)',
                        borderRadius: 12,
                      }}
                    >
                      <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--md-sys-color-primary)' }}>
                        Progresso
                      </p>
                      {cardDetalhes.itensFaltantesPorTipo.map(item => (
                        <div
                          key={item.tipo}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem',
                            marginBottom: 4,
                          }}
                        >
                          <span>{item.tipo}</span>
                          <span style={{ color: 'var(--md-sys-color-error)' }}>
                            Faltam {item.faltantes} itens
                          </span>
                        </div>
                      ))}
                      <div style={{ height: 6, backgroundColor: '#eee', borderRadius: 3, marginTop: 8 }}>
                        <div
                          style={{
                            width: `${modalData.percentual || 0}%`,
                            height: '100%',
                            backgroundColor: 'var(--md-sys-color-primary)',
                            borderRadius: 3,
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p>Dados não disponíveis.</p>
              )}
              <FilledButton
                onClick={() => {
                  closeModal();
                  navigate(`/inspecao/${encodeURIComponent(modalOS)}`);
                }}
                style={{ width: '100%', marginTop: 20 }}
              >
                Ver detalhes completos
              </FilledButton>
            </motion.div>
          </motion.div>,
          document.body
        )}
    </div>
  );
}