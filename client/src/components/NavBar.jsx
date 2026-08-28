import { useNavigate, useLocation } from 'react-router-dom';

const Icon = ({ name }) => {
  const icons = {
    home: <path d="M3 12l9-9 9 9M5 10v10h14V10" />,
    character: <path d="M12 2a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z" />,
    trial: <path d="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5" />,
    backpack: <path d="M16 5V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v1a4 4 0 00-4 4v11a2 2 0 002 2h12a2 2 0 002-2V9a4 4 0 00-4-4m-6-1h4v1h-4z" />,
    ranking: <path d="M7 4V2h10v2h3v6a3 3 0 01-3 3h-.5a3 3 0 01-2.5 2.95V20h3v2H8v-2h3v-4.05A3 3 0 018.5 13H8a3 3 0 01-3-3V4h2z" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

const items = [
  { path: '/home', icon: 'home', label: '主页' },
  { path: '/character', icon: 'character', label: '角色' },
  { path: '/trial', icon: 'trial', label: '试炼' },
  { path: '/backpack', icon: 'backpack', label: '背包' },
  { path: '/ranking', icon: 'ranking', label: '排行' },
];

export default function NavBar() {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <nav className="nav-bar">
      {items.map(item => {
        const active = loc.pathname === item.path || (item.path !== '/home' && loc.pathname.startsWith(item.path));
        return (
          <div key={item.path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => nav(item.path)}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
