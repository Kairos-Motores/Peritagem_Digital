//import '@material/web/navigation-bar/navigation-bar.js';
//import '@material/web/navigation-icon/navigation-icon.js';
import { useLocation, useNavigate } from 'react-router-dom';
import MdIcon from '../ui/MdIcon';

const tabs = [
  { path: '/home', label: 'Início', icon: 'home' },
  { path: '/nova', label: 'Inspeção', icon: 'engineering' },
  { path: '/historico', label: 'Histórico', icon: 'history' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = tabs.findIndex(t => t.path === location.pathname);

  return (
    <md-navigation-bar
      active-index={activeIndex !== -1 ? activeIndex : 0}
      style={{ 
        '--md-navigation-bar-item-min-width': '0px',  // anula largura mínima padrão
        justifyContent: 'space-around' 
      }}
    >
      {tabs.map(tab => (
        <md-navigation-icon
          key={tab.path}
          label={tab.label}
          onClick={() => navigate(tab.path)}
          style={{
            flex: '1 1 0%',        // ocupa todo o espaço disponível
            justifyContent: 'center',
            alignItems: 'center',
            minWidth: '60px',      // largura mínima para toque confortável
            padding: '8px 0'
          }}
        >
          <MdIcon>{tab.icon}</MdIcon>
        </md-navigation-icon>
      ))}
    </md-navigation-bar>
  );
}