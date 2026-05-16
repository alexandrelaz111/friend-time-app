// src/components/HeroStatCard.tsx
// Carte hero du HomeScreen — gradient Ember->Honey + gros chiffres serif italique.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { THEME } from '../theme';

interface HeroStatCardProps {
  month: string;       // ex: "Mai 2026"
  hoursLabel: string;  // ex: "12h" (format en amont)
  friendsCount: number;
}

export const HeroStatCard: React.FC<HeroStatCardProps> = ({ month, hoursLabel, friendsCount }) => {
  const { t } = useTranslation();
  return (
    <LinearGradient
      colors={['#E66A3C', '#F2B95C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.card, THEME.shadow.hero]}
    >
      {/* Anneaux decoratifs */}
      <View style={[s.ring, { right: -40, top: -40, width: 160, height: 160 }]} />
      <View style={[s.ring, { right: 6, top: 18, width: 80, height: 80 }]} />

      <Text style={s.eyebrow}>{month}</Text>

      <View style={s.row}>
        <View style={s.stat}>
          <Text style={s.num}>{hoursLabel}</Text>
          <Text style={s.label}>{t('home.togetherMonth')}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.stat}>
          <Text style={s.num}>{friendsCount}</Text>
          <Text style={s.label}>{friendsCount === 1 ? t('home.friendSeen') : t('home.friendsSeen')}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const s = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingVertical: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  eyebrow: {
    color: '#FFFFFF',
    opacity: 0.9,
    fontSize: 11,
    fontFamily: THEME.font.bodyBold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 14,
    gap: 18,
    zIndex: 1,
  },
  stat: { flex: 1 },
  num: {
    color: '#FFFFFF',
    fontFamily: THEME.font.display,
    fontSize: 60,
    lineHeight: 64,
    letterSpacing: -1.2,
  },
  label: {
    color: '#FFFFFF',
    opacity: 0.95,
    fontSize: 13,
    marginTop: 6,
    fontFamily: THEME.font.body,
  },
  divider: {
    width: 1,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
