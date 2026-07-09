import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInspecao } from '../contexts/InspecaoContext';
import { useDataverse } from '../hooks/useDataverse';
import { FilledButton } from '../components/ui/MdButton';
import { useToast } from '../hooks/useToast';
import TopBar from '../components/navigation/TopBar';
import { ElevatedCard } from '../components/ui/MdCard';

export default function Cabecalho() {
  const [searchParams] = useSearchParams();
  const os = searchParams.get('os') || '';
  const { inspecaoAtual, setCabecalhoId } = useInspecao();
  const navigate = useNavigate();
  const { createCabecalho, getUsuarios, getUsuarioLogado, getFilialPeritador } = useDataverse();
  const { success, error } = useToast();

  const username = sessionStorage.getItem('dv_username');
  const [mecanicos, setMecanicos] = useState([]);
  const [nomePeritador, setNomePeritador] = useState(username || '');
  const [filial, setFilial] = useState('');

  const [form, setForm] = useState({
    cr4a1_os: os,
    cr4a1_cliente: '',
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
    cr4a1_data_peritagem: new Date().toISOString().slice(0, 16),
    cr4a1_filial: '',
  });

  useEffect(() => {
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
    getUsuarios()
      .then(data => setMecanicos(data?.value || []))
      .catch(console.warn);
  }, [username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cabecalhoId = await createCabecalho(form);
      setCabecalhoId(cabecalhoId);
      success('Cabeçalho salvo!');
      navigate('/checklist');
    } catch (err) {
      error('Erro ao salvar cabeçalho. ' + err.message);
    }
  };

  const renderInput = (label, name, type = 'text') => (
    <md-filled-text-field
      key={name}
      label={label}
      name={name}
      value={form[name] || ''}
      onInput={handleChange}
      type={type}
      style={{ width: '100%', marginBottom: 12 }}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}>
      <TopBar title="Cabeçalho" />
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Identificação do Equipamento</h3>
          {renderInput('OS *', 'cr4a1_os')}
          {renderInput('Cliente', 'cr4a1_cliente')}
          {renderInput('Área', 'cr4a1_area')}
          {renderInput('Nº Série', 'cr4a1_n_serie')}
          {renderInput('OS Retorno', 'cr4a1_os_retorno')}
        </ElevatedCard>

        <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Dados Técnicos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {renderInput('Tensão', 'cr4a1_tensao')}
            {renderInput('Corrente', 'cr4a1_corrente')}
            {renderInput('Modelo', 'cr4a1_modelo')}
            {renderInput('Fabricante', 'cr4a1_fabricante')}
            {renderInput('Carcaça', 'cr4a1_carcaca')}
            {renderInput('Potência (CV)', 'cr4a1_potencia_cv')}
            {renderInput('Potência (kW)', 'cr4a1_potencia_kw')}
            {renderInput('Tag Cliente', 'cr4a1_tag_cliente')}
            {renderInput('RPM', 'cr4a1_rpm')}
            {renderInput('Polos', 'cr4a1_polos')}
            {renderInput('Classe', 'cr4a1_classe')}
            {renderInput('FS', 'cr4a1_fs')}
            {renderInput('IP', 'cr4a1_ip')}
            {renderInput('CAT', 'cr4a1_cat')}
            {renderInput('REG', 'cr4a1_reg')}
            {renderInput('FC', 'cr4a1_fc')}
            {renderInput('Frequência', 'cr4a1_frequencia')}
            {renderInput('Peso', 'cr4a1_peso')}
            {renderInput('Nº REQ', 'cr4a1_n_req')}
            {renderInput('Tag Kairós', 'cr4a1_tag_kairos')}
            {renderInput('Comprimento', 'cr4a1_comprimento')}
            {renderInput('Largura', 'cr4a1_largura')}
            {renderInput('Altura', 'cr4a1_altura')}
            {renderInput('ME', 'cr4a1_me')}
          </div>
        </ElevatedCard>

        <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--md-sys-color-primary)' }}>Equipe</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Peritador</label>
            <md-filled-text-field value={nomePeritador} readonly style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Mecânico</label>
            <select
              name="cr4a1_mecanico"
              value={form.cr4a1_mecanico}
              onChange={handleChange}
            >
              <option value="">Selecione...</option>
              {mecanicos.map(u => (
                <option key={u.cr4a1_credenciaisid} value={u.cr4a1_usu_x00e1_rio}>
                  {u.cr4a1_title || u.cr4a1_usu_x00e1_rio}
                </option>
              ))}
            </select>
          </div>
          {renderInput('Data Peritagem', 'cr4a1_data_peritagem', 'datetime-local')}
        </ElevatedCard>

        <input type="hidden" name="cr4a1_filial" value={form.cr4a1_filial} />

        <FilledButton type="submit" style={{ width: '100%', marginTop: 8 }}>
          Salvar e Iniciar Checklist
        </FilledButton>
      </form>
    </div>
  );
}