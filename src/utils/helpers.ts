/**
 * Calcule la distance entre deux points GPS en mètres (formule Haversine)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Rayon de la Terre en mètres

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

/**
 * Formate une durée en secondes en texte lisible
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
};

/**
 * Formate une date en texte relatif (il y a X minutes/heures/jours)
 */
export const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'À l\'instant';
  }

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Il y a ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'Hier';
  }

  if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  }

  return then.toLocaleDateString('fr-FR');
};

/**
 * Génère une couleur à partir d'une chaîne (pour les avatars)
 */
export const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#0ea5e9', // Sky
    '#3b82f6', // Blue
  ];

  return colors[Math.abs(hash) % colors.length];
};

/**
 * Valide un email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valide un nom d'utilisateur (3-20 caractères, alphanumérique + underscore)
 */
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Obtient le nom du mois en français
 */
export const getMonthName = (monthIndex: number): string => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[monthIndex];
};

/**
 * Formate un mois (YYYY-MM) en texte lisible
 */
export const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  return `${getMonthName(parseInt(month) - 1)} ${year}`;
};
