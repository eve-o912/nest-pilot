/**
 * Design System for Nest Financial Platform
 * 
 * Design Philosophy:
 * - Grounded in the subject: Financial data, Kenyan context, business operations
 * - Deliberate, opinionated choices - not templated defaults
 * - Typography carries personality
 * - Structure encodes information
 * - Motion used deliberately
 * 
 * Palette: Inspired by Kenyan financial context
 * - Deep navy for trust and authority
 * - Warm terracotta for the African market context
 * - Sage green for growth and money
 * - Cream for warmth without being generic
 */

export const colors = {
  // Primary - Deep Navy (trust, authority, financial)
  primary: {
    50: '#E8EAF6',
    100: '#C5CAE9',
    200: '#9FA8DA',
    300: '#7986CB',
    400: '#5C6BC0',
    500: '#3F51B5',
    600: '#3949AB',
    700: '#303F9F',
    800: '#283593',
    900: '#1A237E',
  },
  
  // Accent - Terracotta (Kenyan warmth, distinctive)
  accent: {
    50: '#FBE9E7',
    100: '#FFCCBC',
    200: '#FFAB91',
    300: '#FF8A65',
    400: '#FF7043',
    500: '#E64A19',
    600: '#D84315',
    700: '#BF360C',
    800: '#A02E0A',
    900: '#872200',
  },
  
  // Success - Sage Green (growth, money, not generic green)
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },
  
  // Warning - Amber (not generic yellow)
  warning: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFC107',
    600: '#FFB300',
    700: '#FFA000',
    800: '#FF8F00',
    900: '#FF6F00',
  },
  
  // Error - Rose (not generic red)
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336',
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },
  
  // Neutral - Warm Gray (not generic gray)
  neutral: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },
  
  // Background - Cream (warmth, not generic white)
  background: {
    DEFAULT: '#FFFBF5',
    paper: '#FFFFFF',
    elevated: '#F5F2EB',
  },
};

export const typography = {
  // Display - Characterful, used sparingly
  display: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  
  // Heading - Strong but not overpowering
  heading: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  
  // Body - Clean, readable
  body: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  
  // Caption/Meta - Small but legible
  caption: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  
  // Data/Mono - For numbers and financial data
  mono: {
    fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", monospace',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  
  // Type Scale
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',    // 48px
  },
};

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px - Subtle, not rounded
  DEFAULT: '0.25rem', // 4px - Slightly rounded
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

export const animation = {
  // Deliberate motion - not scattered effects
  duration: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
  },
  
  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
  },
};

// Signature element - The unique memorable thing
// For Nest: The "Financial Pulse" - a subtle breathing animation on key metrics
export const signature = {
  pulse: {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
};

// Segment-specific accent colors
export const segmentColors = {
  informal_business: {
    primary: colors.success,
    accent: colors.accent,
  },
  startup_founder: {
    primary: colors.primary,
    accent: colors.warning,
  },
  individual_gig: {
    primary: colors.accent,
    accent: colors.success,
  },
  sme_owner: {
    primary: colors.neutral,
    accent: colors.primary,
  },
};
