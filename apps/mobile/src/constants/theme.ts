export const colors = {
  // Primary (orange) — matches web platform
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  // Brown — brand accent
  brown: {
    50: '#fdf8f6',
    100: '#f2e8e5',
    200: '#eaddd7',
    300: '#d9a391',
    400: '#d9a391',
    500: '#c66c4c',
    600: '#b95130',
    700: '#9b4328',
    800: '#7c3a25',
    900: '#663222',
  },
  // Sidebar / navigation background
  sidebar: {
    DEFAULT: '#1e1b4b', // indigo-950
    dark: '#0f0e2b',
    light: '#312e81',
    active: '#f97316',
  },
  // Semantic
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#3b82f6',
  // Neutrals
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  white: '#ffffff',
  black: '#000000',
  // Surface colors — warm tints for different contexts
  surface: {
    DEFAULT: '#faf9f7',    // warm off-white (replaces cold gray-50 as page background)
    card: '#ffffff',         // card background stays white
    elevated: '#ffffff',     // elevated surfaces
    muted: '#f5f3f0',       // muted backgrounds (section dividers)
    brand: '#fff8f3',        // very subtle orange-tinted background
  },
  // Status surface tints (for card backgrounds)
  statusBg: {
    critical: '#fef2f2',    // red-50 tint
    low: '#fffbeb',         // amber-50 tint
    sufficient: '#f0fdf4',  // green-50 tint
    info: '#eff6ff',        // blue-50 tint
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
