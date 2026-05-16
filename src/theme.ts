// src/theme.ts
// FriendTime Design System — tokens partagés
// Miroir de colors_and_type.css. Source unique de vérité pour les couleurs RN.

export const THEME = {
  color: {
    // Neutres chauds
    cream:      '#F7F2EA',  // bg de l'app
    linen:      '#FBF6EE',  // surface élevée
    paper:      '#FFFFFF',  // carte par défaut
    shell:      '#F1E9DC',  // surface teintée
    sandSoft:   '#E8DFD2',  // divider / disabled
    sand:       '#B5A795',  // texte muet / hairlines
    walnut:     '#5A4A3E',  // texte secondaire
    ink:        '#1F1812',  // texte principal (warm near-black)

    // Marque
    ember:      '#E66A3C',  // primaire
    emberDeep:  '#C9532A',  // pressed
    emberSoft:  '#FCE3D5',  // tint
    emberWash:  '#FFF1E7',  // surface wash

    honey:      '#F2B95C',  // highlight
    honeySoft:  '#FDEBC8',
    honeyDeep:  '#C68C2A',

    plum:       '#8B5A6B',
    plumSoft:   '#ECDDE2',
    plumDeep:   '#6B3F50',

    // Sémantique
    sage:       '#5C8F6E',  // positif / "proche"
    sageSoft:   '#DCE9DF',
    sageDeep:   '#3D6E50',

    tomato:     '#C7472F',  // danger
    tomatoSoft: '#F7D9D2',

    sky:        '#6B91A8',
    skySoft:    '#DCE6EC',

    // Alias texte
    fg:   '#1F1812',
    fg2:  '#5A4A3E',
    fg3:  '#B5A795',
  },

  font: {
    display: 'InstrumentSerif_400Regular_Italic',  // gros chiffres
    displayRoman: 'InstrumentSerif_400Regular',
    body: 'PlusJakartaSans_400Regular',
    bodyMedium: 'PlusJakartaSans_500Medium',
    bodySemibold: 'PlusJakartaSans_600SemiBold',
    bodyBold: 'PlusJakartaSans_700Bold',
  },

  // Toutes les valeurs en multiples de 4
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 },

  radius: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, xxl: 36, pill: 999 },

  // Ombres : iOS uniquement (Android ignore shadowOffset, utilise elevation)
  shadow: {
    sm: {
      shadowColor: '#2D1E0F',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#2D1E0F',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },
    lg: {
      shadowColor: '#2D1E0F',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.12,
      shadowRadius: 40,
      elevation: 10,
    },
    hero: {
      shadowColor: '#E66A3C',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.30,
      shadowRadius: 32,
      elevation: 12,
    },
  },
} as const;

// Couleurs d'avatar — 5 tons chauds, assignées par hash du nom
export const AVATAR_COLORS = [
  { bg: '#E66A3C', fg: '#FFFFFF' },  // ember
  { bg: '#F2B95C', fg: '#1F1812' },  // honey
  { bg: '#8B5A6B', fg: '#FFFFFF' },  // plum
  { bg: '#5C8F6E', fg: '#FFFFFF' },  // sage
  { bg: '#6B91A8', fg: '#FFFFFF' },  // sky
];

export function avatarColorFor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Helpers de formatage (extraits du HomeScreen original)
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}`;
}

export function formatRelativeDate(iso?: string, t?: (key: string, opts?: Record<string, any>) => string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (t) {
    if (days === 0) return t('common.seenToday');
    if (days === 1) return t('common.seenYesterday');
    if (days < 7) return t('common.seenDaysAgo', { count: days });
    if (days < 30) return t('common.seenWeeksAgo', { count: Math.floor(days / 7) });
    return t('common.seenOn', { date: d.toLocaleDateString('fr-FR') });
  }
  // Fallback without translator
  if (days === 0) return "Vu aujourd'hui";
  if (days === 1) return 'Vu hier';
  if (days < 7) return `Vu il y a ${days} j`;
  if (days < 30) return `Vu il y a ${Math.floor(days / 7)} sem`;
  return `Vu le ${d.toLocaleDateString('fr-FR')}`;
}
