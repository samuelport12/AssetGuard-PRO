/**
 * Bastion — Paleta de Cores Centralizada
 * ================================================
 * Todas as cores do sistema vivem aqui.
 * Importe este módulo em vez de usar hex codes inline.
 *
 * Design System baseado na paleta Tailwind CSS com tokens semânticos.
 */

// ─── Paleta Base (Tailwind) ─────────────────────────────────────────
export const slate = {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
} as const;

export const blue = {
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
} as const;

export const emerald = {
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
} as const;

export const red = {
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
} as const;

export const rose = {
    400: '#fb7185',
    500: '#f43f5e',
} as const;

export const amber = {
    400: '#fbbf24',
    500: '#f59e0b',
} as const;

export const orange = {
    400: '#fb923c',
    500: '#f97316',
} as const;

export const violet = {
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
} as const;

export const indigo = {
    500: '#6366f1',
    600: '#4f46e5',
} as const;

export const purple = {
    400: '#a78bfa',
} as const;

// ─── Tokens Semânticos ──────────────────────────────────────────────

/** Cores para status e feedback */
export const semantic = {
    success: emerald[500],
    successLight: emerald[400],
    danger: red[500],
    dangerLight: red[400],
    warning: amber[500],
    warningLight: amber[400],
    info: blue[500],
    infoLight: blue[400],
} as const;

/** Cores de gráficos e data-viz */
export const chart = {
    /** Entradas / positivo */
    entry: emerald[400],   // #34d399
    /** Saídas / negativo */
    exit: rose[400],      // #fb7185
    /** Série primária (barras, linhas) */
    primary: blue[500],      // #3b82f6
    /** Série secundária */
    secondary: red[500],       // #ef4444
    /** Série terciária / genérica */
    tertiary: '#8884d8',
    /** Grid / eixos */
    grid: slate[100],     // #f1f5f9
    gridAlt: '#f0f0f0',
    axisLine: slate[200],     // #e2e8f0
    /** Rótulos de eixos */
    tick: slate[400],     // #94a3b8
    /** Cursor / hover */
    cursor: slate[200],     // #e2e8f0
    /** Tooltip */
    tooltipBorder: slate[200],  // #e2e8f0
    tooltipLabel: slate[800],  // #1e293b
    tooltipText: slate[500],  // #64748b
    tooltipMuted: slate[400],  // #94a3b8
    /** Preço (evolução de preço) */
    price: blue[500],      // #3b82f6
} as const;

/** Gradientes reutilizáveis */
export const gradients = {
    /** Header / destaque do Dashboard */
    heroViolet: `linear-gradient(135deg, ${violet[600]} 0%, ${violet[500]} 50%, ${purple[400]} 100%)`,
    /** Botão principal (barcode, ações) */
    primaryBtn: `linear-gradient(135deg, ${indigo[500]} 0%, ${violet[500]} 100%)`,
    /** Rankings — 1º lugar */
    rank1: `linear-gradient(90deg, ${red[500]}, ${orange[500]})`,
    /** Rankings — 2º / 3º lugar */
    rank2: `linear-gradient(90deg, ${orange[500]}, ${amber[400]})`,
} as const;

/** Cores para Ranking (posição genérica) */
export const ranking = {
    top1: gradients.rank1,
    top2_3: gradients.rank2,
    default: slate[400],  // #94a3b8
} as const;

/** Barcode component */
export const barcode = {
    background: slate[50],  // #fafafa
    lineColor: slate[800], // #1e293b
} as const;

/** Cores de texto neutro reutilizáveis */
export const text = {
    primary: slate[800],  // #1e293b
    secondary: slate[500],  // #64748b
    muted: slate[400],  // #94a3b8
    light: slate[200],  // #e2e8f0
} as const;

// ─── Layout (Sidebar + Pág) ─────────────────────────────────────────

/** Cores da sidebar, header e plano de fundo da aplicação.
 *  Sidebar: Midnight Blue (#191970) · Background: #ECEFF1 */
export const layout = {
  /** Plano de fundo geral da página */
  pageBg:           '#ECEFF1',

  /** Sidebar — fundo principal */
  sidebarBg:        '#191970',
  /** Sidebar — borda / divisória */
  sidebarBorder:    '#232396',
  /** Sidebar — item ativo */
  sidebarActive:    '#2E2EB8',
  /** Sidebar — hover sobre item */
  sidebarHover:     '#222290',
  /** Sidebar — texto primário */
  sidebarText:      '#ffffff',
  /** Sidebar — texto secundário / labels de seção */
  sidebarTextMuted: 'rgba(255, 255, 255, 0.50)',
  /** Sidebar — texto inativo (itens de menu) */
  sidebarTextDim:   'rgba(255, 255, 255, 0.65)',
  /** Sidebar — logo accent */
  sidebarLogo:      '#4169E1',       // Royal Blue
  /** Sidebar — botão logout fundo */
  sidebarLogoutBg:  '#222290',
  /** Sidebar — botão logout hover */
  sidebarLogoutHover: '#2E2EB8',
  /** Sidebar — sombra ativa */
  sidebarActiveShadow: 'rgba(46, 46, 184, 0.35)',
} as const;

// ─── CORES_DASHBOARD (atalho de compatibilidade) ────────────────────
export const COLORS_DASHBOARD = [blue[500], red[500]] as const;
