export const tokens = {
  bg: {
    primary: '#ffffff',
    surface: '#f9fafb',
    elevated: '#f3f4f6',
    hover: '#f3f4f6',
  },
  border: {
    default: '#e5e7eb',
    subtle: '#f3f4f6',
    strong: '#d1d5db',
  },
  accent: {
    primary: '#f97316',
    hover: '#ea6c0a',
    muted: 'rgba(249,115,22,0.08)',
    mutedBorder: 'rgba(249,115,22,0.2)',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    muted: '#9ca3af',
  },
  status: {
    success: '#16a34a',
    successMuted: 'rgba(22,163,74,0.08)',
    warning: '#d97706',
    warningMuted: 'rgba(217,119,6,0.08)',
    error: '#dc2626',
    errorMuted: 'rgba(220,38,38,0.08)',
    info: '#2563eb',
    infoMuted: 'rgba(37,99,235,0.08)',
  },
  font: {
    mono: '"Geist Mono", "Fira Code", monospace',
    sans: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
  },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    elevated: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    focus: '0 0 0 3px rgba(249,115,22,0.15)',
    sidebar: '1px 0 0 #e5e7eb',
  },
} as const

// Blue/black/white theme — used on agents page
export const agentTokens = {
  bg: {
    primary: '#ffffff',
    surface: '#f8fafc',
    elevated: '#f1f5f9',
    hover: '#e8f0fe',
    terminal: '#0d1117',
    terminalSurface: '#161b22',
    terminalBorder: '#21262d',
  },
  border: {
    default: '#e2e8f0',
    subtle: '#f1f5f9',
    strong: '#cbd5e1',
    accent: 'rgba(37,99,235,0.25)',
  },
  accent: {
    primary: '#2563eb',
    hover: '#1d4ed8',
    muted: 'rgba(37,99,235,0.07)',
    mutedBorder: 'rgba(37,99,235,0.2)',
    bright: '#3b82f6',
  },
  text: {
    primary: '#0f172a',
    secondary: '#334155',
    muted: '#94a3b8',
    terminal: '#e2e8f0',
    terminalMuted: '#8b949e',
    terminalAccent: '#79c0ff',
  },
  status: {
    success: '#16a34a',
    successMuted: 'rgba(22,163,74,0.08)',
    warning: '#d97706',
    warningMuted: 'rgba(217,119,6,0.08)',
    error: '#dc2626',
    errorMuted: 'rgba(220,38,38,0.08)',
    info: '#2563eb',
    infoMuted: 'rgba(37,99,235,0.08)',
  },
  font: {
    mono: '"Geist Mono", "Fira Code", "JetBrains Mono", monospace',
    sans: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '10px',
    xl: '14px',
  },
  shadow: {
    card: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    elevated: '0 4px 12px rgba(15,23,42,0.1), 0 2px 4px rgba(15,23,42,0.06)',
    focus: '0 0 0 3px rgba(37,99,235,0.18)',
    terminal: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  },
} as const

export type Tokens = typeof tokens
export type AgentTokens = typeof agentTokens
