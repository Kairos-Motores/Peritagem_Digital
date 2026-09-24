import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useInspecao } from '../contexts/InspecaoContext';
import { useNavigate } from 'react-router-dom';
import { FilledButton, OutlinedButton } from '../components/ui/MdButton';
import TopBar from '../components/navigation/TopBar';
import AbaPeritagens from '../components/navigation/AbaPeritagens';
import ModeloItem from '../components/forms/ModeloItem';
import CameraCapture from '../components/forms/CameraCapture';
import { useDataverse } from '../hooks/useDataverse';
import LoadingScreen from '../components/ui/LoadingScreen';
import { useToast } from '../hooks/useToast';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../assets/Medro llogo horizontal-Medro.svg';
import { useOffline } from '../contexts/OfflineContext';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import { useFirstTimeTips } from '../hooks/useFirstTimeTips';
import { useModeloOffline } from '../hooks/useModeloOffline';
import { salvarInspecaoOffline, obterInspecaoPorOS } from '../db/offlineStore';
import { cabecalhoCompleto } from '../utils/cabecalho';
import { filtrarItensPorModelo } from '../utils/modelo';

function formatDistanceToNow(date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes === 1) return 'há 1 minuto';
  return `há ${minutes} minutos`;
}

export default function Checklist() {
  const { inspecaoAtual } = useInspecao();
  const navigate = useNavigate();
  const { success, error, info } = useToast();
  const { salvarTipo, updateStatusCabecalho, getItensByOS, getCabecalhoByOS } = useDataverse();
  const { modoOffline } = useOffline();
  const { playSuccess, playComplete, vibrate, playClick } = useAudioFeedback();
  const { show: showTips, markSeen } = useFirstTimeTips();
  const { itensModelo: todosItensModelo, loading: modeloLoading } = useModeloOffline();

  const [respostas, setRespostas] = useState({});
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [tiposSalvos, setTiposSalvos] = useState([]);
  const [ultimaResposta, setUltimaResposta] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvoBg, setSalvoBg] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastModified, setLastModified] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  // Mapa de fotos por item para exibição de miniaturas
  const [fotos, setFotos] = useState({}); // { [itemId]: [ { id, thumbnail, nome, ... } ] }
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Pesquisa e filtros
  const [termoBuscaItem, setTermoBuscaItem] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Colapsa tipos/progresso/busca em telas de celular e tablet, pra não
  // obrigar a rolar a tela toda só pra ver os itens do checklist. Lembra a
  // preferência entre sessões (é uma escolha de layout do peritador, não
  // dado da peritagem).
  const [headerColapsado, setHeaderColapsado] = useState(() => localStorage.getItem('kairos_checklist_header_colapsado') === 'true');
  const alternarHeaderColapsado = () => {
    setHeaderColapsado(prev => {
      const proximo = !prev;
      localStorage.setItem('kairos_checklist_header_colapsado', String(proximo));
      return proximo;
    });
  };

  const [fotoTempItemId, setFotoTempItemId] = useState(null);
  const listaItensRef = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const os = inspecaoAtual?.os;
  const userToken = sessionStorage.getItem('dv_token');
  // Guarda de qual OS o cabeçalho já foi validado e qual o modelo de
  // peritagem dela. Ao trocar de OS, `cabecalhoValidado` volta a ser false
  // sozinho até a nova OS ser validada (o modelo, e portanto a lista de
  // itens, pode ser outro).
  const [validacao, setValidacao] = useState({ os: null, modeloId: '' });
  const cabecalhoValidado = !!os && validacao.os === os;
  // Modelo de peritagem gravado no cabeçalho define quais linhas da b01
  // aparecem. Vazio (peritagens antigas) = todas as linhas; linha da b01 sem
  // modelo aparece em qualquer modelo.
  const modeloPeritagemId = cabecalhoValidado ? validacao.modeloId : '';
  const itensModelo = useMemo(
    () => (cabecalhoValidado ? filtrarItensPorModelo(todosItensModelo, modeloPeritagemId) : []),
    [cabecalhoValidado, todosItensModelo, modeloPeritagemId]
  );

  // Bloqueia o checklist enquanto o cabeçalho não estiver completo
  // (fecha o atalho de "Continuar Inspeção" indo direto pro checklist)
  useEffect(() => {
    if (!os) return;
    const validar = (modeloId = '') => setValidacao({ os, modeloId });
    let ativo = true;
    const bloquear = () => {
      error('Complete o cabeçalho antes de iniciar o checklist.');
      navigate(`/cabecalho?os=${encodeURIComponent(os)}&cliente=${encodeURIComponent(inspecaoAtual?.cliente || '')}`, { replace: true });
    };
    if (modoOffline) {
      obterInspecaoPorOS(os).then(inspecao => {
        if (!ativo) return;
        if (!cabecalhoCompleto(inspecao?.cabecalho)) bloquear();
        else validar(inspecao.cabecalho.cr4a1_modeloperitagem || '');
      }).catch(() => validar());
    } else {
      getCabecalhoByOS(os).then(cab => {
        if (!ativo) return;
        if (!cabecalhoCompleto(cab)) bloquear();
        else validar(cab.cr4a1_modeloperitagem || '');
      }).catch(() => validar());
    }
    return () => { ativo = false; };
  }, [os, modoOffline]);

  // Aviso ao fechar a aba/janela
  useEffect(() => {
    const handler = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => { if (dirty) setLastModified(new Date()); }, [dirty]);

  const isRespostaCompleta = (resposta) => {
    if (!resposta) return false;
    const temQuantidade = Object.values(resposta.quantidades || {}).some(v => v > 0);
    const refExistente = Object.keys(resposta.referencia || {}).length > 0;
    const temReferencia = refExistente ? Object.values(resposta.referencia).some(v => v > 0) : true;
    return temQuantidade && temReferencia;
  };

  useEffect(() => {
    if (!os) return;
    if (modoOffline) {
      obterInspecaoPorOS(os).then(inspecao => {
        if (inspecao) {
          setRespostas(inspecao.respostas || {});
          const tiposPersistidos = new Set();
          Object.values(inspecao.respostas || {}).forEach(r => {
            const modeloItem = itensModelo.find(m => m.cr4a1_item === r.item_id);
            if (modeloItem) tiposPersistidos.add(modeloItem.cr4a1_tipo);
          });
          setTiposSalvos([...tiposPersistidos]);

          // Carrega fotos do IndexedDB – estrutura já contém id, url, name
          const fotosPorItem = {};
          if (inspecao.fotos) {
            inspecao.fotos.forEach(f => {
              if (!fotosPorItem[f.itemId]) fotosPorItem[f.itemId] = [];
              fotosPorItem[f.itemId].push({
                id: f.id,
                thumbnail: f.url || f.base64,
                nome: f.name || f.nomeArquivo,
                itemId: f.itemId,
              });
            });
          }
          setFotos(fotosPorItem);
        }
      }).catch(console.error);
      return;
    }
    // Online
    if (itensModelo.length === 0) return;
    getItensByOS(os).then(itensSalvos => {
      const respostasIniciais = {};
      const tiposPersistidos = new Set();
      itensSalvos.forEach(item => {
        const quantObj = {};
        const pares = (item.cr4a1_var_quant || '').split(';');
        pares.forEach(p => { const [op, qty] = p.split(':'); if (op && !isNaN(qty)) quantObj[op] = parseInt(qty); });
        let refObj = {};
        try { if (item.cr4a1_referencia) refObj = JSON.parse(item.cr4a1_referencia); } catch (e) {}
        const completo = (() => {
          const temQtd = Object.values(quantObj).some(v => v > 0);
          const refKeys = Object.keys(refObj).length > 0;
          const temRef = refKeys ? Object.values(refObj).some(v => v > 0) : true;
          return temQtd && temRef;
        })();
        respostasIniciais[item.cr4a1_item] = {
          item_id: item.cr4a1_item, descricao: item.cr4a1_descricao || '', observacao: item.cr4a1_observacao || '',
          quantidades: quantObj, referencia: refObj, tipo: item.cr4a1_tipo || '', peritador: inspecaoAtual?.peritador || '', completo,
        };
        const modeloItem = itensModelo.find(m => m.cr4a1_item === item.cr4a1_item);
        if (modeloItem) tiposPersistidos.add(modeloItem.cr4a1_tipo);
      });
      setRespostas(respostasIniciais);
      setTiposSalvos([...tiposPersistidos]);
      const tipos = [...new Set(itensModelo.map(i => i.cr4a1_tipo).filter(Boolean))];
      if (tipos.length > 0 && !tipoSelecionado) setTipoSelecionado(tipos[0]);
    }).catch(err => console.error(err));
  }, [os, modoOffline, itensModelo]);

  const tipos = useMemo(() => [...new Set(itensModelo.map(i => i.cr4a1_tipo).filter(Boolean))], [itensModelo]);
  const itensFiltrados = useMemo(() => tipoSelecionado ? itensModelo.filter(i => i.cr4a1_tipo === tipoSelecionado) : [], [itensModelo, tipoSelecionado]);

  const itensVisiveis = useMemo(() => {
    let lista = itensFiltrados;
    if (termoBuscaItem.trim()) {
      const termo = termoBuscaItem.toLowerCase();
      lista = lista.filter(item => item.cr4a1_descricao?.toLowerCase().includes(termo));
    }
    if (filtroStatus === 'pendentes') {
      lista = lista.filter(item => !respostas[item.cr4a1_item]?.completo);
    } else if (filtroStatus === 'concluidos') {
      lista = lista.filter(item => respostas[item.cr4a1_item]?.completo);
    }
    return lista;
  }, [itensFiltrados, termoBuscaItem, filtroStatus, respostas]);

  // Listener de scroll
  useEffect(() => {
    const el = listaItensRef.current;
    if (!el) return;
    const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [itensFiltrados.length]);

  // Confirmação ao sair
  const handleBack = () => {
    if (dirty) {
      const confirmLeave = window.confirm('Existem alterações não salvas. Deseja sair?');
      if (!confirmLeave) return;
    }
    navigate(-1);
  };

  const tipoCompleto = (tipo) => {
    const itensDoTipo = itensModelo.filter(i => i.cr4a1_tipo === tipo);
    if (itensDoTipo.length === 0) return false;
    return itensDoTipo.every(item => respostas[item.cr4a1_item]?.completo === true);
  };

  const progressoTipoAtual = useMemo(() => {
    const total = itensFiltrados.length;
    const completos = itensFiltrados.filter(item => respostas[item.cr4a1_item]?.completo).length;
    return { completos, total, percentual: total > 0 ? Math.round((completos / total) * 100) : 0 };
  }, [itensFiltrados, respostas]);

  const marcarTodosComoOK = () => {
    if (!tipoSelecionado) return;
    const novosValores = { ...respostas };
    itensFiltrados.forEach(item => {
      if (!respostas[item.cr4a1_item]?.completo) {
        const opcoes = item.cr4a1_var_quant ? item.cr4a1_var_quant.split(';').map(s => s.trim()).filter(Boolean) : [];
        const primeiraOpcao = opcoes[0] || 'Bom';
        const quantidades = { ...respostas[item.cr4a1_item]?.quantidades };
        opcoes.forEach(op => { quantidades[op] = op === primeiraOpcao ? 1 : 0; });
        novosValores[item.cr4a1_item] = {
          ...respostas[item.cr4a1_item],
          quantidades,
          referencia: respostas[item.cr4a1_item]?.referencia || {},
          observacao: respostas[item.cr4a1_item]?.observacao || '',
          completo: true,
        };
      }
    });
    setRespostas(novosValores);
    setDirty(true);
    info('Itens marcados como OK!');
  };

  const handleItemChange = (item_id, resposta) => {
    const completo = isRespostaCompleta(resposta);
    setRespostas(prev => ({
      ...prev,
      [item_id]: { ...resposta, peritador: inspecaoAtual?.peritador || '', completo },
    }));
    setUltimaResposta(resposta);
    setDirty(true);
  };

  const handleCopiarResposta = (itemId) => {
    if (!ultimaResposta) return;
    setRespostas(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantidades: { ...ultimaResposta.quantidades },
        referencia: { ...ultimaResposta.referencia },
        observacao: ultimaResposta.observacao,
      },
    }));
    setDirty(true);
    info('Resposta copiada!');
  };

  // Atualiza o array de fotos no IndexedDB (offline) com base no estado atual
  const atualizarFotosOffline = async (novoMapaFotos) => {
    const todasFotos = [];
    Object.entries(novoMapaFotos).forEach(([itemId, fotosArr]) => {
      fotosArr.forEach(foto => {
        todasFotos.push({
          id: foto.id,
          itemId,
          url: foto.thumbnail, // url = base64
          name: foto.nome,
          base64: foto.thumbnail,
          nomeArquivo: foto.nome,
        });
      });
    });
    const existente = await obterInspecaoPorOS(os);
    await salvarInspecaoOffline({
      ...(existente || {}),
      os,
      cabecalho: existente?.cabecalho || {},
      respostas: existente?.respostas || {},
      fotos: todasFotos,
    });
  };

  // Remove a última foto de um item
  const handleRemoveFoto = async (itemId) => {
    setFotos(prev => {
      const itemFotos = [...(prev[itemId] || [])];
      itemFotos.pop(); // remove a última
      const novoMapa = { ...prev, [itemId]: itemFotos };
      if (itemFotos.length === 0) delete novoMapa[itemId];
      // Atualiza offline se necessário
      if (modoOffline) {
        atualizarFotosOffline(novoMapa);
      }
      return novoMapa;
    });
  };

  const salvarAtual = async (tipo) => {
    if (!tipo || !os) return;
    const respostasTipo = itensModelo
      .filter(item => item.cr4a1_tipo === tipo && respostas[item.cr4a1_item])
      .map(item => respostas[item.cr4a1_item]);
    if (respostasTipo.length === 0) return;
    try {
      if (modoOffline) {
        const existente = await obterInspecaoPorOS(os);
        // Constrói array de fotos a partir do estado
        const todasFotos = [];
        Object.entries(fotos).forEach(([itemId, fotosArr]) => {
          fotosArr.forEach(foto => {
            todasFotos.push({
              id: foto.id,
              itemId,
              url: foto.thumbnail,
              name: foto.nome,
              base64: foto.thumbnail,
              nomeArquivo: foto.nome,
            });
          });
        });
        const dados = {
          os,
          cabecalho: existente?.cabecalho || {},
          respostas: { ...(existente?.respostas || {}), ...respostas },
          fotos: todasFotos,
        };
        await salvarInspecaoOffline(dados);
        setTiposSalvos(prev => [...new Set([...prev, tipo])]);
        setDirty(false);
      } else {
        await salvarTipo(os, respostasTipo);
        setTiposSalvos(prev => [...new Set([...prev, tipo])]);
        setDirty(false);
      }
    } catch (err) {
      console.error('Erro ao salvar tipo em background:', err);
    }
  };

  const handleMudarTipo = (novoTipo) => {
    if (tipoSelecionado && tipoSelecionado !== novoTipo) {
      salvarAtual(tipoSelecionado).then(() => {
        playSuccess();
        setSalvoBg(true);
        setTimeout(() => setSalvoBg(false), 1500);
      });
    }
    setTipoSelecionado(novoTipo);
    setTimeout(() => {
      if (listaItensRef.current) {
        const primeiroIncompleto = listaItensRef.current.querySelector('.card-interactive:not(.completo)');
        if (primeiroIncompleto) {
          primeiroIncompleto.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 100);
  };

  // Swipe entre tipos
  const onTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStart.current.x;
    const diffY = touch.clientY - touchStart.current.y;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      const idx = tipos.indexOf(tipoSelecionado);
      if (diffX < 0 && idx < tipos.length - 1) {
        handleMudarTipo(tipos[idx + 1]);
      } else if (diffX > 0 && idx > 0) {
        handleMudarTipo(tipos[idx - 1]);
      }
    }
  };

  const handleSalvarTipo = async () => {
    if (!tipoSelecionado || !os) return;
    setSalvando(true);
    await salvarAtual(tipoSelecionado);
    setSalvando(false);
    playSuccess();
    success(`Tipo "${tipoSelecionado}" salvo!`);
  };

  const handleConcluir = async () => {
    if (!tipos.every(tipo => tipoCompleto(tipo))) {
      error('Preencha todos os itens de cada tipo.');
      return;
    }
    if (modoOffline) {
      for (const tipo of tipos) {
        await salvarAtual(tipo);
      }
      success('Inspeção salva offline! Será sincronizada quando houver rede.');
      navigate('/home');
      return;
    }
    for (const tipo of tipos) {
      await salvarAtual(tipo);
    }
    try {
      if (inspecaoAtual.cabecalhoId) await updateStatusCabecalho(inspecaoAtual.cabecalhoId, 'Concluída');
      const inspecaoCompleta = {
        ...inspecaoAtual,
        respostas: Object.values(respostas),
        fotos: inspecaoAtual?.fotos || [],
        dataConclusao: new Date().toISOString(),
      };
      setDirty(false);
      playComplete();
      success('Inspeção concluída!');
      setTimeout(() => navigate('/home'), 600);
    } catch (err) {
      error('Erro ao concluir.');
    }
  };

  const handleTirarFotoItem = (itemId) => {
    setFotoTempItemId(itemId);
  };

  const salvarFotoCapturada = async (base64) => {
    if (!fotoTempItemId) return;
    const itemId = fotoTempItemId;
    try {
      const guid = crypto.randomUUID().slice(0, 6);
      const nomeArquivo = `${itemId}_temp_${guid}.jpg`;

      const novaFoto = {
        id: guid,
        itemId,
        thumbnail: base64,      // mantido para miniaturas
        nome: nomeArquivo,
        url: base64,            // campo que AlbumFotos espera
        name: nomeArquivo,      // campo que AlbumFotos espera
        base64,                 // compatibilidade
        nomeArquivo,
      };

      // Atualiza estado local de fotos (miniatura)
      setFotos(prev => {
        const novasFotos = [...(prev[itemId] || []), novaFoto];
        return { ...prev, [itemId]: novasFotos };
      });

      if (modoOffline) {
        const existente = await obterInspecaoPorOS(os);
        const fotosSalvas = [...(existente?.fotos || []), {
          id: guid,
          itemId,
          url: base64,
          name: nomeArquivo,
          base64,
          nomeArquivo,
        }];
        await salvarInspecaoOffline({
          ...(existente || {}),
          os,
          cabecalho: existente?.cabecalho || {},
          respostas: existente?.respostas || {},
          fotos: fotosSalvas,
        });
        success('Foto armazenada offline!');
      } else {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/upload-foto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
          body: JSON.stringify({
            os, filial: inspecaoAtual?.filial || '', cliente: inspecaoAtual?.cliente || '',
            fotoBase64: base64, nomeArquivo,
          }),
        });
        if (!res.ok) throw new Error('Falha no upload');
        success('Foto adicionada ao item!');
      }
    } catch (err) {
      error('Erro ao enviar foto.');
    } finally {
      setFotoTempItemId(null);
    }
  };

  const handleItemComplete = (itemId) => { vibrate(); };

  const handleNextItem = useCallback(() => {
    setFocusedIndex(prev => {
      const next = prev + 1;
      if (next < itensFiltrados.length) {
        setTimeout(() => {
          const element = document.querySelector(`[data-item-index="${next}"] .stepper-input`);
          if (element) element.focus();
        }, 50);
        return next;
      }
      return prev;
    });
  }, [itensFiltrados.length]);

  const handleViewFoto = (foto) => { setFotoAmpliada(foto); };

  const SalvoIndicator = () =>
    salvoBg ? (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)',
          padding: '4px 16px', borderRadius: 20, fontSize: '0.8rem', zIndex: 1000, boxShadow: 'var(--md-sys-elevation-1)',
        }}
      >
        Tipo salvo
      </motion.div>
    ) : null;

  if (!inspecaoAtual) return <p>Inspeção não encontrada.</p>;
  if (!cabecalhoValidado) return <LoadingScreen message="Verificando cabeçalho" />;
  if (!modoOffline && modeloLoading) return <LoadingScreen message="Preparando checklist" />;
  if (modoOffline && itensModelo.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}>
        <TopBar title={`OS: ${os}`} logoSrc={Logo} onBack={handleBack} />
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Os itens do checklist não estão disponíveis offline. Por favor, conecte-se à internet para carregar os modelos.</p>
        </div>
      </div>
    );
  }

  // Cor verde para botões de tipo completo
  const COR_COMPLETO = '#2E7D32';

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}
    >
      {showTips && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'none' }}>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            onClick={markSeen}
            style={{
              position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)',
              backgroundColor: 'var(--md-sys-color-primary)', color: '#fff', border: 'none',
              borderRadius: 20, padding: '8px 24px', fontSize: '0.85rem', fontWeight: 500,
              cursor: 'pointer', pointerEvents: 'auto', boxShadow: 'var(--md-sys-elevation-2)', zIndex: 2001,
            }}
          >
            Entendi
          </motion.button>
        </div>
      )}

      <TopBar title={`OS: ${os}`} logoSrc={Logo} onBack={handleBack} />
      <AbaPeritagens salvarAntesDeTrocar={() => salvarAtual(tipoSelecionado)} />
      {modoOffline && (
        <div style={{ padding: '8px 16px', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '0.8rem' }}>
          Modo offline – as alterações serão sincronizadas quando houver conexão.
        </div>
      )}

      {/* Barra-resumo + botão de colapsar tipos/progresso/busca */}
      <button
        type="button"
        onClick={alternarHeaderColapsado}
        aria-expanded={!headerColapsado}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: headerColapsado ? '1px solid var(--md-sys-color-outline-variant)' : 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', minWidth: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--md-sys-color-primary)' }}>category</span>
          {tipoSelecionado ? (
            <>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipoSelecionado}</span>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 400, flexShrink: 0 }}>
                {progressoTipoAtual.completos}/{progressoTipoAtual.total}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 400 }}>Tipos, progresso e busca</span>
          )}
        </span>
        <span
          className="material-symbols-outlined"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: headerColapsado ? 'rotate(0deg)' : 'rotate(180deg)' }}
        >
          expand_more
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!headerColapsado && (
          <motion.div
            key="checklist-header-colapsavel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
      {/* Botões de tipo + Marcar todos OK */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ padding: '12px 16px', display: 'flex', gap: 10, overflowX: 'auto', borderBottom: '1px solid var(--md-sys-color-outline-variant)', alignItems: 'center' }}
      >
        {tipos.map(tipo => {
          const completo = tipoCompleto(tipo);
          const salvo = tiposSalvos.includes(tipo) && !completo;
          const isSelected = tipo === tipoSelecionado;

          // Define as cores com base no estado
          const isVerde = completo;
          const bgColor = isVerde
            ? COR_COMPLETO
            : isSelected
            ? 'var(--md-sys-color-primary)'
            : salvo
            ? 'var(--md-sys-color-primary-container)'
            : 'transparent';

          const textColor = isVerde || isSelected
            ? '#fff'
            : salvo
            ? 'var(--md-sys-color-on-primary-container)'
            : 'var(--md-sys-color-on-surface)';

          const borderColor = isVerde
            ? COR_COMPLETO
            : isSelected
            ? 'var(--md-sys-color-primary)'
            : 'var(--md-sys-color-outline)';

          return (
            <motion.button
              key={tipo}
              onClick={() => handleMudarTipo(tipo)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 16px', borderRadius: 20,
                border: `1.5px solid ${borderColor}`,
                backgroundColor: bgColor,
                color: textColor,
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '0.8rem',
                boxShadow: isSelected ? 'var(--md-sys-elevation-1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 0" }}>
                {tipo.toLowerCase().includes('peça') ? 'build' : tipo.toLowerCase().includes('serviço') ? 'design_services' : tipo.toLowerCase().includes('elétrico') ? 'bolt' : 'category'}
              </span>
              <span>{tipo}</span>
              {completo && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#fff' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                  <span style={{ fontSize: '0.7rem' }}>ok</span>
                </span>
              )}
              {salvo && !completo && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#D97706' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                  <span style={{ fontSize: '0.7rem' }}>salvo</span>
                </span>
              )}
            </motion.button>
          );
        })}
        {tipoSelecionado && !tipoCompleto(tipoSelecionado) && (
          <OutlinedButton
            onClick={marcarTodosComoOK}
            disabled={salvando}
            style={{ padding: '6px 12px', minWidth: 0, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          >
            Marcar todos OK
          </OutlinedButton>
        )}
      </motion.div>

      {/* Barra de progresso + data */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--md-sys-color-surface)', zIndex: 5, padding: '0 16px 8px' }}>
        {tipoSelecionado && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1, height: 4, backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progressoTipoAtual.percentual}%`, height: '100%', backgroundColor: 'var(--md-sys-color-primary)', transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                {progressoTipoAtual.completos}/{progressoTipoAtual.total}
              </span>
            </div>
            {lastModified && (
              <p style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: 2, paddingLeft: 4 }}>
                Última alteração: {formatDistanceToNow(lastModified)}
              </p>
            )}
          </>
        )}
      </div>

      {/* Campo de busca + chips de status */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{ position: 'relative' }}>
          <span
            className="material-symbols-outlined"
            style={{ position: 'absolute', left: 12, top: 10, color: 'var(--md-sys-color-on-surface-variant)', fontSize: 20 }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Buscar item..."
            value={termoBuscaItem}
            onChange={(e) => setTermoBuscaItem(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: 20,
              border: '1px solid var(--md-sys-color-outline)',
              backgroundColor: 'var(--md-sys-color-surface-variant)',
              color: 'var(--md-sys-color-on-surface)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {['todos', 'pendentes', 'concluidos'].map(status => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                border: '1px solid var(--md-sys-color-outline)',
                backgroundColor: filtroStatus === status ? 'var(--md-sys-color-primary-container)' : 'transparent',
                color: filtroStatus === status ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
                fontWeight: filtroStatus === status ? 600 : 400,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {status === 'todos' ? 'Todos' : status === 'pendentes' ? 'Pendentes' : 'Concluídos'}
            </button>
          ))}
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-content" ref={listaItensRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tipoSelecionado}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {itensVisiveis.map((item, index) => {
              const fotosDoItem = fotos[item.cr4a1_item] || [];
              const ultimaFoto = fotosDoItem.length > 0 ? fotosDoItem[fotosDoItem.length - 1] : null;
              return (
                <ModeloItem
                  key={item.cr4a1_item}
                  item={item}
                  onChange={(resp) => handleItemChange(item.cr4a1_item, resp)}
                  initialResposta={respostas[item.cr4a1_item]}
                  onTirarFoto={handleTirarFotoItem}
                  onCopiarResposta={handleCopiarResposta}
                  onItemComplete={handleItemComplete}
                  onStepperClick={playClick}
                  isEditing={editingItem === item.cr4a1_item}
                  onFocusItem={() => { setEditingItem(item.cr4a1_item); setFocusedIndex(index); }}
                  onBlurItem={() => setEditingItem(null)}
                  onNextItem={handleNextItem}
                  ultimaFoto={ultimaFoto}
                  onViewFoto={handleViewFoto}
                  onRemoveFoto={() => handleRemoveFoto(item.cr4a1_item)}
                  fotosCount={fotosDoItem.length}
                  data-item-index={index}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}
        >
          <OutlinedButton
            onClick={handleSalvarTipo}
            disabled={salvando}
            style={{ padding: '8px 20px', minWidth: 0, fontSize: '0.875rem', whiteSpace: 'nowrap' }}
          >
            {salvando ? 'Salvando...' : `Salvar "${tipoSelecionado}"`}
          </OutlinedButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          style={{ marginTop: 24 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={tipos.every(tipo => tipoCompleto(tipo)) ? { scale: [1, 1.03, 1] } : {}}
            transition={tipos.every(tipo => tipoCompleto(tipo)) ? { repeat: Infinity, duration: 1.5 } : {}}
          >
            <FilledButton
              style={{ width: '100%', marginTop: 16 }}
              onClick={handleConcluir}
              disabled={!tipos.every(tipo => tipoCompleto(tipo))}
            >
              Concluir Inspeção
            </FilledButton>
          </motion.div>
        </motion.div>
      </div>

      {/* Botão "Ir para o topo" */}
      {showScrollTop && (
        <motion.button
          onClick={() => listaItensRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            position: 'fixed', bottom: 100, left: 20, width: 40, height: 40,
            borderRadius: '50%', backgroundColor: 'var(--md-sys-color-primary)',
            color: '#fff', border: 'none', boxShadow: 'var(--md-sys-elevation-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
          }}
        >
          <span className="material-symbols-outlined">arrow_upward</span>
        </motion.button>
      )}

      <SalvoIndicator />

      {/* Modal de foto ampliada */}
      {fotoAmpliada && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setFotoAmpliada(null)}
        >
          <img
            src={fotoAmpliada}
            alt="Foto ampliada"
            style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: 8 }}
          />
          <button
            onClick={() => setFotoAmpliada(null)}
            style={{
              position: 'absolute', top: 20, right: 20, background: 'none', border: 'none',
              color: '#fff', fontSize: '2rem', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <CameraCapture
        open={!!fotoTempItemId}
        onClose={() => setFotoTempItemId(null)}
        onCapture={salvarFotoCapturada}
      />
    </div>
  );
}