import MdTopAppBar from '../ui/MdTopAppBar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import MdIcon from '../ui/MdIcon';

export default function TopBar({ title, showBack = true, actions = [] }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login'); // redireciona para o login após deslogar
  };

  // Combina as ações existentes com o botão de logout (sempre presente)
  const allActions = [
    ...actions,
    { icon: 'logout', onClick: handleLogout },
  ];

  return (
    <MdTopAppBar
      title={title}
      navigationIcon={showBack ? { icon: 'arrow_back', onClick: () => navigate(-1) } : undefined}
      actions={allActions}
    />
  );
}