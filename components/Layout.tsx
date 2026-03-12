import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { layout } from '../theme/colors';
import {
  LayoutDashboard,
  Package,
  Monitor,
  ScanBarcode,
  History,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Building2,
  FileText,
  ArrowLeftRight
} from 'lucide-react';

const SIDEBAR_KEY = 'bastion_sidebar_collapsed';

// Shared transition styles for text that fades in/out
const textTransitionStyle = (collapsed: boolean): React.CSSProperties => ({
  opacity: collapsed ? 0 : 1,
  width: collapsed ? 0 : 'auto',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  transition: 'opacity 200ms ease, width 200ms ease',
  transitionDelay: collapsed ? '0ms' : '150ms',
  pointerEvents: collapsed ? 'none' : 'auto',
});

// Generate initials + color from name
const getAvatarData = (name: string) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  const colors = [
    'linear-gradient(135deg, #4F6BFF, #7B61FF)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #dc2626)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const gradient = colors[Math.abs(hash) % colors.length];
  return { initials, gradient };
};

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed));
    } catch { }
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const avatar = getAvatarData(user?.fullName || 'U');

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `relative group flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200`;

  const navStyle = (isActive: boolean): React.CSSProperties => ({
    backgroundColor: isActive ? 'rgba(79, 107, 255, 0.15)' : 'transparent',
    color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.55)',
  });

  const navHoverHandler = (isActive: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isActive) {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
        e.currentTarget.style.color = '#fff';
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isActive) {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)';
      }
    },
  });

  const Tooltip = ({ label }: { label: string }) => {
    if (!collapsed) return null;
    return (
      <span
        className="absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none"
        style={{
          backgroundColor: '#1e293b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {label}
        <span
          className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
          style={{ borderRightColor: '#1e293b' }}
        />
      </span>
    );
  };

  const ActiveIndicator = ({ isActive }: { isActive: boolean }) => {
    if (!isActive) return null;
    return <div className="nav-active-indicator" />;
  };

  const txtStyle = textTransitionStyle(collapsed);

  const sectionLabelStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.30)',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '0.08em',
    fontSize: 10,
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F0F2F7' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col"
        style={{
          width: collapsed ? 72 : 264,
          transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          flexShrink: 0,
          background: 'linear-gradient(180deg, #15155E 0%, #191970 40%, #1a1a6e 100%)',
          color: '#fff',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Decorative gradient overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(180deg, rgba(79, 107, 255, 0.08) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Header with toggle */}
        <div
          className={`${collapsed ? 'p-3' : 'px-6 py-5'} transition-all duration-300`}
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', position: 'relative' }}
        >
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #4F6BFF 0%, #7B61FF 100%)',
                  boxShadow: '0 4px 12px rgba(79, 107, 255, 0.35)',
                }}
              >
                <span className="font-bold text-sm" style={{ color: '#fff', fontFamily: "'Outfit', sans-serif" }}>B</span>
              </div>
              <div style={txtStyle}>
                <h1
                  className="text-lg font-bold tracking-tight"
                  style={{ color: '#fff', fontFamily: "'Outfit', sans-serif", lineHeight: 1.2, margin: 0 }}
                >
                  Bastion
                </h1>
                <p
                  className="text-[10px] uppercase tracking-[0.1em]"
                  style={{ color: 'rgba(255, 255, 255, 0.35)', margin: 0 }}
                >
                  Gestão Patrimonial
                </p>
              </div>
            </div>
          </div>
          {/* Toggle button */}
          <button
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            className="flex items-center justify-center w-full mt-3 p-2 rounded-lg transition-all duration-200"
            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
            }}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className={`flex-1 ${collapsed ? 'p-2' : 'px-3 py-4'} space-y-0.5 transition-all duration-300 overflow-y-auto`}>
          <NavLink to="/" end className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
            {({ isActive }) => (
              <>
                <ActiveIndicator isActive={isActive} />
                <LayoutDashboard size={19} className="flex-shrink-0" />
                <span style={txtStyle}>Dashboard</span>
                <Tooltip label="Dashboard" />
              </>
            )}
          </NavLink>

          {/* Section label: Operacional */}
          <div
            className="px-4 font-semibold uppercase"
            style={{
              ...txtStyle,
              ...sectionLabelStyle,
              paddingTop: collapsed ? 0 : 20,
              paddingBottom: collapsed ? 0 : 6,
              height: collapsed ? 0 : 'auto',
              marginTop: collapsed ? 0 : undefined,
              marginBottom: collapsed ? 0 : undefined,
              transition: 'opacity 200ms ease, width 200ms ease, height 200ms ease, padding 200ms ease',
              transitionDelay: collapsed ? '0ms' : '150ms',
            }}
          >
            Operacional
          </div>
          {collapsed && <div className="my-2 mx-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }} />}

          <NavLink to="/scanner" className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
            {({ isActive }) => (
              <>
                <ActiveIndicator isActive={isActive} />
                <ScanBarcode size={19} className="flex-shrink-0" />
                <span style={txtStyle}>Scanner Entrada/Saída</span>
                <Tooltip label="Scanner Entrada/Saída" />
              </>
            )}
          </NavLink>
          <NavLink to="/inventory" className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
            {({ isActive }) => (
              <>
                <ActiveIndicator isActive={isActive} />
                <Package size={19} className="flex-shrink-0" />
                <span style={txtStyle}>Almoxarifado</span>
                <Tooltip label="Almoxarifado" />
              </>
            )}
          </NavLink>
          <NavLink to="/movements" className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
            {({ isActive }) => (
              <>
                <ActiveIndicator isActive={isActive} />
                <ArrowLeftRight size={19} className="flex-shrink-0" />
                <span style={txtStyle}>Movimentações</span>
                <Tooltip label="Movimentações" />
              </>
            )}
          </NavLink>
          <NavLink to="/assets" className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
            {({ isActive }) => (
              <>
                <ActiveIndicator isActive={isActive} />
                <Monitor size={19} className="flex-shrink-0" />
                <span style={txtStyle}>Ativos Fixos</span>
                <Tooltip label="Ativos Fixos" />
              </>
            )}
          </NavLink>
          <NavLink to="/reports" className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
            {({ isActive }) => (
              <>
                <ActiveIndicator isActive={isActive} />
                <FileText size={19} className="flex-shrink-0" />
                <span style={txtStyle}>Relatórios</span>
                <Tooltip label="Relatórios" />
              </>
            )}
          </NavLink>

          {user?.role === 'ADMIN' && (
            <>
              {/* Section label: Administrativo */}
              <div
                className="px-4 font-semibold uppercase"
                style={{
                  ...txtStyle,
                  ...sectionLabelStyle,
                  paddingTop: collapsed ? 0 : 20,
                  paddingBottom: collapsed ? 0 : 6,
                  height: collapsed ? 0 : 'auto',
                  transition: 'opacity 200ms ease, width 200ms ease, height 200ms ease, padding 200ms ease',
                  transitionDelay: collapsed ? '0ms' : '150ms',
                }}
              >
                Administrativo
              </div>
              {collapsed && <div className="my-2 mx-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }} />}
              <NavLink to="/users" className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
                {({ isActive }) => (
                  <>
                    <ActiveIndicator isActive={isActive} />
                    <Users size={19} className="flex-shrink-0" />
                    <span style={txtStyle}>Usuários</span>
                    <Tooltip label="Usuários" />
                  </>
                )}
              </NavLink>
              <NavLink to="/departments" className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
                {({ isActive }) => (
                  <>
                    <ActiveIndicator isActive={isActive} />
                    <Building2 size={19} className="flex-shrink-0" />
                    <span style={txtStyle}>Setores</span>
                    <Tooltip label="Setores" />
                  </>
                )}
              </NavLink>
              <NavLink to="/audit" className={navClass} style={({ isActive }) => navStyle(isActive)} {...navHoverHandler(false)}>
                {({ isActive }) => (
                  <>
                    <ActiveIndicator isActive={isActive} />
                    <History size={19} className="flex-shrink-0" />
                    <span style={txtStyle}>Auditoria e Logs</span>
                    <Tooltip label="Auditoria e Logs" />
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        <div
          className={`${collapsed ? 'p-2' : 'px-3 py-4'} transition-all duration-300`}
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          {/* User info */}
          {collapsed ? (
            <div className="relative group flex items-center justify-center mb-3 p-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: avatar.gradient }}
              >
                <span className="text-xs font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{avatar.initials}</span>
              </div>
              <span
                className="absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none"
                style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {user?.fullName}
                <br />
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</span>
                <span
                  className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
                  style={{ borderRightColor: '#1e293b' }}
                />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-3 px-2" style={{ animation: 'fadeIn 0.3s ease' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: avatar.gradient, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
              >
                <span className="text-sm font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{avatar.initials}</span>
              </div>
              <div style={txtStyle}>
                <p className="text-sm font-semibold truncate" style={{ color: '#fff', margin: 0, lineHeight: 1.3 }}>{user?.fullName}</p>
                <p className="text-[11px]" style={{ color: 'rgba(255, 255, 255, 0.35)', margin: 0 }}>{user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sair do Sistema' : undefined}
            className={`relative group w-full flex items-center ${collapsed ? 'justify-center' : 'justify-center gap-2'} px-4 py-2.5 rounded-xl transition-all text-sm font-medium`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
              e.currentTarget.style.color = '#fca5a5';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            }}
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span style={txtStyle}>Sair do Sistema</span>
            {collapsed && (
              <span
                className="absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none"
                style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Sair do Sistema
                <span
                  className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
                  style={{ borderRightColor: '#1e293b' }}
                />
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F0F2F7' }}>
        <div className="p-8 max-w-7xl mx-auto page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;