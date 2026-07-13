import { useState, useEffect, useRef } from 'react';
import { useInspecao } from '../contexts/InspecaoContext';
import { useNavigate } from 'react-router-dom';
import { FilledButton } from '../components/ui/MdButton';
import BottomNav from '../components/navigation/BottomNav';
import { useDataverse } from '../hooks/useDataverse';
import FloatingNav from '../components/navigation/FloatingNav';

export default function NovaInspecao() {
  const [os, setOs] = useState('');
  const [valStatus, setValStatus] = useState(null); // 'validando', 'valida', 'apenas_zb6', 'nao_encontrada', 'erro'
  const [cliente, setCliente] = useState('');
  const [mensagem, setMensagem] = useState('');
  const { novaInspecao } = useInspecao();
  const navigate = useNavigate();
  const { validarOS } = useDataverse();
  const debounceRef = useRef();

  const osTrim = os.trim();

  // Efeito de validação com debounce de 600ms
  useEffect(() => {
    if (!osTrim) {
      setValStatus(null);
      setMensagem('');
      setCliente('');
      return;
    }

    setValStatus('validando');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const resultado = await validarOS(osTrim);
        setCliente(resultado.cliente || '');

        switch (resultado.status) {
          case 'valida':
            setValStatus('valida');
            setMensagem('OS encontrada. Peritagem pode prosseguir.');
            break;
          case 'apenas_zb6':
            setValStatus('apenas_zb6');
            setMensagem('Esta OS existe apenas na ZB6 e não pode ser peritada.');
            break;
          case 'nao_encontrada':
            setValStatus('nao_encontrada');
            setMensagem('OS não encontrada no setor de peritagem.');
            break;
          default:
            setValStatus('erro');
            setMensagem('Erro desconhecido.');
        }
      } catch {
        setValStatus('erro');
        setMensagem('Erro ao validar OS.');
      }
    }, 600);

    return () => clearTimeout(debounceRef.current);
  }, [osTrim]);

  const podeProsseguir = valStatus === 'valida';

  const iniciar = () => {
    if (!podeProsseguir) return;
    novaInspecao(osTrim);
    navigate(`/cabecalho?os=${encodeURIComponent(osTrim)}&cliente=${encodeURIComponent(cliente)}`);
  };

  const statusIcon = () => {
    switch (valStatus) {
      case 'validando':
        return <span className="material-symbols-outlined" style={{ color: '#666', animation: 'spin 1s linear infinite' }}>progress_activity</span>;
      case 'valida':
        return <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-primary)' }}>check_circle</span>;
      case 'apenas_zb6':
      case 'nao_encontrada':
      case 'erro':
        return <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-error)' }}>cancel</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 16, flex: 1 }}>
        <h1>Nova Inspeção</h1>
        <div style={{ position: 'relative', marginTop: 24 }}>
          <md-filled-text-field
            label="Ordem de Serviço (OS)"
            value={os}
            onInput={(e) => setOs(e.target.value)}
            style={{ width: '100%' }}
          />
          {valStatus && (
            <div style={{ position: 'absolute', right: 12, top: 18, display: 'flex', alignItems: 'center', gap: 4 }}>
              {statusIcon()}
            </div>
          )}
        </div>
        {mensagem && (
          <p style={{
            marginTop: 8,
            fontSize: '0.85rem',
            color: valStatus === 'valida' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            {mensagem}
          </p>
        )}
        {podeProsseguir && cliente && (
          <p style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Cliente: <strong>{cliente}</strong>
          </p>
        )}
        <FilledButton
          style={{ marginTop: 24, width: '100%' }}
          onClick={iniciar}
          disabled={!podeProsseguir}
        >
          Iniciar Inspeção
        </FilledButton>
      </div>
      <FloatingNav />
    </div>
  );
}