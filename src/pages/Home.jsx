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

export default function Home() {
  const username = sessionStorage.getItem('dv_username');
  const { getUsuarioLogado, getCabecalhosPorFilial, getFilialPeritador, getModeloItens, getInspecoes, getCabecalhoByOS } = useDataverse();
  const [dadosUsuario, setDadosUsuario] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estado para o modal de resumo (long press)
  const [modalOS, setModalOS] = useState(null); // OS selecionada
  const [modalData, setModalData] = useState(null); // dados do cabeçalho
  const [modalLoading, setModalLoading] = useState(false);

  // Refs para controle de toque
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  // Carrega cards da filial
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (username) {
          const userData = await getUsuarioLogado(username);
          setDadosUsuario(userData);
          const filial = userData?.cr4a1_filial;
          const [modeloItens, cabecalhos, todosItens] = await Promise.all([
            getModeloItens(),
            getCabecalhosPorFilial(filial),
            getInspecoes(),
          ]);
          const totalItensModelo = modeloItens.length;

          const itensPorOS = {};
          todosItens.forEach(item => {
            const os = item.cr4a1_os;
            if (!itensPorOS[os]) itensPorOS[os] = new Set();
            itensPorOS[os].add(item.cr4a1_item);
          });

          const cardsData = cabecalhos.map(cab => {
            const os = cab.cr4a1_os;
            const itensPreenchidos = itensPorOS[os]?.size || 0;
            const percentual = totalItensModelo > 0
              ? Math.round((itensPreenchidos / totalItensModelo) * 100)
              : 0;
            const concluido = cab.cr4a1_status === 'Concluída' || percentual === 100;
            return {
              os,
              peritador: cab.cr4a1_peritador,
              status: cab.cr4a1_status,
              percentual: concluido ? 100 : percentual,
              concluido,
            };
          });
          setCards(cardsData);
        }
      } catch (err) {
        console.error('Erro ao carregar dados da Home:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  // Handlers de toque longo
  const handleTouchStart = useCallback((os) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setModalOS(os);
    }, 600); // 600 ms
  }, []);

  const handleTouchEnd = useCallback((os) => {
    clearTimeout(longPressTimer.current);
    if (!isLongPress.current) {
      // Toque curto → navega
      navigate(`/inspecao/${encodeURIComponent(os)}`);
    }
    // Se foi longo, o efeito de abrir modal já foi disparado
  }, [navigate]);

  // Busca dados do cabeçalho quando modalOS muda
  useEffect(() => {
    if (modalOS) {
      setModalLoading(true);
      getCabecalhoByOS(modalOS)
        .then(data => {
          setModalData(data);
          setModalLoading(false);
        })
        .catch(() => {
          setModalData(null);
          setModalLoading(false);
        });
    } else {
      setModalData(null);
    }
  }, [modalOS]);

  // Fecha modal
  const closeModal = () => {
    setModalOS(null);
    setModalData(null);
  };

  if (loading) return <LoadingScreen message="Buscando inspeções" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Kairós Peritagem" showBack={false} />
      <div style={{ padding: 16, flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        <h1 style={{ color: 'var(--md-sys-color-on-background)' }}>
          Bem-vindo, {dadosUsuario?.cr4a1_title || username}
        </h1>
        <SyncStatus />

        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <FilledButton onClick={() => navigate('/nova')} style={{ width: '100%' }}>
            Nova Inspeção
          </FilledButton>
        </div>

        <h2 style={{ color: 'var(--md-sys-color-on-background)' }}>Inspeções</h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {cards.length === 0 && <p>Nenhuma inspeção encontrada.</p>}
          {cards.map(card => (
            <div
              key={card.os}
              onTouchStart={() => handleTouchStart(card.os)}
              onTouchEnd={() => handleTouchEnd(card.os)}
              // Mouse fallback para desktop (não atrapalha touch)
              onClick={() => navigate(`/inspecao/${encodeURIComponent(card.os)}`)}
              style={{
                flex: '1 1 calc(50% - 12px)',
                minWidth: '220px',
                backgroundColor: card.concluido ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface)',
                color: card.concluido ? '#FFFFFF' : 'var(--md-sys-color-on-surface)',
                padding: 16,
                borderRadius: 'var(--md-sys-shape-corner-medium)',
                boxShadow: 'var(--md-sys-elevation-1)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                touchAction: 'manipulation', // melhora resposta em touch
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onTouchStartCapture={(e) => { /* evita conflito com onTouchStart acima */ }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: '1rem' }}>OS: {card.os}</strong>
                  {card.concluido && <span style={{ fontSize: '0.75rem' }}>✓ Concluída</span>}
                </div>
                <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: 12 }}>
                  {card.peritador || 'N/D'}
                </p>
              </div>
              <ProgressBar percentual={card.percentual} concluido={card.concluido} />
            </div>
          ))}
        </div>
      </div>
      <FloatingNav />

      {/* Modal de Resumo (toque prolongado) */}
      {modalOS && createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <h2 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Resumo da OS {modalOS}</h2>
            {modalLoading ? (
              <p>Carregando...</p>
            ) : modalData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                {/* Se quiser incluir a barra de progresso, pode, mas não temos o percentual exato aqui */}
              </div>
            ) : (
              <p>Dados não disponíveis.</p>
            )}
            <FilledButton
              onClick={() => {
                closeModal();
                navigate(`/inspecao/${encodeURIComponent(modalOS)}`);
              }}
              style={{ width: '100%', marginTop: 16 }}
            >
              Ver detalhes completos
            </FilledButton>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}