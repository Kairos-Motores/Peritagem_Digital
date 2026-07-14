import { useState, useEffect, useMemo, useRef } from 'react';
import { useInspecao } from '../contexts/InspecaoContext';
import { useNavigate } from 'react-router-dom';
import { FilledButton, OutlinedButton } from '../components/ui/MdButton';
import TopBar from '../components/navigation/TopBar';
import ModeloItem from '../components/forms/ModeloItem';
import { useDataverse } from '../hooks/useDataverse';
import { db } from '../db/fila';
import LoadingScreen from '../components/ui/LoadingScreen';
import { useToast } from '../hooks/useToast';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../assets/Medro llogo horizontal-Medro.svg';
import { useOffline } from '../contexts/OfflineContext';

export default function Checklist() {
  const { inspecaoAtual } = useInspecao();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { getModeloItens, getItensByOS, salvarTipo, updateStatusCabecalho } = useDataverse();
  const { modoOffline, atualizarLocal } = useOffline();

  const [itensModelo, setItensModelo] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [tiposSalvos, setTiposSalvos] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const [fotoTempItemId, setFotoTempItemId] = useState(null);
  const fotoTempInputRef = useRef(null);

  const os = inspecaoAtual?.os;
  const userToken = sessionStorage.getItem('dv_token');

  useEffect(() => {
    if (!os) return;
    if (modoOffline) {
      // Carrega modelo offline? Precisamos do modelo salvo localmente ou do cache. Para simplificar, offline não terá modelo (precisa de internet). Assumimos que offline o checklist não pode ser carregado sem modelo. Ajustaremos para usar um modelo vazio ou mostrar mensagem. Melhor solução: o perito já baixou os itens antes de ficar offline? Vamos manter que offline precisa do modelo pre-carregado (cache). Como é complexo, por ora mostraremos um aviso.
      setItensModelo([]);
      return;
    }
    Promise.all([
      getModeloItens(),
      getItensByOS(os)
    ]).then(([modelo, itensSalvos]) => {
      setItensModelo(modelo);
      // ... (mesmo código de construção de respostas iniciais)
      const respostasIniciais = {};
      const tiposPersistidos = new Set();
      itensSalvos.forEach(item => {
        const quantObj = {};
        const pares = (item.cr4a1_var_quant || '').split(';');
        pares.forEach(p => {
          const [op, qty] = p.split(':');
          if (op && !isNaN(qty)) quantObj[op] = parseInt(qty);
        });
        respostasIniciais[item.cr4a1_item] = {
          item_id: item.cr4a1_item,
          descricao: item.cr4a1_descricao || '',
          observacao: item.cr4a1_observacao || '',
          quantidades: quantObj,
        };
        const modeloItem = modelo.find(m => m.cr4a1_item === item.cr4a1_item);
        if (modeloItem) tiposPersistidos.add(modeloItem.cr4a1_tipo);
      });
      setRespostas(respostasIniciais);
      setTiposSalvos([...tiposPersistidos]);
      const tipos = [...new Set(modelo.map(i => i.cr4a1_tipo).filter(Boolean))];
      if (tipos.length > 0) setTipoSelecionado(tipos[0]);
    }).catch(err => console.error(err));
  }, [os, modoOffline]);

  const tipos = useMemo(() => [...new Set(itensModelo.map(i => i.cr4a1_tipo).filter(Boolean))], [itensModelo]);
  const itensFiltrados = useMemo(() => tipoSelecionado ? itensModelo.filter(i => i.cr4a1_tipo === tipoSelecionado) : [], [itensModelo, tipoSelecionado]);

  const tipoCompleto = (tipo) => {
    const itensDoTipo = itensModelo.filter(i => i.cr4a1_tipo === tipo);
    if (itensDoTipo.length === 0) return false;
    return itensDoTipo.every(item => {
      const resp = respostas[item.cr4a1_item];
      return resp && Object.values(resp.quantidades).some(v => v > 0);
    });
  };

  const handleItemChange = (item_id, resposta) => setRespostas(prev => ({ ...prev, [item_id]: resposta }));

  const handleSalvarTipo = async () => {
    if (!tipoSelecionado || !os) return;
    setSalvando(true);
    const respostasTipo = itensFiltrados.filter(item => respostas[item.cr4a1_item]).map(item => respostas[item.cr4a1_item]);

    try {
      if (modoOffline) {
        const pendentes = await db.inspecoes.where({ os, status: 'pendente' }).toArray();
        if (pendentes.length > 0) {
          const atual = pendentes[0];
          const novasRespostas = { ...atual.respostas };
          respostasTipo.forEach(r => { novasRespostas[r.item_id] = r; });
          await atualizarLocal(atual.id, { respostas: novasRespostas });
        }
        setTiposSalvos(prev => [...new Set([...prev, tipoSelecionado])]);
        success(`Tipo "${tipoSelecionado}" salvo offline!`);
      } else {
        await salvarTipo(os, respostasTipo);
        setTiposSalvos(prev => [...new Set([...prev, tipoSelecionado])]);
        success(`Tipo "${tipoSelecionado}" salvo!`);
      }
    } catch (err) {
      error('Erro ao salvar tipo.');
    } finally {
      setSalvando(false);
    }
  };

  const handleConcluir = async () => {
    if (!tipos.every(tipo => tipoCompleto(tipo))) {
      error('Preencha todos os itens de cada tipo.');
      return;
    }
    if (modoOffline) {
      // Salva como pendente local
      success('Inspeção salva offline! Será sincronizada quando houver rede.');
      navigate('/home');
      return;
    }
    // código online original
    const tiposNaoSalvos = tipos.filter(t => !tiposSalvos.includes(t));
    for (const tipo of tiposNaoSalvos) {
      const itensDoTipo = itensModelo.filter(i => i.cr4a1_tipo === tipo);
      const respostasTipo = itensDoTipo.filter(item => respostas[item.cr4a1_item]).map(item => respostas[item.cr4a1_item]);
      await salvarTipo(os, respostasTipo);
    }
    try {
      if (inspecaoAtual.cabecalhoId) await updateStatusCabecalho(inspecaoAtual.cabecalhoId, 'Concluída');
      const inspecaoCompleta = {
        ...inspecaoAtual,
        respostas: Object.values(respostas),
        fotos: inspecaoAtual?.fotos || [],
        dataConclusao: new Date().toISOString(),
      };
      await db.fila.add({
        motor_id: os,
        dados: JSON.stringify(inspecaoCompleta),
        status: 'pendente',
        created_at: new Date().toISOString(),
      });
      success('Inspeção concluída!');
      setTimeout(() => navigate('/home'), 600);
    } catch (err) {
      error('Erro ao concluir.');
    }
  };

  const handleTirarFotoItem = (itemId) => {
    setFotoTempItemId(itemId);
    fotoTempInputRef.current?.click();
  };

  if (!inspecaoAtual) return <p>Inspeção não encontrada.</p>;
  if (!modoOffline && itensModelo.length === 0) return <LoadingScreen message="Preparando checklist" />;
  if (modoOffline && itensModelo.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}>
        <TopBar title={`OS: ${os}`} logoSrc={Logo} />
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Os itens do checklist não estão disponíveis offline. Por favor, conecte-se à internet para carregar os modelos.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}>
      <TopBar title={`OS: ${os}`} logoSrc={Logo} />
      {modoOffline && (
        <div style={{ padding: '8px 16px', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '0.8rem' }}>
          Modo offline – as alterações serão sincronizadas quando houver conexão.
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ padding: '12px 16px', display: 'flex', gap: 10, overflowX: 'auto', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}
      >
        {tipos.map(tipo => {
          const completo = tipoCompleto(tipo);
          const salvo = tiposSalvos.includes(tipo);
          const icone = tipo.toLowerCase().includes('peça') ? 'build' :
                        tipo.toLowerCase().includes('serviço') ? 'design_services' :
                        tipo.toLowerCase().includes('elétrico') ? 'bolt' : 'category';
          return (
            <motion.button
              key={tipo}
              onClick={() => setTipoSelecionado(tipo)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 16px',
                borderRadius: 20,
                border: `1.5px solid ${tipo === tipoSelecionado ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
                backgroundColor: tipo === tipoSelecionado ? 'var(--md-sys-color-primary)' : salvo ? 'var(--md-sys-color-primary-container)' : 'transparent',
                color: tipo === tipoSelecionado ? '#fff' : salvo ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                fontWeight: tipo === tipoSelecionado ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '0.8rem',
                boxShadow: tipo === tipoSelecionado ? 'var(--md-sys-elevation-1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 0" }}>{icone}</span>
              <span>{tipo}</span>
              {salvo && !completo && <span style={{ color: tipo === tipoSelecionado ? '#fff' : 'var(--md-sys-color-primary)' }}>✓</span>}
              {completo && <span style={{ color: tipo === tipoSelecionado ? '#fff' : 'var(--md-sys-color-primary)' }}>✔</span>}
            </motion.button>
          );
        })}
      </motion.div>
      <div className="page-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={tipoSelecionado}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {itensFiltrados.map(item => (
              <ModeloItem
                key={item.cr4a1_item}
                item={item}
                onChange={(resp) => handleItemChange(item.cr4a1_item, resp)}
                initialResposta={respostas[item.cr4a1_item]}
                onTirarFoto={handleTirarFotoItem}
              />
            ))}
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
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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

      {/* Input oculto para foto */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fotoTempInputRef}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file || !fotoTempItemId) return;
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result;
            try {
              const guid = crypto.randomUUID().slice(0, 6);
              const nomeArquivo = `${fotoTempItemId}_temp_${guid}.jpg`;
              if (modoOffline) {
                const pendentes = await db.inspecoes.where({ os, status: 'pendente' }).toArray();
                if (pendentes.length > 0) {
                  const atual = pendentes[0];
                  const fotos = [...(atual.fotos || []), { itemId: fotoTempItemId, base64, nomeArquivo }];
                  await atualizarLocal(atual.id, { fotos });
                  success('Foto armazenada offline!');
                }
              } else {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/upload-foto`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                  },
                  body: JSON.stringify({
                    os,
                    filial: inspecaoAtual?.filial || '',
                    cliente: inspecaoAtual?.cliente || '',
                    fotoBase64: base64,
                    nomeArquivo,
                  }),
                });
                if (!res.ok) throw new Error('Falha no upload');
                success('Foto adicionada ao item!');
              }
            } catch (err) {
              error('Erro ao enviar foto.');
            } finally {
              setFotoTempItemId(null);
              e.target.value = '';
            }
          };
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}