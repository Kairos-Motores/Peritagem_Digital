import { useState } from 'react';
import { useInspecao } from '../contexts/InspecaoContext';
import { useNavigate } from 'react-router-dom';
import { FilledButton } from '../components/ui/MdButton';
import BottomNav from '../components/navigation/BottomNav';
import TopBar from '../components/navigation/TopBar';
import FloatingNav from '../components/navigation/FloatingNav';

export default function NovaInspecao() {
  const [os, setOs] = useState('');
  const { novaInspecao } = useInspecao();
  const navigate = useNavigate();

  const iniciar = () => {
    if (!os.trim()) return;
    novaInspecao(os.trim());
    navigate(`/cabecalho?os=${encodeURIComponent(os.trim())}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 16px 100px 16px' }}>
      <TopBar title="Nova Inspeção" showBack={false} />
      <div style={{ padding: 16, flex: 1 }}>
        <h1>Nova Inspeção</h1>
        <md-filled-text-field
          label="Ordem de Serviço (OS)"
          value={os}
          onInput={(e) => setOs(e.target.value)}
          style={{ width: '100%', marginTop: 24 }}
          required
        ></md-filled-text-field>
        <FilledButton style={{ marginTop: 24, width: '100%' }} onClick={iniciar}>
          Iniciar Inspeção
        </FilledButton>
      </div>
      <FloatingNav />
    </div>
  );
}