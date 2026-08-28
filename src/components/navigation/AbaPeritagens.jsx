import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInspecao, MAX_PERITAGENS_ABERTAS } from '../../contexts/InspecaoContext';
import { useDataverse } from '../../hooks/useDataverse';
import { useOffline } from '../../contexts/OfflineContext';
import { useToast } from '../../hooks/useToast';
import './AbaPeritagens.css';

function IconeStatusOS({ status }) {
  switch (status) {
    case 'validando':
      return <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--md-sys-color-on-surface-variant)', animation: 'spin 1s linear infinite' }}>progress_activity</span>;
    case 'valida':
      return <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--md-sys-color-primary)' }}>check_circle</span>;
    case 'invalida':
      return <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--md-sys-color-error)' }}>cancel</span>;
    default:
      return null;
  }
}

// Fileira de peritagens abertas + botão "+" pra iniciar uma nova ou retomar
// uma em andamento, sem sair da tela atual.
//
// `salvarAntesDeTrocar`: callback opcional (pode ser async) chamado antes de
// trocar de aba ou fechar a aba ativa, pra quem usa (ex.: Checklist) salvar
// o progresso do tipo atual primeiro — mesma rede de segurança que já existe
// ao trocar de tipo dentro de uma peritagem.
export default function AbaPeritagens({ salvarAntesDeTrocar }) {
  const { inspecoesAbertas, osAtivo, focarAba, fecharAba, novaInspecao, retomarInspecao } = useInspecao();
  const navigate = useNavigate();
  const { validarOS, getCabecalhoByOS, getUsuarioLogado, getCabecalhosPorFilial } = useDataverse();
  const { modoOffline, salvarLocal } = useOffline();
  const { error: toastError } = useToast();
  const username = sessionStorage.getItem('dv_username');

  const [modalAberto, setModalAberto] = useState(false);
  const [secao, setSecao] = useState('andamento'); // 'andamento' | 'nova'
  const [emAndamento, setEmAndamento] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const [osInput, setOsInput] = useState('');
  const [valStatus, setValStatus] = useState(null);
  const [clienteValidado, setClienteValidado] = useState('');
  const [mensagem, setMensagem] = useState('');

  // Busca a lista de "em andamento" quando o modal abre
  useEffect(() => {
    if (!modalAberto || modoOffline) return;
    setCarregando(true);
    getUsuarioLogado(username)
      .then(userData => getCabecalhosPorFilial(userData?.cr4a1_filial))
      .then(cabs => setEmAndamento((cabs || []).filter(c => c.cr4a1_status !== 'Concluída')))
      .catch(() => setEmAndamento([]))
      .finally(() => setCarregando(false));
  }, [modalAberto, modoOffline, username]);

  // Validação da OS nova (mesmo padrão de NovaInspecao.jsx)
  useEffect(() => {
    if (modoOffline || !osInput.trim()) {
      setValStatus(null);
      setMensagem('');
      return;
    }
    setValStatus('validando');
    const t = setTimeout(async () => {
      try {
        const resultado = await validarOS(osInput.trim());
        setClienteValidado(resultado.cliente || '');
        if (resultado.status === 'valida') {
          setValStatus('valida');
          setMensagem('OS encontrada.');
        } else {
          setValStatus('invalida');
          setMensagem(resultado.status === 'apenas_zb6' ? 'Esta OS não pode ser peritada.' : 'OS não encontrada.');
        }
      } catch {
        setValStatus('invalida');
        setMensagem('Erro ao validar OS.');
      }
    }, 600);
    return () => clearTimeout(t);
  }, [osInput, modoOffline]);

  const fecharModal = () => {
    setModalAberto(false);
    setOsInput('');
    setValStatus(null);
    setMensagem('');
    setSecao('andamento');
  };

  const trocarPara = async (os) => {
    if (os !== osAtivo && salvarAntesDeTrocar) {
      try { await salvarAntesDeTrocar(); } catch (err) { console.error('Erro ao salvar antes de trocar de peritagem:', err); }
    }
    focarAba(os);
    navigate('/checklist');
  };

  const fechar = async (os) => {
    if (os === osAtivo && salvarAntesDeTrocar) {
      try { await salvarAntesDeTrocar(); } catch (err) { console.error('Erro ao salvar antes de fechar peritagem:', err); }
    }
    fecharAba(os);
  };

  const iniciarNova = async () => {
    const os = osInput.trim();
    if (!os) return;
    if (!modoOffline && valStatus !== 'valida') return;
    const abriu = novaInspecao(os);
    if (!abriu) {
      toastError(`Você já tem ${MAX_PERITAGENS_ABERTAS} peritagens abertas. Feche uma antes de iniciar outra.`);
      return;
    }
    if (modoOffline) {
      await salvarLocal({ os, cabecalho: null, respostas: {}, fotos: [], status: 'rascunho' });
      fecharModal();
      navigate(`/cabecalho?os=${encodeURIComponent(os)}`);
    } else {
      fecharModal();
      navigate(`/cabecalho?os=${encodeURIComponent(os)}&cliente=${encodeURIComponent(clienteValidado)}`);
    }
  };

  const retomarDaLista = async (item) => {
    try {
      const cab = await getCabecalhoByOS(item.cr4a1_os);
      const abriu = retomarInspecao(
        item.cr4a1_os,
        cab?.cr4a1_peritagem_cabecalhoid,
        cab?.cr4a1_filial || '',
        cab?.cr4a1_cliente || '',
        cab?.cr4a1_peritador || ''
      );
      if (!abriu) {
        toastError(`Você já tem ${MAX_PERITAGENS_ABERTAS} peritagens abertas. Feche uma antes de continuar outra.`);
        return;
      }
      fecharModal();
      navigate('/checklist');
    } catch {
      toastError('Erro ao abrir peritagem.');
    }
  };

  if (inspecoesAbertas.length === 0) return null;

  const listaFiltrada = emAndamento.filter(item => !inspecoesAbertas.some(a => a.os === item.cr4a1_os));
  const limiteAtingido = inspecoesAbertas.length >= MAX_PERITAGENS_ABERTAS;
  const iniciarDesabilitado = !osInput.trim() || (!modoOffline && valStatus !== 'valida');

  return (
    <>
      <motion.div layout className="aba-peritagens-strip">
        <AnimatePresence initial={false}>
          {inspecoesAbertas.map(insp => {
            const ativa = insp.os === osAtivo;
            return (
              <motion.div
                key={insp.os}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => trocarPara(insp.os)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  padding: '6px 8px 6px 12px', borderRadius: 'var(--md-sys-shape-corner-extra-large)',
                  border: `1.5px solid ${ativa ? 'transparent' : 'var(--md-sys-color-outline)'}`,
                  backgroundColor: ativa ? 'var(--md-sys-color-primary)' : 'transparent',
                  color: ativa ? '#fff' : 'var(--md-sys-color-on-surface)',
                  fontWeight: ativa ? 600 : 400, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: ativa ? 'var(--md-sys-elevation-1)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17, fontVariationSettings: "'FILL' 0" }}>assignment</span>
                <span>OS {insp.os}</span>
                <motion.span
                  role="button"
                  aria-label={`Fechar peritagem ${insp.os}`}
                  className={`aba-fechar-btn ${ativa ? 'ativa' : 'inativa'}`}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); fechar(insp.os); }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <motion.button
          type="button"
          className="topbar-icon-btn"
          onClick={() => setModalAberto(true)}
          aria-label="Nova ou outra peritagem"
          whileTap={{ scale: 0.9 }}
          style={{ width: 32, height: 32, flexShrink: 0, border: '1.5px dashed var(--md-sys-color-outline)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {modalAberto && (
          <motion.div
            onClick={fecharModal}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 3000, padding: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                position: 'relative', width: '100%', maxWidth: 420, maxHeight: '80vh', overflowY: 'auto',
                backgroundColor: 'var(--md-sys-color-surface)', borderRadius: 'var(--md-sys-shape-corner-large)',
                padding: 24, boxShadow: 'var(--md-sys-elevation-3)',
              }}
            >
              <button
                onClick={fecharModal}
                aria-label="Fechar"
                style={{
                  position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
                  color: 'var(--md-sys-color-on-surface-variant)', fontSize: '1.3rem', cursor: 'pointer', padding: 4, lineHeight: 1,
                }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingRight: 28 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'var(--md-sys-color-primary)' }}>assignment_add</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--md-sys-color-on-surface)' }}>Abrir peritagem</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {inspecoesAbertas.length}/{MAX_PERITAGENS_ABERTAS} abertas
                  </p>
                </div>
              </div>

              {/* Controle segmentado */}
              <div style={{ display: 'flex', gap: 4, padding: 4, marginBottom: 20, borderRadius: 'var(--md-sys-shape-corner-large)', backgroundColor: 'var(--md-sys-color-surface-variant)' }}>
                {[{ id: 'andamento', label: 'Em andamento' }, { id: 'nova', label: 'Nova OS' }].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSecao(opt.id)}
                    style={{
                      position: 'relative', flex: 1, padding: '8px 0', border: 'none', background: 'transparent',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                      color: secao === opt.id ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-on-surface-variant)',
                    }}
                  >
                    {secao === opt.id && (
                      <motion.div
                        layoutId="aba-modal-segmento-ativo"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        style={{
                          position: 'absolute', inset: 0, zIndex: 0,
                          backgroundColor: 'var(--md-sys-color-surface)', borderRadius: 'var(--md-sys-shape-corner-medium)',
                          boxShadow: 'var(--md-sys-elevation-1)',
                        }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {limiteAtingido && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 12, borderRadius: 12, backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '0.78rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
                  Limite de {MAX_PERITAGENS_ABERTAS} peritagens abertas atingido — feche uma antes de abrir outra.
                </div>
              )}

              <AnimatePresence mode="wait">
                {secao === 'andamento' ? (
                  <motion.div key="andamento" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                    {modoOffline ? (
                      <EstadoVazio icone="cloud_off" texto={'Lista de "em andamento" não disponível offline.'} />
                    ) : carregando ? (
                      <EstadoVazio icone="progress_activity" texto="Carregando..." girando />
                    ) : listaFiltrada.length === 0 ? (
                      <EstadoVazio icone="inbox" texto="Nenhuma outra peritagem em andamento." />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {listaFiltrada.map(item => (
                          <motion.button
                            key={item.cr4a1_os}
                            onClick={() => retomarDaLista(item)}
                            whileHover={{ scale: 1.01, boxShadow: 'var(--md-sys-elevation-2)' }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                              borderRadius: 'var(--md-sys-shape-corner-medium)', border: 'none',
                              backgroundColor: 'var(--md-sys-color-surface-variant)', cursor: 'pointer', textAlign: 'left',
                              boxShadow: 'var(--md-sys-elevation-1)',
                            }}
                          >
                            <span style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              width: 36, height: 36, borderRadius: '50%',
                              backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)',
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>precision_manufacturing</span>
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)', display: 'block' }}>OS {item.cr4a1_os}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{item.cr4a1_peritador || 'N/D'}</span>
                            </span>
                            <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-primary)', flexShrink: 0 }}>arrow_forward</span>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="nova" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="aba-os-input"
                        type="text"
                        placeholder="Número da OS"
                        value={osInput}
                        onChange={(e) => setOsInput(e.target.value)}
                        style={{
                          width: '100%', padding: '12px 40px 12px 16px', borderRadius: 'var(--md-sys-shape-corner-medium)',
                          border: '1.5px solid var(--md-sys-color-outline)', backgroundColor: 'var(--md-sys-color-surface-variant)',
                          color: 'var(--md-sys-color-on-surface)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                          transition: 'border-color 0.2s',
                        }}
                      />
                      {!modoOffline && valStatus && (
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                          <IconeStatusOS status={valStatus} />
                        </div>
                      )}
                    </div>
                    {!modoOffline && mensagem && (
                      <p style={{ marginTop: 8, fontSize: '0.8rem', color: valStatus === 'valida' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {mensagem}
                      </p>
                    )}
                    {!modoOffline && valStatus === 'valida' && clienteValidado && (
                      <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                        Cliente: <strong>{clienteValidado}</strong>
                      </p>
                    )}
                    <motion.button
                      onClick={iniciarNova}
                      disabled={iniciarDesabilitado}
                      whileTap={iniciarDesabilitado ? {} : { scale: 0.97 }}
                      style={{
                        width: '100%', marginTop: 16, padding: '12px', borderRadius: 'var(--md-sys-shape-corner-medium)',
                        border: 'none', cursor: iniciarDesabilitado ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.9rem',
                        backgroundColor: 'var(--md-sys-color-primary)', color: '#fff',
                        opacity: iniciarDesabilitado ? 0.5 : 1, transition: 'opacity 0.2s',
                      }}
                    >
                      Iniciar
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function EstadoVazio({ icone, texto, girando = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 28, animation: girando ? 'spin 1s linear infinite' : 'none' }}>{icone}</span>
      <p style={{ margin: 0, fontSize: '0.82rem', textAlign: 'center' }}>{texto}</p>
    </div>
  );
}
