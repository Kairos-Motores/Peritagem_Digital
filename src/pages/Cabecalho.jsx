import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInspecao } from '../contexts/InspecaoContext';
import { useDataverse } from '../hooks/useDataverse';
import { FilledButton } from '../components/ui/MdButton';
import { useToast } from '../hooks/useToast';
import Logo from "../assets/Medro llogo horizontal-Medro.svg";
import TopBar from '../components/navigation/TopBar';
import { ElevatedCard } from '../components/ui/MdCard';
import { useOffline } from '../contexts/OfflineContext';
import { salvarInspecaoOffline } from '../db/offlineStore';
import { motion } from 'framer-motion';

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
  const { createCabecalho, getUsuarios, getUsuarioLogado, getFilialPeritador } = useDataverse();
  const { success, error } = useToast();
  const { modoOffline } = useOffline();

  const username = sessionStorage.getItem('dv_username');
  const [mecanicos, setMecanicos] = useState([]);
  const [nomePeritador, setNomePeritador] = useState(username || '');
  const [filial, setFilial] = useState('');

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Campos que o peritador precisa preencher para liberar o checklist
  const camposObrigatorios = [
    'cr4a1_area', 'cr4a1_n_serie', 'cr4a1_os_retorno',
    'cr4a1_tensao', 'cr4a1_corrente', 'cr4a1_modelo', 'cr4a1_fabricante', 'cr4a1_carcaca',
    'cr4a1_potencia_cv', 'cr4a1_potencia_kw', 'cr4a1_tag_cliente', 'cr4a1_rpm', 'cr4a1_polos',
    'cr4a1_classe', 'cr4a1_fs', 'cr4a1_ip', 'cr4a1_cat', 'cr4a1_reg', 'cr4a1_fc', 'cr4a1_frequencia',
    'cr4a1_peso', 'cr4a1_n_req', 'cr4a1_tag_kairos', 'cr4a1_comprimento', 'cr4a1_largura', 'cr4a1_altura',
    'cr4a1_me', 'cr4a1_mecanico',
  ];
  const formCompleto = camposObrigatorios.every(campo => form[campo]?.toString().trim().length > 0);

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
        await salvarInspecaoOffline({ os, cabecalho: form, respostas: {}, fotos: [] });
        setCabecalhoId(null);
        success('Cabeçalho salvo offline!');
      } else {
        const cabecalhoId = await createCabecalho(form);
        setCabecalhoId(cabecalhoId);
        success('Cabeçalho salvo!');
      }
      navigate('/checklist');
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
      <TopBar title="Cabeçalho" logoSrc={Logo} />
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {modoOffline && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: 'var(--md-sys-color-error)', marginBottom: 16 }}
          >
            Modo offline – dados serão sincronizados posteriormente.
          </motion.p>
        )}

        {/* Card Identificação */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Identificação do Equipamento</h3>
            <FloatingField label="OS *" name="cr4a1_os" value={form.cr4a1_os} onChange={handleChange} readOnly delay={0} />
            <FloatingField label="Cliente" name="cr4a1_cliente" value={form.cr4a1_cliente} onChange={handleChange} readOnly delay={0.05} />
            <FloatingField label="Área *" name="cr4a1_area" value={form.cr4a1_area} onChange={handleChange} delay={0.1} required />
            <FloatingField label="Nº Série *" name="cr4a1_n_serie" value={form.cr4a1_n_serie} onChange={handleChange} delay={0.15} required />
            <FloatingField label="OS Retorno *" name="cr4a1_os_retorno" value={form.cr4a1_os_retorno} onChange={handleChange} delay={0.2} required />
          </ElevatedCard>
        </motion.div>

        {/* Card Dados Técnicos */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Dados Técnicos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <FloatingField label="Tensão *" name="cr4a1_tensao" value={form.cr4a1_tensao} onChange={handleChange} delay={0.25} required />
              <FloatingField label="Corrente *" name="cr4a1_corrente" value={form.cr4a1_corrente} onChange={handleChange} delay={0.3} required />
              <FloatingField label="Modelo *" name="cr4a1_modelo" value={form.cr4a1_modelo} onChange={handleChange} delay={0.35} required />
              <FloatingField label="Fabricante *" name="cr4a1_fabricante" value={form.cr4a1_fabricante} onChange={handleChange} delay={0.4} required />
              <FloatingField label="Carcaça *" name="cr4a1_carcaca" value={form.cr4a1_carcaca} onChange={handleChange} delay={0.45} required />
              <FloatingField label="Potência (CV) *" name="cr4a1_potencia_cv" value={form.cr4a1_potencia_cv} onChange={handleChange} delay={0.5} required />
              <FloatingField label="Potência (kW) *" name="cr4a1_potencia_kw" value={form.cr4a1_potencia_kw} onChange={handleChange} delay={0.55} required />
              <FloatingField label="Tag Cliente *" name="cr4a1_tag_cliente" value={form.cr4a1_tag_cliente} onChange={handleChange} delay={0.6} required />
              <FloatingField label="RPM *" name="cr4a1_rpm" value={form.cr4a1_rpm} onChange={handleChange} delay={0.65} required />
              <FloatingField label="Polos *" name="cr4a1_polos" value={form.cr4a1_polos} onChange={handleChange} delay={0.7} required />
              <FloatingField label="Classe *" name="cr4a1_classe" value={form.cr4a1_classe} onChange={handleChange} delay={0.75} required />
              <FloatingField label="FS *" name="cr4a1_fs" value={form.cr4a1_fs} onChange={handleChange} delay={0.8} required />
              <FloatingField label="IP *" name="cr4a1_ip" value={form.cr4a1_ip} onChange={handleChange} delay={0.85} required />
              <FloatingField label="CAT *" name="cr4a1_cat" value={form.cr4a1_cat} onChange={handleChange} delay={0.9} required />
              <FloatingField label="REG *" name="cr4a1_reg" value={form.cr4a1_reg} onChange={handleChange} delay={0.95} required />
              <FloatingField label="FC *" name="cr4a1_fc" value={form.cr4a1_fc} onChange={handleChange} delay={1.0} required />
              <FloatingField label="Frequência *" name="cr4a1_frequencia" value={form.cr4a1_frequencia} onChange={handleChange} delay={1.05} required />
              <FloatingField label="Peso *" name="cr4a1_peso" value={form.cr4a1_peso} onChange={handleChange} delay={1.1} required />
              <FloatingField label="Nº REQ *" name="cr4a1_n_req" value={form.cr4a1_n_req} onChange={handleChange} delay={1.15} required />
              <FloatingField label="Tag Kairós *" name="cr4a1_tag_kairos" value={form.cr4a1_tag_kairos} onChange={handleChange} delay={1.2} required />
              <FloatingField label="Comprimento *" name="cr4a1_comprimento" value={form.cr4a1_comprimento} onChange={handleChange} delay={1.25} required />
              <FloatingField label="Largura *" name="cr4a1_largura" value={form.cr4a1_largura} onChange={handleChange} delay={1.3} required />
              <FloatingField label="Altura *" name="cr4a1_altura" value={form.cr4a1_altura} onChange={handleChange} delay={1.35} required />
              <FloatingField label="ME *" name="cr4a1_me" value={form.cr4a1_me} onChange={handleChange} delay={1.4} required />
            </div>
          </ElevatedCard>
        </motion.div>

        {/* Card Equipe */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }}>
          <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Equipe</h3>
            <ReadOnlyField label="Peritador" value={nomePeritador} delay={1.45} />
            {modoOffline ? (
              <FloatingField
                label="Mecânico *"
                name="cr4a1_mecanico"
                value={form.cr4a1_mecanico}
                onChange={handleChange}
                placeholder="Nome do mecânico"
                delay={1.5}
                required
              />
            ) : (
              <AnimatedSelect
                label="Mecânico *"
                name="cr4a1_mecanico"
                value={form.cr4a1_mecanico}
                onChange={handleChange}
                options={mecanicosOptions}
                delay={1.5}
                required
              />
            )}
          </ElevatedCard>
        </motion.div>

        <input type="hidden" name="cr4a1_filial" value={form.cr4a1_filial} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.3 }}
        >
          <FilledButton type="submit" disabled={!formCompleto} style={{ width: '100%', marginTop: 8 }}>
            {formCompleto ? 'Salvar e Iniciar Checklist' : 'Preencha todos os campos'}
          </FilledButton>
        </motion.div>
      </form>
    </div>
  );
}