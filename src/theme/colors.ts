import { useColorScheme } from 'react-native';

export type ColorScheme = 'light' | 'dark';

// Palette de couleurs pour le mode sombre
export const darkColors = {
  // Arrière-plans
  background: '#0f172a',
  surface: '#1e293b',
  surfaceSecondary: '#334155',
  
  // Textes
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  
  // Couleurs principales
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  
  // Couleurs de statut
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#0ea5e9',
  
  // Cartes et bordures
  card: '#1e293b',
  cardHover: '#334155',
  border: '#334155',
  
  // Spécifiques
  alertBackground: '#7c2d12',
  alertText: '#fed7aa',
  alertAction: '#fb923c',
};

// Palette de couleurs pour le mode clair
export const lightColors = {
  // Arrière-plans
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSecondary: '#f1f5f9',
  
  // Textes
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#64748b',
  
  // Couleurs principales
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  
  // Couleurs de statut
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
  info: '#0284c7',
  
  // Cartes et bordures
  card: '#ffffff',
  cardHover: '#f8fafc',
  border: '#e2e8f0',
  
  // Spécifiques
  alertBackground: '#fef3c7',
  alertText: '#92400e',
  alertAction: '#ea580c',
};

/**
 * Hook pour récupérer les couleurs du thème actuel
 */
export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    colorScheme: colorScheme || 'dark',
  };
};

/**
 * Récupère les couleurs en fonction du schéma de couleur
 */
export const getColors = (scheme: ColorScheme | null | undefined) => {
  return scheme === 'light' ? lightColors : darkColors;
};
