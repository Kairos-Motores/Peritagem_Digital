import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FilledButton } from '../components/ui/MdButton';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../assets/logo vertical- Medro.svg';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [matricula, setMatricula] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !matricula.trim()) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      await login(username, matricula);
    } catch (err) {
      setError(err.message || 'Usuário ou matrícula inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <img src={Logo} alt="Kairós Motores" className="login-logo" />

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <span className="material-symbols-outlined input-icon">person</span>
            <input
              type="text"
              placeholder="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <span className="material-symbols-outlined input-icon">lock</span>
            <input
              type="password"
              placeholder="Matrícula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="login-input"
              autoComplete="current-password"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                className="login-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FilledButton
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </FilledButton>
          </motion.div>
        </form>
      </motion.div>

      <p className="login-footer">Kairós Motores © {new Date().getFullYear()}</p>
    </div>
  );
}