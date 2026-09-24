import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInspecao } from '../contexts/InspecaoContext';
import { useDataverse } from '../hooks/useDataverse';
import { FilledButton, OutlinedButton } from '../components/ui/MdButton';
import { useToast } from '../hooks/useToast';
import Logo from "../assets/Medro llogo horizontal-Medro.svg";
import TopBar from '../components/navigation/TopBar';
import AbaPeritagens from '../components/navigation/AbaPeritagens';
import { ElevatedCard } from '../components/ui/MdCard';
import { useOffline } from '../contexts/OfflineContext';
import { salvarInspecaoOffline, obterInspecaoPorOS } from '../db/offlineStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cabecalhoCompleto, camposCompletos, CAMPOS_POR_STEP, CAMPOS_TECNICOS_MODELO } from '../utils/cabecalho';
import { useModelosPeritagem } from '../hooks/useModelosPeritagem';

const STEPS = [
  { id: 'modelo', label: 'Modelo' },
  { id: 'identificacao', label: 'Identificação' },
  { id: 'tecnico', label: 'Dados Técnicos' },
  { id: 'equipe', label: 'Equipe' },
];

function StepHeader({ currentIndex, maxReached, onStepClick }) {
  return (
    <div style={{ display: 'flex', padding: '12px 16px 4px' }}>
      {STEPS.map((step, i) => {
        const atual = i === currentIndex;
        const concluido = i < currentIndex;
        const habilitado = i <= maxReached;
        return (
          <div
            key={step.id}
            onClick={() => habilitado && onStepClick(i)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              cursor: habilitado ? 'pointer' : 'default', opacity: habilitado ? 1 : 0.4,
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: atual ? 'var(--md-sys-color-primary)' : concluido ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-variant)',
              color: atual ? '#fff' : concluido ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
              fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
            }}>
              {concluido ? <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span> : i + 1}
            </div>
            <span style={{
              fontSize: '0.7rem', textAlign: 'center', fontWeight: atual ? 600 : 400,
              color: atual ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
            }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Componente de campo flutuante com animações
// ============================================
function FloatingField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  placeholder = '',
  delay = 0,
  required = false,
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.toString().trim().length > 0;
  const isActive = focused || hasValue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      style={{ marginBottom: 20, position: 'relative' }}
    >
      <label
        style={{
          position: 'absolute',
          left: 16,
          top: isActive ? 8 : 16,
          fontSize: isActive ? '0.75rem' : '0.95rem',
          color: readOnly
            ? 'var(--md-sys-color-on-surface-variant)'
            : focused
            ? 'var(--md-sys-color-primary)'
            : 'var(--md-sys-color-on-surface-variant)',
          fontWeight: isActive ? 500 : 400,
          pointerEvents: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          background: readOnly ? 'var(--md-sys-color-surface-variant)' : 'var(--md-sys-color-surface)',
          padding: '0 4px',
          zIndex: 1,
          borderRadius: 4,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        required={required && !readOnly}
        placeholder={focused && !readOnly ? placeholder : ''}
        onFocus={() => !readOnly && setFocused(true)}
        onBlur={() => !readOnly && setFocused(false)}
        style={{
          width: '100%',
          padding: '20px 16px 8px 16px',
          fontSize: '0.95rem',
          borderRadius: 12,
          border: `2px solid ${
            readOnly
              ? 'var(--md-sys-color-outline)'
              : focused
              ? 'var(--md-sys-color-primary)'
              : 'var(--md-sys-color-outline)'
          }`,
          backgroundColor: readOnly
            ? 'var(--md-sys-color-surface-variant)'
            : 'var(--md-sys-color-surface)',
          color: readOnly
            ? 'var(--md-sys-color-on-surface-variant)'
            : 'var(--md-sys-color-on-surface)',
          outline: 'none',
          boxShadow:
            focused && !readOnly
              ? '0 0 0 3px rgba(var(--md-sys-color-primary-rgb, 0, 0, 0), 0.2)'
              : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
          boxSizing: 'border-box',
          cursor: readOnly ? 'default' : 'text',
          opacity: readOnly ? 0.85 : 1,
        }}
        onMouseEnter={(e) => {
          if (!focused && !readOnly) e.target.style.borderColor = 'var(--md-sys-color-outline-variant)';
        }}
        onMouseLeave={(e) => {
          if (!focused && !readOnly) e.target.style.borderColor = 'var(--md-sys-color-outline)';
        }}
      />
    </motion.div>
  );
}

function ReadOnlyField({ label, value, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      style={{ marginBottom: 20 }}
    >
      <label
        style={{
          display: 'block',
          marginBottom: 4,
          fontWeight: 500,
          fontSize: '0.85rem',
          color: 'var(--md-sys-color-on-surface-variant)',
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        style={{
          width: '100%',
          padding: '14px 16px',
          fontSize: '0.95rem',
          borderRadius: 12,
          border: '1px solid var(--md-sys-color-outline)',
          backgroundColor: 'var(--md-sys-color-surface-variant)',
          color: 'var(--md-sys-color-on-surface)',
          outline: 'none',
          opacity: 0.8,
          boxSizing: 'border-box',
          transition: 'all 0.2s',
        }}
      />
    </motion.div>
  );
}

function AnimatedSelect({ label, name, value, onChange, options, delay = 0, required = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      style={{ marginBottom: 20 }}
    >
      <label
        style={{
          display: 'block',
          marginBottom: 4,
          fontWeight: 500,
          fontSize: '0.85rem',
          color: 'var(--md-sys-color-on-surface-variant)',
        }}
      >
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={{
          width: '100%',
          padding: '14px 16px',
          fontSize: '0.95rem',
          borderRadius: 12,
          border: '1px solid var(--md-sys-color-outline)',
          backgroundColor: 'var(--md-sys-color-surface)',
          color: 'var(--md-sys-color-on-surface)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23666' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: 20,
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--md-sys-color-primary)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--md-sys-color-outline)')}
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </motion.div>
  );
}

export default function Cabecalho() {
  const [searchParams] = useSearchParams();
  const os = searchParams.get('os') || '';
  const clienteInicial = searchParams.get('cliente') || '';
  const { inspecaoAtual, novaInspecao, setCabecalhoId } = useInspecao();
  const navigate = useNavigate();
  const {
    createCabecalho, updateCabecalho, getCabecalhoByOS, getUsuarios, getUsuarioLogado,
    getFilialPeritador, getUltimoCabecalhoPorModelo,
  } = useDataverse();
  const { success, error, info } = useToast();
  const { modoOffline } = useOffline();

  const username = sessionStorage.getItem('dv_username');
  const [mecanicos, setMecanicos] = useState([]);
  const [nomePeritador, setNomePeritador] = useState(username || '');
  const [filial, setFilial] = useState('');
  const [cabecalhoExistenteId, setCabecalhoExistenteId] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [buscandoDados, setBuscandoDados] = useState(false);
  // Depois que o modelo foi gravado no cabeçalho ele não muda mais: o
  // checklist já pode ter respostas de linhas que só existem naquele modelo.
  const [modeloTravado, setModeloTravado] = useState(false);
  const { modelos, loading: modelosLoading } = useModelosPeritagem();
  const formScrollRef = useRef(null);

  const [form, setForm] = useState({
    cr4a1_os: os,
    cr4a1_cliente: clienteInicial,
    cr4a1_area: '',
    cr4a1_n_serie: '',
    cr4a1_os_retorno: '',
    cr4a1_tensao: '',
    cr4a1_corrente: '',
    cr4a1_modelo: '',
    cr4a1_fabricante: '',
    cr4a1_carcaca: '',
    cr4a1_potencia_cv: '',
    cr4a1_potencia_kw: '',
    cr4a1_tag_cliente: '',
    cr4a1_rpm: '',
    cr4a1_polos: '',
    cr4a1_classe: '',
    cr4a1_fs: '',
    cr4a1_ip: '',
    cr4a1_cat: '',
    cr4a1_reg: '',
    cr4a1_fc: '',
    cr4a1_frequencia: '',
    cr4a1_peso: '',
    cr4a1_n_req: '',
    cr4a1_tag_kairos: '',
    cr4a1_comprimento: '',
    cr4a1_largura: '',
    cr4a1_altura: '',
    cr4a1_me: '',
    cr4a1_peritador: nomePeritador,
    cr4a1_mecanico: '',
    cr4a1_filial: '',
    cr4a1_modeloperitagem: '',
  });

  useEffect(() => {
    if (modoOffline) {
      setNomePeritador(username || '');
      setForm(prev => ({ ...prev, cr4a1_peritador: username || '', cr4a1_filial: '' }));
      return;
    }
    if (username) {
      Promise.all([
        getUsuarioLogado(username),
        getFilialPeritador(username),
      ]).then(([userData, filialData]) => {
        const nomeCompleto = userData?.cr4a1_title || username;
        setNomePeritador(nomeCompleto);
        setFilial(filialData || '');
        setForm(prev => ({
          ...prev,
          cr4a1_peritador: nomeCompleto,
          cr4a1_filial: filialData || '',
        }));
      }).catch(() => {
        setForm(prev => ({ ...prev, cr4a1_peritador: username }));
      });
    }
    if (!modoOffline) {
      getUsuarios()
        .then(data => setMecanicos(data?.value || []))
        .catch(console.warn);
    }
  }, [username, modoOffline]);

  // Copia apenas os campos que o formulário conhece — o registro do Dataverse
  // também traz metadados de sistema (ex.: _modifiedonbehalfby_value) que não
  // podem ser reenviados no PATCH sem quebrar a gravação.
  const mesclarCamposConhecidos = (prev, origem) => {
    const atualizado = { ...prev };
    Object.keys(prev).forEach(campo => {
      if (origem[campo] !== undefined && origem[campo] !== null) atualizado[campo] = origem[campo];
    });
    return atualizado;
  };

  // Se já existe cabeçalho para essa OS, carrega os dados para edição
  useEffect(() => {
    if (!os) return;
    if (modoOffline) {
      obterInspecaoPorOS(os).then(inspecao => {
        if (inspecao?.cabecalho && Object.keys(inspecao.cabecalho).length > 0) {
          setForm(prev => mesclarCamposConhecidos(prev, inspecao.cabecalho));
          if (inspecao.cabecalho.cr4a1_modeloperitagem) setModeloTravado(true);
          // Cabeçalho existente: libera navegação livre entre os passos
          if (cabecalhoCompleto(inspecao.cabecalho)) setMaxStepReached(STEPS.length - 1);
        }
      }).catch(console.warn);
      return;
    }
    getCabecalhoByOS(os).then(cab => {
      if (cab) {
        setCabecalhoExistenteId(cab.cr4a1_peritagem_cabecalhoid);
        setForm(prev => mesclarCamposConhecidos(prev, cab));
        if (cab.cr4a1_modeloperitagem) setModeloTravado(true);
        if (cabecalhoCompleto(cab)) setMaxStepReached(STEPS.length - 1);
      }
    }).catch(console.warn);
  }, [os, modoOffline]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Campos que o peritador precisa preencher para liberar o checklist
  // Só existe um modelo cadastrado: já vem selecionado (o peritador ainda
  // vê e confirma no passo).
  const modeloEfetivo = form.cr4a1_modeloperitagem
    || (!modeloTravado && modelos.length === 1 ? modelos[0].cr4a1_id : '');
  const formEfetivo = { ...form, cr4a1_modeloperitagem: modeloEfetivo };
  const formCompleto = cabecalhoCompleto(formEfetivo) && !!modeloEfetivo;
  const passoAtual = STEPS[stepIndex].id;
  const stepAtualCompleto = camposCompletos(formEfetivo, CAMPOS_POR_STEP[passoAtual]);
  const ultimoStep = stepIndex === STEPS.length - 1;

  const irParaStep = (i) => {
    setStepIndex(i);
    formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProximo = () => {
    if (!stepAtualCompleto) return;
    const proximo = Math.min(stepIndex + 1, STEPS.length - 1);
    setMaxStepReached(m => Math.max(m, proximo));
    irParaStep(proximo);
  };

  const handleAnterior = () => irParaStep(Math.max(stepIndex - 1, 0));

  // Busca opcional: procura o cabeçalho mais recente com o mesmo modelo
  // (e fabricante, se já preenchido) e completa os campos técnicos que
  // ainda estiverem vazios — nunca sobrescreve o que o peritador já digitou.
  const buscarDadosAutomaticos = async () => {
    if (!form.cr4a1_modelo?.trim()) {
      error('Informe o modelo antes de buscar.');
      return;
    }
    setBuscandoDados(true);
    try {
      const anterior = await getUltimoCabecalhoPorModelo(form.cr4a1_modelo.trim(), form.cr4a1_fabricante?.trim());
      if (!anterior) {
        info('Nenhuma peritagem anterior encontrada para esse modelo.');
        return;
      }
      let preenchidos = 0;
      setForm(prev => {
        const atualizado = { ...prev };
        CAMPOS_TECNICOS_MODELO.forEach(campo => {
          const vazio = !atualizado[campo]?.toString().trim();
          if (vazio && anterior[campo] != null && anterior[campo] !== '') {
            atualizado[campo] = anterior[campo];
            preenchidos++;
          }
        });
        return atualizado;
      });
      if (preenchidos > 0) success(`${preenchidos} campo(s) preenchido(s) a partir de uma peritagem anterior.`);
      else info('Os campos técnicos já estavam preenchidos.');
    } catch (err) {
      error('Erro ao buscar dados técnicos. ' + err.message);
    } finally {
      setBuscandoDados(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formCompleto) {
      error('Preencha todos os campos do cabeçalho antes de continuar.');
      return;
    }
    // Garante que a inspeção atual existe no contexto antes de prosseguir
    if (!inspecaoAtual) {
      if (!os) {
        error('OS não informada. Não é possível iniciar a inspeção.');
        return;
      }
      novaInspecao(os);
    }
    try {
      if (modoOffline) {
        const existente = await obterInspecaoPorOS(os);
        await salvarInspecaoOffline({
          ...(existente || {}),
          os,
          cabecalho: formEfetivo,
          respostas: existente?.respostas || {},
          fotos: existente?.fotos || [],
        });
        setCabecalhoId(cabecalhoExistenteId);
        success('Cabeçalho salvo offline!');
      } else if (cabecalhoExistenteId) {
        await updateCabecalho(cabecalhoExistenteId, formEfetivo);
        setCabecalhoId(cabecalhoExistenteId);
        success('Cabeçalho atualizado!');
      } else {
        const cabecalhoId = await createCabecalho(formEfetivo);
        setCabecalhoId(cabecalhoId);
        success('Cabeçalho salvo!');
      }
      navigate('/checklist', { replace: true });
    } catch (err) {
      error('Erro ao salvar cabeçalho. ' + err.message);
    }
  };

  const mecanicosOptions = mecanicos.map(u => ({
    value: u.cr4a1_title || u.cr4a1_usu_x00e1_rio,
    label: u.cr4a1_title || u.cr4a1_usu_x00e1_rio,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}>
      <TopBar title={cabecalhoExistenteId ? 'Editar Cabeçalho' : 'Cabeçalho'} logoSrc={Logo} />
      <AbaPeritagens />
      <StepHeader currentIndex={stepIndex} maxReached={maxStepReached} onStepClick={irParaStep} />
      <form
        onSubmit={handleSubmit}
        ref={formScrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column' }}
      >
        <input type="hidden" name="cr4a1_filial" value={form.cr4a1_filial} />

        {modoOffline && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: 'var(--md-sys-color-error)', marginBottom: 16 }}
          >
            Modo offline – dados serão sincronizados posteriormente.
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {passoAtual === 'modelo' && (
            <motion.div
              key="modelo"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <ElevatedCard style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', color: 'var(--md-sys-color-primary)' }}>Modelo de Peritagem</h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {modeloTravado
                    ? 'O modelo não pode ser alterado depois que a peritagem foi iniciada.'
                    : 'Escolha o modelo que corresponde a este equipamento. Ele define quais itens aparecem no checklist.'}
                </p>
                {modelosLoading ? (
                  <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Carregando modelos...</p>
                ) : modelos.length === 0 ? (
                  <p style={{ color: 'var(--md-sys-color-error)' }}>
                    Nenhum modelo de peritagem disponível. Conecte-se à internet para carregar a lista.
                  </p>
                ) : (
                  <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {modelos.map(m => {
                      const selecionado = modeloEfetivo === m.cr4a1_id;
                      const bloqueado = modeloTravado && !selecionado;
                      return (
                        <button
                          key={m.cr4a1_peritagem_modeloid}
                          type="button"
                          role="radio"
                          aria-checked={selecionado}
                          disabled={modeloTravado}
                          onClick={() => setForm(prev => ({ ...prev, cr4a1_modeloperitagem: m.cr4a1_id }))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%',
                            padding: '14px 16px', borderRadius: 16, cursor: modeloTravado ? 'default' : 'pointer',
                            border: `2px solid ${selecionado ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
                            backgroundColor: selecionado ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface)',
                            color: selecionado ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                            opacity: bloqueado ? 0.5 : 1, transition: 'all 0.2s', minHeight: 56,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'var(--md-sys-color-primary)' }}>
                            {selecionado ? 'radio_button_checked' : 'radio_button_unchecked'}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ display: 'block', fontSize: '0.95rem' }}>{m.cr4a1_nome}</strong>
                            {m.cr4a1_descricao && (
                              <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginTop: 2 }}>{m.cr4a1_descricao}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ElevatedCard>
            </motion.div>
          )}

          {passoAtual === 'identificacao' && (
            <motion.div
              key="identificacao"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <ElevatedCard style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Identificação do Equipamento</h3>
                <FloatingField label="OS" name="cr4a1_os" value={form.cr4a1_os} onChange={handleChange} readOnly delay={0} />
                <FloatingField label="Cliente" name="cr4a1_cliente" value={form.cr4a1_cliente} onChange={handleChange} readOnly delay={0.03} />
                <FloatingField label="Área *" name="cr4a1_area" value={form.cr4a1_area} onChange={handleChange} delay={0.06} required />
                <FloatingField label="Nº Série *" name="cr4a1_n_serie" value={form.cr4a1_n_serie} onChange={handleChange} delay={0.09} required />
                <FloatingField label="OS Retorno *" name="cr4a1_os_retorno" value={form.cr4a1_os_retorno} onChange={handleChange} delay={0.12} required />
              </ElevatedCard>
            </motion.div>
          )}

          {passoAtual === 'tecnico' && (
            <motion.div
              key="tecnico"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <ElevatedCard style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, color: 'var(--md-sys-color-primary)' }}>Dados Técnicos</h3>
                  <button
                    type="button"
                    className="chip-btn chip-btn--sm"
                    onClick={buscarDadosAutomaticos}
                    disabled={buscandoDados || !form.cr4a1_modelo?.trim()}
                  >
                    <span className="material-symbols-outlined">{buscandoDados ? 'progress_activity' : 'auto_awesome'}</span>
                    {buscandoDados ? 'Buscando...' : 'Buscar dados técnicos'}
                  </button>
                </div>
                <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Preenche os campos abaixo com base na última peritagem do mesmo modelo (e fabricante, se informado). Não sobrescreve o que você já digitou.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  <FloatingField label="Tensão *" name="cr4a1_tensao" value={form.cr4a1_tensao} onChange={handleChange} delay={0.02} required />
                  <FloatingField label="Corrente *" name="cr4a1_corrente" value={form.cr4a1_corrente} onChange={handleChange} delay={0.04} required />
                  <FloatingField label="Modelo *" name="cr4a1_modelo" value={form.cr4a1_modelo} onChange={handleChange} delay={0.06} required />
                  <FloatingField label="Fabricante *" name="cr4a1_fabricante" value={form.cr4a1_fabricante} onChange={handleChange} delay={0.08} required />
                  <FloatingField label="Carcaça *" name="cr4a1_carcaca" value={form.cr4a1_carcaca} onChange={handleChange} delay={0.1} required />
                  <FloatingField label="Potência (CV) *" name="cr4a1_potencia_cv" value={form.cr4a1_potencia_cv} onChange={handleChange} delay={0.12} required />
                  <FloatingField label="Potência (kW) *" name="cr4a1_potencia_kw" value={form.cr4a1_potencia_kw} onChange={handleChange} delay={0.14} required />
                  <FloatingField label="Tag Cliente *" name="cr4a1_tag_cliente" value={form.cr4a1_tag_cliente} onChange={handleChange} delay={0.16} required />
                  <FloatingField label="RPM *" name="cr4a1_rpm" value={form.cr4a1_rpm} onChange={handleChange} delay={0.18} required />
                  <FloatingField label="Polos *" name="cr4a1_polos" value={form.cr4a1_polos} onChange={handleChange} delay={0.2} required />
                  <FloatingField label="Classe *" name="cr4a1_classe" value={form.cr4a1_classe} onChange={handleChange} delay={0.22} required />
                  <FloatingField label="FS *" name="cr4a1_fs" value={form.cr4a1_fs} onChange={handleChange} delay={0.24} required />
                  <FloatingField label="IP *" name="cr4a1_ip" value={form.cr4a1_ip} onChange={handleChange} delay={0.26} required />
                  <FloatingField label="CAT *" name="cr4a1_cat" value={form.cr4a1_cat} onChange={handleChange} delay={0.28} required />
                  <FloatingField label="REG *" name="cr4a1_reg" value={form.cr4a1_reg} onChange={handleChange} delay={0.3} required />
                  <FloatingField label="FC *" name="cr4a1_fc" value={form.cr4a1_fc} onChange={handleChange} delay={0.32} required />
                  <FloatingField label="Frequência *" name="cr4a1_frequencia" value={form.cr4a1_frequencia} onChange={handleChange} delay={0.34} required />
                  <FloatingField label="Peso *" name="cr4a1_peso" value={form.cr4a1_peso} onChange={handleChange} delay={0.36} required />
                  <FloatingField label="Nº REQ *" name="cr4a1_n_req" value={form.cr4a1_n_req} onChange={handleChange} delay={0.38} required />
                  <FloatingField label="Tag Kairós *" name="cr4a1_tag_kairos" value={form.cr4a1_tag_kairos} onChange={handleChange} delay={0.4} required />
                  <FloatingField label="Comprimento *" name="cr4a1_comprimento" value={form.cr4a1_comprimento} onChange={handleChange} delay={0.42} required />
                  <FloatingField label="Largura *" name="cr4a1_largura" value={form.cr4a1_largura} onChange={handleChange} delay={0.44} required />
                  <FloatingField label="Altura *" name="cr4a1_altura" value={form.cr4a1_altura} onChange={handleChange} delay={0.46} required />
                  <FloatingField label="ME *" name="cr4a1_me" value={form.cr4a1_me} onChange={handleChange} delay={0.48} required />
                </div>
              </ElevatedCard>
            </motion.div>
          )}

          {passoAtual === 'equipe' && (
            <motion.div
              key="equipe"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <ElevatedCard style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Equipe</h3>
                <ReadOnlyField label="Peritador" value={nomePeritador} delay={0} />
                {modoOffline ? (
                  <FloatingField
                    label="Mecânico *"
                    name="cr4a1_mecanico"
                    value={form.cr4a1_mecanico}
                    onChange={handleChange}
                    placeholder="Nome do mecânico"
                    delay={0.05}
                    required
                  />
                ) : (
                  <AnimatedSelect
                    label="Mecânico *"
                    name="cr4a1_mecanico"
                    value={form.cr4a1_mecanico}
                    onChange={handleChange}
                    options={mecanicosOptions}
                    delay={0.05}
                    required
                  />
                )}
              </ElevatedCard>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 8 }}>
          {stepIndex > 0 && (
            <OutlinedButton type="button" onClick={handleAnterior} style={{ flex: 1 }}>
              Anterior
            </OutlinedButton>
          )}
          {!ultimoStep ? (
            <FilledButton type="button" onClick={handleProximo} disabled={!stepAtualCompleto} style={{ flex: 2 }}>
              Próximo
            </FilledButton>
          ) : (
            <FilledButton type="submit" disabled={!formCompleto} style={{ flex: 2 }}>
              {formCompleto ? 'Salvar e Iniciar Checklist' : 'Preencha todos os campos'}
            </FilledButton>
          )}
        </div>
      </form>
    </div>
  );
}