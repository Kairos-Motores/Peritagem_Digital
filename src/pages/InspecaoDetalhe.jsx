import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataverse } from '../hooks/useDataverse';
import { useInspecao, MAX_PERITAGENS_ABERTAS } from '../contexts/InspecaoContext';
import TopBar from '../components/navigation/TopBar';
import { FilledButton, OutlinedButton } from '../components/ui/MdButton';
import { ElevatedCard } from '../components/ui/MdCard';
import LoadingScreen from '../components/ui/LoadingScreen';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import AlbumFotos from '../components/forms/AlbumFotos';
import { useOffline } from '../contexts/OfflineContext';
import { obterInspecaoPorOS } from '../db/offlineStore';
import { db } from '../db/fila';

// =============== Ícones (corrigidos) ===============
const infoIcons = {
  'Cliente': 'person',
  'Área': 'category',
  'Nº Série': 'tag',
  'OS Retorno': 'assignment_return',
  'Tensão': 'bolt',
  'Corrente': 'electric_bolt',
  'Modelo': 'precision_manufacturing',
  'Fabricante': 'factory',
  'Carcaça': 'hardware',
  'Potência (CV)': 'speed',
  'Potência (kW)': 'bolt',
  'Tag Cliente': 'label',
  'RPM': 'rotate_right',
  'Polos': 'donut_large',
  'Classe': 'school',
  'FS': 'shield',
  'IP': 'water_drop',
  'CAT': 'warning',
  'REG': 'engineering',
  'FC': 'trending_up',
  'Frequência': 'waves',
  'Peso': 'monitor_weight',
  'Nº REQ': 'request_quote',
  'Tag Kairós': 'bookmark',
  'Comprimento': 'straighten',
  'Largura': 'width',
  'Altura': 'height',
  'ME': 'precision_manufacturing',
  'Peritador': 'badge',
  'Mecânico': 'build',
};

function InfoCard({ label, value, delay = 0 }) {
  if (!value) return null;
  const icon = infoIcons[label] || 'info';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 16,
        backgroundColor: 'var(--md-sys-color-surface-variant)',
        color: 'var(--md-sys-color-on-surface-variant)',
        boxShadow: 'var(--md-sys-elevation-1)',
        minWidth: 0,
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--md-sys-color-primary)', flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, color: 'var(--md-sys-color-on-surface-variant)' }}>
          {label}
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--md-sys-color-on-surface)', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.3 }}>
          {value}
        </div>
      </div>
    </motion.div>
  );
}

// =============== CORES DOS CHIPS ===============
const CORES_OPCAO = {
  'Bom': '#2E7D32',
  'Recuperar': '#F9A825',
  'Substituir': '#C62828',
  'Fornecer': '#1565C0',
};

