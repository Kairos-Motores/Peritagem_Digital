import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('dv_token');
    const username = sessionStorage.getItem('dv_username');
    if (token && username) {
      setUser({ username, token });
    }
    setLoading(false);
  }, []);

  const login = async (username, matricula) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, matricula }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login falhou');
    }

    const data = await res.json();
    sessionStorage.setItem('dv_token', data.token);
    sessionStorage.setItem('dv_username', username);
    setUser({ username, token: data.token });
  };

  const logout = () => {
    sessionStorage.removeItem('dv_token');
    sessionStorage.removeItem('dv_username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}