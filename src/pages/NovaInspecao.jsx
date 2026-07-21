import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInspecao } from '../contexts/InspecaoContext';
import { useNavigate } from 'react-router-dom';
import { FilledButton } from '../components/ui/MdButton';
import { useDataverse } from '../hooks/useDataverse';
import { useOffline } from '../contexts/OfflineContext';
import FloatingNav from '../components/navigation/FloatingNav';

export default function NovaInspecao() {
  const [searchParams] = useSearchParams();
  const osFromUrl = searchParams.get('os') || '';      // ← lê da URL
  const clienteFromUrl = searchParams.get('cliente') || '';

  const [os, setOs] = useState(osFromUrl);               // inicia com o valor da URL
  const [valStatus, setValStatus] = useState(null);
  const [cliente, setCliente] = useState(clienteFromUrl);
  const [mensagem, setMensagem] = useState('');

  const { novaInspecao } = useInspecao();
  const navigate = useNavigate();
  const { validarOS } = useDataverse();
  const { modoOffline, salvarLocal } = useOffline();
  const debounceRef = useRef();

  const osTrim = os.trim();

  // Sempre que o searchParam mudar (ex.: ao clicar num card), atualiza o input
  useEffect(() => {
    setOs(osFromUrl);
    setCliente(clienteFromUrl);
  }, [osFromUrl, clienteFromUrl]);

  // Validação online da OS
  useEffect(() => {
    if (modoOffline) {
      setValStatus(null);
      setMensagem('');
      return;
    }
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
  }, [osTrim, modoOffline]);

  const podeProsseguir = modoOffline ? osTrim.length > 0 : valStatus === 'valida';

  const iniciar = async () => {
    if (!podeProsseguir) return;
    novaInspecao(osTrim);
    if (modoOffline) {
      await salvarLocal({ os: osTrim, cabecalho: null, respostas: {}, fotos: [], status: 'rascunho' });
      navigate(`/cabecalho?os=${encodeURIComponent(osTrim)}`);
    } else {
      navigate(`/cabecalho?os=${encodeURIComponent(osTrim)}&cliente=${encodeURIComponent(cliente)}`);
    }
  };

  const statusIcon = () => {
    if (modoOffline) return null;
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
        {modoOffline && (
          <p style={{ color: 'var(--md-sys-color-error)', fontSize: '0.9rem', marginTop: 8 }}>
            Modo offline – a validação da OS não será feita agora.
          </p>
        )}
        <div style={{ position: 'relative', marginTop: 24 }}>
          <md-filled-text-field
            label="Ordem de Serviço (OS)"
            value={os}
            onInput={(e) => setOs(e.target.value)}
            style={{ width: '100%' }}
          />
          {!modoOffline && valStatus && (
            <div style={{ position: 'absolute', right: 12, top: 18, display: 'flex', alignItems: 'center', gap: 4 }}>
              {statusIcon()}
            </div>
          )}
        </div>
        {!modoOffline && mensagem && (
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
        {!modoOffline && podeProsseguir && cliente && (
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