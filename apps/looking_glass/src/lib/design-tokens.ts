/**
 * Ariadne Design System - Tokens & Style Guide
 * Based on Coalescence Design Principles
 */

export const COLORS = {
  // Primary & Accents
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c3d66',
  },

  // Semantic Colors
  success: {
    light: '#10b981',
    DEFAULT: '#059669',
    dark: '#047857',
  },

  warning: {
    light: '#f59e0b',
    DEFAULT: '#d97706',
    dark: '#b45309',
  },

  error: {
    light: '#ef4444',
    DEFAULT: '#dc2626',
    dark: '#991b1b',
  },

  info: {
    light: '#06b6d4',
    DEFAULT: '#0891b2',
    dark: '#164e63',
  },

  // Neutral
  neutral: {
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
    950: '#030712',
  },
};

export const GRADIENTS = {
  border: {
    indigo: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    blue: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
    emerald: 'linear-gradient(135deg, #059669, #10b981)',
    red: 'linear-gradient(135deg, #dc2626, #ef4444)',
  },

  background: {
    indigo: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(124, 58, 237, 0.1))',
    blue: 'linear-gradient(135deg, rgba(2, 132, 199, 0.1), rgba(14, 165, 233, 0.1))',
    emerald: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.1))',
  },
};

export const SHADOWS = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',

  glow: {
    indigo: '0 0 20px rgba(79, 70, 229, 0.3)',
    blue: '0 0 20px rgba(2, 132, 199, 0.3)',
    emerald: '0 0 20px rgba(16, 185, 129, 0.3)',
  },
};
