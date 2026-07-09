import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FilledButton } from '../components/ui/MdButton';
import { ElevatedCard } from '../components/ui/MdCard';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [matricula, setMatricula] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, matricula);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <ElevatedCard style={{ padding: 24, width: '90%', maxWidth: 400 }}>
        <h1 style={{ color: 'var(--md-sys-color-primary)', marginBottom: 16 }}>Kairós Motores</h1>
        <form onSubmit={handleSubmit}>
          <md-filled-text-field
            label="Usuário"
            value={username}
            onInput={(e) => setUsername(e.target.value)}
            style={{ width: '100%', marginBottom: 16 }}
            required
          ></md-filled-text-field>
          <md-filled-text-field
            label="Matrícula"
            type="password"
            value={matricula}
            onInput={(e) => setMatricula(e.target.value)}
            style={{ width: '100%', marginBottom: 16 }}
            required
          ></md-filled-text-field>
          {error && <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>}
          <FilledButton type="submit" style={{ width: '100%' }}>Entrar</FilledButton>
        </form>
      </ElevatedCard>
    </div>
  );
}