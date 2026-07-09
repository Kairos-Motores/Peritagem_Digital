import BottomNav from '../components/navigation/BottomNav';
import FloatingNav from '../components/navigation/FloatingNav';

export default function Historico() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 16px 100px 16px' }}>
      <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
        <h1>Histórico de Inspeções</h1>
        <p>Em breve...</p>
      </div>
      <FloatingNav />
    </div>
  );
}