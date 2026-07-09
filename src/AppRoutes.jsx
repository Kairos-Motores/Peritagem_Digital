import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Home from './pages/Home';
import NovaInspecao from './pages/NovaInspecao';
import Cabecalho from './pages/Cabecalho';
import Checklist from './pages/Checklist';
import Historico from './pages/Historico';
import InspecaoDetalhe from './pages/InspecaoDetalhe';
import LoadingScreen from './components/ui/LoadingScreen';

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="Autenticando" />;

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/home" element={<Home />} />
      <Route path="/nova" element={<NovaInspecao />} />
      <Route path="/cabecalho" element={<Cabecalho />} />
      <Route path="/checklist" element={<Checklist />} />
      <Route path="/historico" element={<Historico />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
      <Route path="/inspecao/:os" element={<InspecaoDetalhe />} />
    </Routes>
  );
}