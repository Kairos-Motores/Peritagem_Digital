import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataverse } from '../hooks/useDataverse';
import { useInspecao } from '../contexts/InspecaoContext';
import TopBar from '../components/navigation/TopBar';
import { FilledButton } from '../components/ui/MdButton';
import { ElevatedCard } from '../components/ui/MdCard';
import LoadingScreen from '../components/ui/LoadingScreen';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import AlbumFotos from '../components/forms/AlbumFotos';
import { useOffline } from '../contexts/OfflineContext';
import { obterInspecaoPorOS } from '../db/offlineStore';
import { db } from '../db/fila'; // acesso direto ao Dexie para buscar modelo offline

export default function InspecaoDetalhe() {
  const { os } = useParams();
  const navigate = useNavigate();
  const { getCabecalhoByOS, getItensByOS, getFilialPeritador, getFotos } = useDataverse();
  const { retomarInspecao } = useInspecao();
  const { error: toastError, success } = useToast();
  const { modoOffline } = useOffline();
  const [cabecalho, setCabecalho] = useState(null);
  const [itens, setItens] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFoto, setSelectedFoto] = useState(null);
  const [readonly, setReadonly] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState(null);

  const username = sessionStorage.getItem('dv_username');
  const userToken = sessionStorage.getItem('dv_token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (modoOffline) {
          // --- Modo offline: carregar tudo do IndexedDB ---
          const inspecao = await obterInspecaoPorOS(os);
          if (!inspecao) {
            toastError('Inspeção não encontrada offline.');
            navigate('/home');
            return;
          }

          // Cabeçalho (pode ser parcial, mas suficiente para exibição)
          setCabecalho(inspecao.cabecalho || {});
          setFotos(inspecao.fotos || []);
          setReadonly(inspecao.cabecalho?.cr4a1_status === 'Concluída');

          // Carregar modelo de itens do cache (IndexedDB)
          let modeloItens = [];
          try {
            modeloItens = await db.modelo.toArray();
          } catch (e) {
            console.warn('Modelo offline não encontrado, itens avaliados não serão exibidos.');
          }

          // Combinar respostas salvas com o modelo de itens
          const respostas = inspecao.respostas || {};
          const itensCombinados = Object.values(respostas).map(resp => {
            const modeloItem = modeloItens.find(m => m.cr4a1_item === resp.item_id);
            if (!modeloItem) {
              // Caso raro: item foi removido do modelo atual, exibe com dados mínimos
              return {
                cr4a1_peritagem_b04id: resp.item_id,
                cr4a1_item: resp.item_id,
                cr4a1_descricao: resp.descricao || 'Item sem descrição',
                cr4a1_tipo: resp.tipo || '',
                cr4a1_observacao: resp.observacao || '',
                cr4a1_var_quant: Object.entries(resp.quantidades || {})
                  .map(([k, v]) => `${k}:${v}`)
                  .join(';'),
                cr4a1_referencia: JSON.stringify(resp.referencia || {}),
              };
            }

            // Montar objeto no mesmo formato que a API retorna (simplificado)
            return {
              cr4a1_peritagem_b04id: modeloItem.cr4a1_peritagem_b04id || modeloItem.cr4a1_item,
              cr4a1_item: modeloItem.cr4a1_item,
              cr4a1_descricao: modeloItem.cr4a1_descricao,
              cr4a1_tipo: modeloItem.cr4a1_tipo,
              cr4a1_observacao: resp.observacao || '',
              // reconstruir cr4a1_var_quant a partir das quantidades salvas
              cr4a1_var_quant: Object.entries(resp.quantidades || {})
                .map(([k, v]) => `${k}:${v}`)
                .join(';'),
              // a referência também já foi salva como objeto, serializamos de volta
              cr4a1_referencia: JSON.stringify(resp.referencia || {}),
            };
          });

          setItens(itensCombinados);
          setLoading(false);
          return;
        }

        // --- Modo online (código original) ---
        const [cab, its, fts] = await Promise.all([
          getCabecalhoByOS(os),
          getItensByOS(os),
          getFotos(os),
        ]);
        if (cab) {
          const filialPeritador = await getFilialPeritador(username);
          if (cab.cr4a1_filial && filialPeritador && cab.cr4a1_filial !== filialPeritador) {
            toastError('Você não tem permissão para visualizar esta peritagem.');
            navigate('/home');
            return;
          }
          setReadonly(cab.cr4a1_status === 'Concluída');
        }
        setCabecalho(cab);
        setItens(its);
        setFotos(fts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [os, modoOffline]);

  const handleUploadFoto = async (base64, fileName, numero) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/upload-foto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({ os, fotoBase64: base64, nomeArquivo: fileName }),
    });
    if (!res.ok) throw new Error('Upload falhou');
    const data = await res.json();
    setFotos(prev => {
      const outras = prev.filter(f => !f.name.match(new RegExp(`_foto_${numero}\\.jpg$`)));
      return [...outras, { name: fileName, url: data.url, id: data.id }];
    });
    success('Foto salva com sucesso!');
  };

  const handleViewFoto = (foto) => {
    setSelectedFoto(foto);
  };

  const closeFoto = () => setSelectedFoto(null);

  const handleUpdateFotos = async () => {
    if (modoOffline) {
      const inspecao = await obterInspecaoPorOS(os);
      setFotos(inspecao?.fotos || []);
    } else {
      try {
        const fts = await getFotos(os);
        setFotos(fts || []);
      } catch (err) {
        console.error('Erro ao recarregar fotos:', err);
      }
    }
  };

  // ------ LÓGICA DE AGRUPAMENTO E FILTRO ------
  const tipos = useMemo(() => [...new Set(itens.map(i => i.cr4a1_tipo).filter(Boolean))], [itens]);

  const itensAgrupados = useMemo(() => {
    return itens.reduce((acc, item) => {
      const tipo = item.cr4a1_tipo || 'Sem Tipo';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(item);
      return acc;
    }, {});
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    let lista = itens;
    if (tipoFiltro) {
      lista = lista.filter(item => item.cr4a1_tipo === tipoFiltro);
    }
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase();
      lista = lista.filter(item => (item.cr4a1_descricao || '').toLowerCase().includes(termo));
    }
    return lista;
  }, [itens, tipoFiltro, termoBusca]);

  const renderItemCard = (item) => {
    const quantStr = item.cr4a1_var_quant || '';
    const quantPairs = quantStr.split(';').filter(Boolean).map(p => {
      const [op, qty] = p.split(':');
      return { opcao: op, quantidade: qty };
    });

    let refObj = {};
    try {
      refObj = JSON.parse(item.cr4a1_referencia || '{}');
    } catch (e) {
      refObj = {};
    }
    const refPairs = Object.entries(refObj).filter(([_, v]) => v > 0);

    return (
      <motion.div
        key={item.cr4a1_peritagem_b04id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <ElevatedCard style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: 8 }}>
            {item.cr4a1_descricao || item.cr4a1_item || 'Item sem nome'}
          </div>
          {item.cr4a1_observacao && (
            <p style={{ marginBottom: 8, fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)' }}>
              Obs: {item.cr4a1_observacao}
            </p>
          )}
          {quantPairs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {quantPairs.map((p, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-variant)',
                    color: 'var(--md-sys-color-on-surface-variant)',
                    padding: '2px 10px',
                    borderRadius: 16,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  {p.opcao}: {p.quantidade}
                </span>
              ))}
            </div>
          )}
          {refPairs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 4 }}>
                Referência:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {refPairs.map(([key, value], idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: 'var(--md-sys-color-tertiary-container)',
                      color: 'var(--md-sys-color-on-tertiary-container)',
                      padding: '2px 10px',
                      borderRadius: 16,
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    {key}: {value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ElevatedCard>
      </motion.div>
    );
  };

  if (loading) return <LoadingScreen message="Carregando detalhes" />;

  const renderField = (label, value) =>
    value ? (
      <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)', marginRight: 8, minWidth: 130 }}>
          {label}:
        </span>
        <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{value}</span>
      </div>
    ) : null;

  const albumFotos = fotos.filter(f => /_\d+\.jpg$/.test(f.name));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}>
      <TopBar title={`OS: ${os}`} />
      <div className="page-content" style={{ paddingBottom: 24 }}>
        {cabecalho && (
          <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)' }}>Dados da Peritagem</h2>
              {cabecalho.cr4a1_status && (
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 16,
                    backgroundColor:
                      cabecalho.cr4a1_status === 'Concluída'
                        ? 'var(--md-sys-color-primary)'
                        : 'var(--md-sys-color-surface-variant)',
                    color:
                      cabecalho.cr4a1_status === 'Concluída'
                        ? '#fff'
                        : 'var(--md-sys-color-on-surface-variant)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {cabecalho.cr4a1_status}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, marginBottom: 20 }}>
              {renderField('Cliente', cabecalho.cr4a1_cliente)}
              {renderField('Área', cabecalho.cr4a1_area)}
              {renderField('Nº Série', cabecalho.cr4a1_n_serie)}
              {renderField('OS Retorno', cabecalho.cr4a1_os_retorno)}
              {renderField('Tensão', cabecalho.cr4a1_tensao)}
              {renderField('Corrente', cabecalho.cr4a1_corrente)}
              {renderField('Modelo', cabecalho.cr4a1_modelo)}
              {renderField('Fabricante', cabecalho.cr4a1_fabricante)}
              {renderField('Carcaça', cabecalho.cr4a1_carcaca)}
              {renderField('Potência (CV)', cabecalho.cr4a1_potencia_cv)}
              {renderField('Potência (kW)', cabecalho.cr4a1_potencia_kw)}
              {renderField('Tag Cliente', cabecalho.cr4a1_tag_cliente)}
              {renderField('RPM', cabecalho.cr4a1_rpm)}
              {renderField('Polos', cabecalho.cr4a1_polos)}
              {renderField('Classe', cabecalho.cr4a1_classe)}
              {renderField('FS', cabecalho.cr4a1_fs)}
              {renderField('IP', cabecalho.cr4a1_ip)}
              {renderField('CAT', cabecalho.cr4a1_cat)}
              {renderField('REG', cabecalho.cr4a1_reg)}
              {renderField('FC', cabecalho.cr4a1_fc)}
              {renderField('Frequência', cabecalho.cr4a1_frequencia)}
              {renderField('Peso', cabecalho.cr4a1_peso)}
              {renderField('Nº REQ', cabecalho.cr4a1_n_req)}
              {renderField('Tag Kairós', cabecalho.cr4a1_tag_kairos)}
              {renderField('Comprimento', cabecalho.cr4a1_comprimento)}
              {renderField('Largura', cabecalho.cr4a1_largura)}
              {renderField('Altura', cabecalho.cr4a1_altura)}
              {renderField('ME', cabecalho.cr4a1_me)}
              {renderField('Peritador', cabecalho.cr4a1_peritador)}
              {renderField('Mecânico', cabecalho.cr4a1_mecanico)}
              {renderField(
                'Data Início',
                cabecalho.cr4a1_data_peritagem
                  ? new Date(cabecalho.cr4a1_data_peritagem).toLocaleString()
                  : null
              )}
              {renderField(
                'Data Fim',
                cabecalho.cr4a1_data_peritagem_fim
                  ? new Date(cabecalho.cr4a1_data_peritagem_fim).toLocaleString()
                  : null
              )}
            </div>

            {cabecalho.cr4a1_status === 'Em andamento' && (
              <FilledButton
                onClick={() => {
                  const cabecalhoId = cabecalho.cr4a1_peritagem_cabecalhoid;
                  retomarInspecao(
                    os,
                    cabecalhoId,
                    cabecalho?.cr4a1_filial || '',
                    cabecalho?.cr4a1_cliente || ''
                  );
                  navigate('/checklist');
                }}
                style={{ width: '100%', marginTop: 8 }}
              >
                Continuar Inspeção
              </FilledButton>
            )}
          </ElevatedCard>
        )}

        <AlbumFotos
          os={os}
          fotos={fotos}
          filial={cabecalho?.cr4a1_filial || 'SemFilial'}
          cliente={cabecalho?.cr4a1_cliente || 'SemCliente'}
          readonly={readonly}
          onUpdate={handleUpdateFotos}
          onViewFoto={handleViewFoto}
        />

        {/* ========== SEÇÃO DE ITENS AVALIADOS (COM FILTROS) ========== */}
        <h2 style={{ color: 'var(--md-sys-color-on-surface)', marginTop: 24, marginBottom: 12 }}>
          Itens Avaliados
        </h2>
        {itens.length === 0 && (
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Nenhum item registrado.</p>
        )}

        {itens.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Campo de busca */}
            <div style={{ position: 'relative' }}>
              <span
                className="material-symbols-outlined"
                style={{ position: 'absolute', left: 12, top: 10, color: 'var(--md-sys-color-on-surface-variant)', fontSize: 20 }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
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

            {/* Chips de tipos */}
            <motion.div layout style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <motion.button
                layout
                onClick={() => setTipoFiltro(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  border: '1.5px solid var(--md-sys-color-outline)',
                  backgroundColor: tipoFiltro === null ? 'var(--md-sys-color-primary)' : 'transparent',
                  color: tipoFiltro === null ? '#fff' : 'var(--md-sys-color-on-surface)',
                  fontWeight: tipoFiltro === null ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s',
                }}
              >
                Todos
              </motion.button>
              {tipos.map(tipo => (
                <motion.button
                  layout
                  key={tipo}
                  onClick={() => setTipoFiltro(tipo)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: '1.5px solid var(--md-sys-color-outline)',
                    backgroundColor: tipoFiltro === tipo ? 'var(--md-sys-color-primary)' : 'transparent',
                    color: tipoFiltro === tipo ? '#fff' : 'var(--md-sys-color-on-surface)',
                    fontWeight: tipoFiltro === tipo ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    boxShadow: tipoFiltro === tipo ? 'var(--md-sys-elevation-1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {tipo.toLowerCase().includes('peça') ? 'build' :
                     tipo.toLowerCase().includes('serviço') ? 'design_services' :
                     tipo.toLowerCase().includes('elétrico') ? 'bolt' : 'category'}
                  </span>
                  <span>{tipo}</span>
                </motion.button>
              ))}
            </motion.div>
          </div>
        )}

        {/* Renderização com ou sem agrupamento */}
        {!tipoFiltro ? (
          Object.entries(itensAgrupados).map(([tipo, itensDoTipo]) => {
            const itensVisiveis = itensDoTipo.filter(item =>
              !termoBusca || (item.cr4a1_descricao || '').toLowerCase().includes(termoBusca.toLowerCase())
            );
            if (itensVisiveis.length === 0) return null;
            return (
              <motion.div key={tipo} layout style={{ marginBottom: 20 }}>
                <h3 style={{ color: 'var(--md-sys-color-primary)', fontSize: '1rem', marginBottom: 8, paddingLeft: 4 }}>
                  {tipo}
                </h3>
                <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  <AnimatePresence>
                    {itensVisiveis.map(item => renderItemCard(item))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })
        ) : (
          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            <AnimatePresence>
              {itensFiltrados.map(item => renderItemCard(item))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Lightbox com swipe (mantido igual) */}
      <AnimatePresence>
        {selectedFoto && (
          <motion.div
            className="modal-overlay"
            onClick={closeFoto}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              touchAction: 'none',
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              e.currentTarget.dataset.startX = touch.clientX;
              e.currentTarget.dataset.startY = touch.clientY;
            }}
            onTouchEnd={(e) => {
              const startX = parseFloat(e.currentTarget.dataset.startX);
              const startY = parseFloat(e.currentTarget.dataset.startY);
              if (isNaN(startX)) return;

              const touch = e.changedTouches[0];
              const diffX = touch.clientX - startX;
              const diffY = touch.clientY - startY;

              if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                e.stopPropagation();
                const idx = albumFotos.findIndex(f => f.id === selectedFoto.id);
                if (diffX < 0 && idx < albumFotos.length - 1) {
                  setSelectedFoto(albumFotos[idx + 1]);
                } else if (diffX > 0 && idx > 0) {
                  setSelectedFoto(albumFotos[idx - 1]);
                }
              }
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            >
              <button
                onClick={closeFoto}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  padding: 8,
                  zIndex: 10,
                }}
              >
                ✕
              </button>
              <img
                src={selectedFoto.url}
                alt={selectedFoto.name}
                style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
                draggable="false"
              />
              {albumFotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = albumFotos.findIndex(f => f.id === selectedFoto.id);
                      if (idx > 0) setSelectedFoto(albumFotos[idx - 1]);
                    }}
                    disabled={albumFotos.findIndex(f => f.id === selectedFoto.id) === 0}
                    style={{
                      position: 'absolute',
                      left: -50,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: '3rem',
                      cursor: 'pointer',
                      opacity: 0.8,
                      padding: '0 12px',
                    }}
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = albumFotos.findIndex(f => f.id === selectedFoto.id);
                      if (idx < albumFotos.length - 1) setSelectedFoto(albumFotos[idx + 1]);
                    }}
                    disabled={albumFotos.findIndex(f => f.id === selectedFoto.id) === albumFotos.length - 1}
                    style={{
                      position: 'absolute',
                      right: -50,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: '3rem',
                      cursor: 'pointer',
                      opacity: 0.8,
                      padding: '0 12px',
                    }}
                  >
                    ›
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}