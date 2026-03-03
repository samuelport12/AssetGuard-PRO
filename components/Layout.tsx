import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  Monitor,
  ScanBarcode,
  History,
  LogOut,
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Building2,
  FileText
} from 'lucide-react';

const SIDEBAR_KEY = 'assetguard_sidebar_collapsed';

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

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `relative group flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
      : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  const Tooltip = ({ label }: { label: string }) => {
    if (!collapsed) return null;
    return (
      <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
      </span>
    );
  };

  const txtStyle = textTransitionStyle(collapsed);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className="bg-slate-900 text-white flex flex-col shadow-xl"
        style={{
          width: collapsed ? 72 : 256,
          transition: 'width 300ms ease-in-out',
          flexShrink: 0,
        }}
      >
        {/* Header with toggle */}
        <div className={`border-b border-slate-800 ${collapsed ? 'p-3' : 'p-6'} transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${collapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-lg">AG</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight" style={txtStyle}>AssetGuard</h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider" style={txtStyle}>Gestão Patrimonial</p>
          {/* Toggle button */}
          <button
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            className="flex items-center justify-center w-full mt-3 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} space-y-1 transition-all duration-300`}>
          <NavLink to="/" className={navClass}>
            <LayoutDashboard size={20} className="flex-shrink-0" />
            <span style={txtStyle}>Dashboard</span>
            <Tooltip label="Dashboard" />
          </NavLink>

          {/* Section label: Operacional */}
          <div
            className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"
            style={{
              ...txtStyle,
              paddingTop: collapsed ? 0 : 16,
              paddingBottom: collapsed ? 0 : 8,
              height: collapsed ? 0 : 'auto',
              marginTop: collapsed ? 0 : undefined,
              marginBottom: collapsed ? 0 : undefined,
              transition: 'opacity 200ms ease, width 200ms ease, height 200ms ease, padding 200ms ease',
              transitionDelay: collapsed ? '0ms' : '150ms',
            }}
          >
            Operacional
          </div>
          {collapsed && <div className="my-2 mx-2 border-t border-slate-800" />}

          <NavLink to="/scanner" className={navClass}>
            <ScanBarcode size={20} className="flex-shrink-0" />
            <span style={txtStyle}>Scanner Entrada/Saída</span>
            <Tooltip label="Scanner Entrada/Saída" />
          </NavLink>
          <NavLink to="/inventory" className={navClass}>
            <Package size={20} className="flex-shrink-0" />
            <span style={txtStyle}>Almoxarifado</span>
            <Tooltip label="Almoxarifado" />
          </NavLink>
          <NavLink to="/assets" className={navClass}>
            <Monitor size={20} className="flex-shrink-0" />
            <span style={txtStyle}>Ativos Fixos</span>
            <Tooltip label="Ativos Fixos" />
          </NavLink>
          <NavLink to="/reports" className={navClass}>
            <FileText size={20} className="flex-shrink-0" />
            <span style={txtStyle}>Relatórios</span>
            <Tooltip label="Relatórios" />
          </NavLink>

          {user?.role === 'ADMIN' && (
            <>
              {/* Section label: Administrativo */}
              <div
                className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                style={{
                  ...txtStyle,
                  paddingTop: collapsed ? 0 : 16,
                  paddingBottom: collapsed ? 0 : 8,
                  height: collapsed ? 0 : 'auto',
                  transition: 'opacity 200ms ease, width 200ms ease, height 200ms ease, padding 200ms ease',
                  transitionDelay: collapsed ? '0ms' : '150ms',
                }}
              >
                Administrativo
              </div>
              {collapsed && <div className="my-2 mx-2 border-t border-slate-800" />}
              <NavLink to="/users" className={navClass}>
                <Users size={20} className="flex-shrink-0" />
                <span style={txtStyle}>Usuários</span>
                <Tooltip label="Usuários" />
              </NavLink>
              <NavLink to="/departments" className={navClass}>
                <Building2 size={20} className="flex-shrink-0" />
                <span style={txtStyle}>Setores</span>
                <Tooltip label="Setores" />
              </NavLink>
              <NavLink to="/audit" className={navClass}>
                <History size={20} className="flex-shrink-0" />
                <span style={txtStyle}>Auditoria e Logs</span>
                <Tooltip label="Auditoria e Logs" />
              </NavLink>
            </>
          )}
        </nav>

        <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-slate-800 transition-all duration-300`}>
          {/* User info */}
          {collapsed ? (
            <div className="relative group flex items-center justify-center mb-3 p-2">
              <UserCircle size={28} className="text-slate-400 flex-shrink-0" />
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                {user?.fullName}
                <br />
                <span className="text-slate-400">{user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</span>
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-4 px-2">
              <UserCircle size={32} className="text-slate-400 flex-shrink-0" />
              <div style={txtStyle}>
                <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sair do Sistema' : undefined}
            className={`relative group w-full flex items-center ${collapsed ? 'justify-center' : 'justify-center gap-2'} px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm`}
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span style={txtStyle}>Sair do Sistema</span>
            {collapsed && (
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                Sair do Sistema
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;