function ItemCard({ item, index, onViewObservacao }) {
  const tipolinha = item.cr4a1_tipolinha?.toString() || '';
  const tiporeferencia = item.cr4a1_tiporeferencia?.toString() || '';

  // Quantidades
  const quantStr = item.cr4a1_var_quant || '';
  const quantPairs = quantStr.split(';').filter(Boolean).map(p => {
    const [op, qty] = p.split(':');
    return { opcao: op, quantidade: parseInt(qty) || 0 };
  });

  // Referências
  let refObj = {};
  try { refObj = JSON.parse(item.cr4a1_referencia || '{}'); } catch (e) {}
  const refPairs = Object.entries(refObj).map(([key, value]) => ({ opcao: key, quantidade: parseInt(value) || 0 }));

  // Aplicar filtro Bool nas quantidades
  const opcoesVisiveis = tipolinha.includes('Bool')
    ? quantPairs.filter(p => p.quantidade > 0)
    : quantPairs;

  // Aplicar filtro Bool nas referências
  const refsVisiveis = tiporeferencia.includes('Bool')
    ? refPairs.filter(p => p.quantidade > 0)
    : refPairs;

  const isMultQuant = tipolinha.includes('Mult');
  const isMultRef = tiporeferencia.includes('Mult');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <ElevatedCard
        style={{
          padding: 16,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderRadius: 16,
          backgroundColor: 'var(--md-sys-color-surface)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          boxShadow: 'var(--md-sys-elevation-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--md-sys-color-primary)', lineHeight: 1.3, overflowWrap: 'anywhere', wordBreak: 'break-word', flex: 1 }}>
            {item.cr4a1_descricao || item.cr4a1_item || 'Item sem nome'}
          </h4>
          {item.cr4a1_observacao && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewObservacao?.(item); }}
              title="Ver observação"
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                backgroundColor: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)',
                cursor: 'pointer', padding: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sticky_note_2</span>
            </button>
          )}
        </div>

        {/* Chips de quantidades */}
        {opcoesVisiveis.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {opcoesVisiveis.map((p, idx) => {
              const valor = p.quantidade;
              const opcao = p.opcao;
              const cor = CORES_OPCAO[opcao] || null;
              const isZero = valor === 0;

              const baseStyle = {
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 500,
                lineHeight: 1.3,
                transition: 'opacity 0.2s',
              };

              if (tipolinha.includes('Bool')) {
                return (
                  <span key={idx} style={{ ...baseStyle, backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                    {opcao}
                  </span>
                );
              }

              if (isMultQuant) {
                let style = { ...baseStyle };
                if (cor && valor > 0) {
                  style.backgroundColor = cor;
                  style.color = '#fff';
                } else if (valor > 0) {
                  style.backgroundColor = 'var(--md-sys-color-primary-container)';
                  style.color = 'var(--md-sys-color-on-primary-container)';
                } else {
                  style.backgroundColor = 'var(--md-sys-color-surface-variant)';
                  style.color = 'var(--md-sys-color-on-surface-variant)';
                  style.opacity = 0.4;
                }
                return <span key={idx} style={style}>{opcao}: {valor}</span>;
              }

              return (
                <span key={idx} style={{ ...baseStyle, backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                  {opcao}: {valor}
                </span>
              );
            })}
          </div>
        )}

        {tipolinha.includes('Bool') && opcoesVisiveis.length === 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6 }}>Nenhuma opção selecionada</span>
        )}

        {/* Chips de referências (mesmo tratamento) */}
        {refsVisiveis.length > 0 && (
          <div style={{ marginTop: 2 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', display: 'block', marginBottom: 4 }}>
              REFERÊNCIA
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {refsVisiveis.map((p, idx) => {
                const valor = p.quantidade;
                const opcao = p.opcao;
                const cor = CORES_OPCAO[opcao] || null;
                const isZero = valor === 0;

                const baseStyle = {
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  transition: 'opacity 0.2s',
                };

                if (tiporeferencia.includes('Bool')) {
                  return (
                    <span key={idx} style={{ ...baseStyle, backgroundColor: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)' }}>
                      {opcao}
                    </span>
                  );
                }

                if (isMultRef) {
                  let style = { ...baseStyle };
                  if (cor && valor > 0) {
                    style.backgroundColor = cor;
                    style.color = '#fff';
                  } else if (valor > 0) {
                    style.backgroundColor = 'var(--md-sys-color-tertiary-container)';
                    style.color = 'var(--md-sys-color-on-tertiary-container)';
                  } else {
                    style.backgroundColor = 'var(--md-sys-color-surface-variant)';
                    style.color = 'var(--md-sys-color-on-surface-variant)';
                    style.opacity = 0.4;
                  }
                  return <span key={idx} style={style}>{opcao}: {valor}</span>;
                }

                return (
                  <span key={idx} style={{ ...baseStyle, backgroundColor: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)' }}>
                    {opcao}: {valor}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {tiporeferencia.includes('Bool') && refsVisiveis.length === 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6, marginTop: 4 }}>Nenhuma referência selecionada</span>
        )}
      </ElevatedCard>
    </motion.div>
  );
}

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
  const [observacaoSelecionada, setObservacaoSelecionada] = useState(null);
  const [readonly, setReadonly] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState(null);

  const username = sessionStorage.getItem('dv_username');
  const userToken = sessionStorage.getItem('dv_token');

  const mergeWithModel = (itensArray, modeloArray) => {
    return itensArray.map(item => {
      const modelo = modeloArray.find(m => m.cr4a1_item === item.cr4a1_item);
      const tipolinha = item.cr4a1_tipolinha || (modelo?.cr4a1_tipolinha) || '';
      const tiporeferencia = item.cr4a1_tiporeferencia || (modelo?.cr4a1_tiporeferencia) || '';
      return { ...item, cr4a1_tipolinha: tipolinha, cr4a1_tiporeferencia: tiporeferencia };
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        let modeloItens = [];
        try { modeloItens = await db.modelo.toArray(); } catch (e) {}

        if (modoOffline) {
          const inspecao = await obterInspecaoPorOS(os);
          if (!inspecao) {
            toastError('Inspeção não encontrada offline.');
            navigate('/home');
            return;
          }
          setCabecalho(inspecao.cabecalho || {});
          setFotos(inspecao.fotos || []);
          setReadonly(inspecao.cabecalho?.cr4a1_status === 'Concluída');

          const respostas = inspecao.respostas || {};
          const itensCombinados = Object.values(respostas).map(resp => {
            const modeloItem = modeloItens.find(m => m.cr4a1_item === resp.item_id);
            const base = {
              cr4a1_peritagem_b04id: resp.item_id,
              cr4a1_item: resp.item_id,
              cr4a1_descricao: resp.descricao || 'Item sem descrição',
              cr4a1_tipo: resp.tipo || '',
              cr4a1_observacao: resp.observacao || '',
              cr4a1_var_quant: Object.entries(resp.quantidades || {}).map(([k,v]) => `${k}:${v}`).join(';'),
              cr4a1_referencia: JSON.stringify(resp.referencia || {}),
              cr4a1_tipolinha: resp.tipolinha || (modeloItem?.cr4a1_tipolinha) || '',
              cr4a1_tiporeferencia: resp.tiporeferencia || (modeloItem?.cr4a1_tiporeferencia) || '',
            };
            if (modeloItem) {
              base.cr4a1_peritagem_b04id = modeloItem.cr4a1_peritagem_b04id || base.cr4a1_peritagem_b04id;
              base.cr4a1_item = modeloItem.cr4a1_item;
              base.cr4a1_descricao = modeloItem.cr4a1_descricao;
              base.cr4a1_tipo = modeloItem.cr4a1_tipo;
            }
            return base;
          });
          setItens(itensCombinados);
          setLoading(false);
          return;
        }

        // Online
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
        const itsCompletos = mergeWithModel(its || [], modeloItens);
        setItens(itsCompletos);
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
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

  const handleViewFoto = (foto) => setSelectedFoto(foto);
  const closeFoto = () => setSelectedFoto(null);

  const handleUpdateFotos = async () => {
    if (modoOffline) {
      const inspecao = await obterInspecaoPorOS(os);
      setFotos(inspecao?.fotos || []);
    } else {
      try {
        const fts = await getFotos(os);
        setFotos(fts || []);
      } catch (err) { console.error('Erro ao recarregar fotos:', err); }
    }
  };

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
    if (tipoFiltro) lista = lista.filter(item => item.cr4a1_tipo === tipoFiltro);
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase();
      lista = lista.filter(item => (item.cr4a1_descricao || '').toLowerCase().includes(termo));
    }
    return lista;
  }, [itens, tipoFiltro, termoBusca]);

  if (loading) return <LoadingScreen message="Carregando detalhes" />;

  const albumFotos = fotos.filter(f => /_\d+\.jpg$/.test(f.name));

  const cabecalhoFields = cabecalho ? [
    { label: 'Cliente', value: cabecalho.cr4a1_cliente },
    { label: 'Área', value: cabecalho.cr4a1_area },
    { label: 'Nº Série', value: cabecalho.cr4a1_n_serie },
    { label: 'OS Retorno', value: cabecalho.cr4a1_os_retorno },
    { label: 'Tensão', value: cabecalho.cr4a1_tensao },
    { label: 'Corrente', value: cabecalho.cr4a1_corrente },
    { label: 'Modelo', value: cabecalho.cr4a1_modelo },
    { label: 'Fabricante', value: cabecalho.cr4a1_fabricante },
    { label: 'Carcaça', value: cabecalho.cr4a1_carcaca },
    { label: 'Potência (CV)', value: cabecalho.cr4a1_potencia_cv },
    { label: 'Potência (kW)', value: cabecalho.cr4a1_potencia_kw },
    { label: 'Tag Cliente', value: cabecalho.cr4a1_tag_cliente },
    { label: 'RPM', value: cabecalho.cr4a1_rpm },
    { label: 'Polos', value: cabecalho.cr4a1_polos },
    { label: 'Classe', value: cabecalho.cr4a1_classe },
    { label: 'FS', value: cabecalho.cr4a1_fs },
    { label: 'IP', value: cabecalho.cr4a1_ip },
    { label: 'CAT', value: cabecalho.cr4a1_cat },
    { label: 'REG', value: cabecalho.cr4a1_reg },
    { label: 'FC', value: cabecalho.cr4a1_fc },
    { label: 'Frequência', value: cabecalho.cr4a1_frequencia },
    { label: 'Peso', value: cabecalho.cr4a1_peso },
    { label: 'Nº REQ', value: cabecalho.cr4a1_n_req },
    { label: 'Tag Kairós', value: cabecalho.cr4a1_tag_kairos },
    { label: 'Comprimento', value: cabecalho.cr4a1_comprimento },
    { label: 'Largura', value: cabecalho.cr4a1_largura },
    { label: 'Altura', value: cabecalho.cr4a1_altura },
    { label: 'ME', value: cabecalho.cr4a1_me },
    { label: 'Peritador', value: cabecalho.cr4a1_peritador },
    { label: 'Mecânico', value: cabecalho.cr4a1_mecanico },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}>
      <TopBar title={`OS: ${os}`} />
      <div className="page-content" style={{ paddingBottom: 24 }}>
        {cabecalho && (
          <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)' }}>Dados da Peritagem</h2>
              {cabecalho.cr4a1_status && (
                <span style={{
                  padding: '4px 14px',
                  borderRadius: 20,
                  backgroundColor: cabecalho.cr4a1_status === 'Concluída'
                    ? 'var(--md-sys-color-primary)'
                    : 'var(--md-sys-color-surface-variant)',
                  color: cabecalho.cr4a1_status === 'Concluída' ? '#fff' : 'var(--md-sys-color-on-surface-variant)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  {cabecalho.cr4a1_status}
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}>
              {cabecalhoFields.map((field, i) => (
                <InfoCard key={field.label} label={field.label} value={field.value} delay={i * 0.02} />
              ))}
            </div>

            {cabecalho.cr4a1_data_peritagem && (
              <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: 8 }}>
                Início: {new Date(cabecalho.cr4a1_data_peritagem).toLocaleString()}
                {cabecalho.cr4a1_data_peritagem_fim && ` – Fim: ${new Date(cabecalho.cr4a1_data_peritagem_fim).toLocaleString()}`}
              </p>
            )}

            <OutlinedButton
              onClick={() => navigate(`/cabecalho?os=${encodeURIComponent(os)}&cliente=${encodeURIComponent(cabecalho?.cr4a1_cliente || '')}`)}
              style={{ width: '100%', marginTop: 16 }}
            >
              Editar Cabeçalho
            </OutlinedButton>

            {cabecalho.cr4a1_status === 'Em andamento' && (
              <FilledButton
                onClick={() => {
                  const cabecalhoId = cabecalho.cr4a1_peritagem_cabecalhoid;
                  const abriu = retomarInspecao(os, cabecalhoId, cabecalho?.cr4a1_filial || '', cabecalho?.cr4a1_cliente || '');
                  if (!abriu) {
                    toastError(`Você já tem ${MAX_PERITAGENS_ABERTAS} peritagens abertas. Feche uma antes de continuar outra.`);
                    return;
                  }
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

        <h2 style={{ color: 'var(--md-sys-color-on-surface)', marginTop: 32, marginBottom: 12, fontSize: '1.2rem' }}>
          Itens Avaliados
        </h2>
        {itens.length === 0 && (
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Nenhum item registrado.</p>
        )}

        {itens.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: 10, color: 'var(--md-sys-color-on-surface-variant)', fontSize: 20 }}>
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
                }}
              />
            </div>
            <motion.div layout style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <motion.button layout onClick={() => setTipoFiltro(null)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: '1.5px solid var(--md-sys-color-outline)',
                  backgroundColor: tipoFiltro === null ? 'var(--md-sys-color-primary)' : 'transparent',
                  color: tipoFiltro === null ? '#fff' : 'var(--md-sys-color-on-surface)',
                  fontWeight: tipoFiltro === null ? 600 : 400, cursor: 'pointer', fontSize: '0.8rem',
                }}>
                Todos
              </motion.button>
              {tipos.map(tipo => (
                <motion.button layout key={tipo} onClick={() => setTipoFiltro(tipo)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20,
                    border: '1.5px solid var(--md-sys-color-outline)',
                    backgroundColor: tipoFiltro === tipo ? 'var(--md-sys-color-primary)' : 'transparent',
                    color: tipoFiltro === tipo ? '#fff' : 'var(--md-sys-color-on-surface)',
                    fontWeight: tipoFiltro === tipo ? 600 : 400, cursor: 'pointer', fontSize: '0.8rem',
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {tipo.toLowerCase().includes('peça') ? 'build' : tipo.toLowerCase().includes('serviço') ? 'design_services' : tipo.toLowerCase().includes('elétrico') ? 'bolt' : 'category'}
                  </span>
                  <span>{tipo}</span>
                </motion.button>
              ))}
            </motion.div>
          </div>
        )}

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
                <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  <AnimatePresence>
                    {itensVisiveis.map((item, idx) => (
                      <ItemCard key={item.cr4a1_peritagem_b04id} item={item} index={idx} onViewObservacao={setObservacaoSelecionada} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })
        ) : (
          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            <AnimatePresence>
              {itensFiltrados.map((item, idx) => (
                <ItemCard key={item.cr4a1_peritagem_b04id} item={item} index={idx} onViewObservacao={setObservacaoSelecionada} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedFoto && (
          <motion.div
            className="modal-overlay"
            onClick={closeFoto}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, touchAction: 'none',
            }}
            onTouchStart={(e) => {
              e.currentTarget.dataset.startX = e.touches[0].clientX;
              e.currentTarget.dataset.startY = e.touches[0].clientY;
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
                if (diffX < 0 && idx < albumFotos.length - 1) setSelectedFoto(albumFotos[idx + 1]);
                else if (diffX > 0 && idx > 0) setSelectedFoto(albumFotos[idx - 1]);
              }
            }}
          >
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <button onClick={closeFoto} style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', padding: 8, zIndex: 10 }}>
                ✕
              </button>
              <img src={selectedFoto.url} alt={selectedFoto.name} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} draggable="false" />
              {albumFotos.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); const idx = albumFotos.findIndex(f => f.id === selectedFoto.id); if (idx > 0) setSelectedFoto(albumFotos[idx - 1]); }}
                    disabled={albumFotos.findIndex(f => f.id === selectedFoto.id) === 0}
                    style={{ position: 'absolute', left: -50, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', opacity: 0.8, padding: '0 12px' }}>
                    ‹
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); const idx = albumFotos.findIndex(f => f.id === selectedFoto.id); if (idx < albumFotos.length - 1) setSelectedFoto(albumFotos[idx + 1]); }}
                    disabled={albumFotos.findIndex(f => f.id === selectedFoto.id) === albumFotos.length - 1}
                    style={{ position: 'absolute', right: -50, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', opacity: 0.8, padding: '0 12px' }}>
                    ›
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de observação */}
      <AnimatePresence>
        {observacaoSelecionada && (
          <motion.div
            onClick={() => setObservacaoSelecionada(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                position: 'relative', width: '100%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto',
                backgroundColor: 'var(--md-sys-color-surface)', borderRadius: 20, padding: 20,
                boxShadow: 'var(--md-sys-elevation-3)',
              }}
            >
              <button
                onClick={() => setObservacaoSelecionada(null)}
                style={{
                  position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                  color: 'var(--md-sys-color-on-surface-variant)', fontSize: '1.4rem', cursor: 'pointer', padding: 4, lineHeight: 1,
                }}
              >
                ✕
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingRight: 24 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-primary)' }}>sticky_note_2</span>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--md-sys-color-on-surface)', overflowWrap: 'anywhere' }}>
                  {observacaoSelecionada.cr4a1_descricao || observacaoSelecionada.cr4a1_item || 'Observação'}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {observacaoSelecionada.cr4a1_observacao}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}