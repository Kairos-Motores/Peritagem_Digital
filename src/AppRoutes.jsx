import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Home from './pages/Home';
import NovaInspecao from './pages/NovaInspecao';
import Cabecalho from './pages/Cabecalho';
import Checklist from './pages/Checklist';
import Historico from './pages/Historico';
import InspecaoDetalhe from './pages/InspecaoDetalhe';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3,
};

export default function AppRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;
  if (!user) return <Login />;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="in"
        exit="out"
        transition={pageTransition}
        style={{ height: '100%', overflow: 'hidden' }}
      >
        <Routes location={location}>
          <Route path="/home" element={<Home />} />
          <Route path="/nova" element={<NovaInspecao />} />
          <Route path="/cabecalho" element={<Cabecalho />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/inspecao/:os" element={<InspecaoDetalhe />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}