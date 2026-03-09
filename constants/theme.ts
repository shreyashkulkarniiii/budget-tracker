export const Colors = {
  dark: {
    background: '#0A0A0A',
    surface: '#1A1A1A',
    surfaceLight: '#2A2A2A',
    primary: '#00D9B1',
    primaryDark: '#00B393',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#333333',
    error: '#FF5252',
    success: '#4CAF50',
    warning: '#FFC107',

    // Category colors
    categories: {
      Food: '#FF6B6B',
      Transport: '#4ECDC4',
      Shopping: '#FFD93D',
      Entertainment: '#A78BFA',
      Bills: '#FB923C',
      Health: '#34D399',
      Others: '#94A3B8',
    },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
