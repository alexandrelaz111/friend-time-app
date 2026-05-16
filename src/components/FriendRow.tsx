// src/components/FriendRow.tsx
// Ligne d'ami — utilisee par HomeScreen (classement) et FriendsScreen (liste).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { THEME } from '../theme';
import { Avatar } from './Avatar';
import { StatusPill } from './StatusPill';
import { StreakBadge } from './StreakBadge';

interface FriendRowProps {
  name: string;
  avatarUrl?: string;
  streak?: number;
  rank?: number;
  sessions?: number;
  lastSeen?: string;       // texte deja formate ex: "Vu hier"
  time?: string;           // texte deja formate ex: "8h 32"
  lastPlaceEmoji?: string; // ex: "🎬"
  lastPlaceName?: string;  // ex: "Cinema"
  lastCity?: string;       // ex: "Paris"
  status?: 'near' | 'far';
  onPress?: () => void;
  onLongPress?: () => void;
}

export const FriendRow: React.FC<FriendRowProps> = ({
  name, avatarUrl, streak, rank, sessions, lastSeen, time,
  lastPlaceEmoji, lastPlaceName, lastCity,
  status, onPress, onLongPress,
}) => {
  const { t } = useTranslation();
  const meta = [
    sessions != null ? (sessions === 1 ? t('common.sessions_one', { count: sessions }) : t('common.sessions_other', { count: sessions })) : null,
    lastSeen || null,
  ].filter(Boolean).join(' · ');

  // Ligne lieu : emoji + nom + ville (si différente du nom)
  const placeLabel = lastPlaceEmoji
    ? [lastPlaceEmoji, lastPlaceName, lastCity ? `· ${lastCity}` : null]
        .filter(Boolean).join(' ')
    : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        s.card,
        THEME.shadow.sm,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
      ]}
    >
      {rank !== undefined && (
        <Text style={[s.rank, rank === 1 && { color: THEME.color.ember }]}>{rank}</Text>
      )}
      <Avatar name={name} imageUrl={avatarUrl} size={44} />
      <View style={s.info}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.name}>{name}</Text>
          <StreakBadge streak={streak || 0} />
        </View>
        {meta ? <Text style={s.meta}>{meta}</Text> : null}
        {placeLabel ? <Text style={s.place}>{placeLabel}</Text> : null}
      </View>
      {status === 'near' ? (
        <StatusPill tone="near">Proche</StatusPill>
      ) : status === 'far' ? (
        <Text style={s.far}>Loin</Text>
      ) : null}
      {time ? <Text style={s.time}>{time}</Text> : null}
    </Pressable>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: THEME.color.paper,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rank: {
    fontFamily: THEME.font.display,
    fontSize: 24,
    lineHeight: 24,
    color: THEME.color.fg2,
    width: 22,
    textAlign: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 15,
    fontFamily: THEME.font.bodySemibold,
    fontWeight: '600',
    color: THEME.color.ink,
  },
  meta: {
    fontSize: 12,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
    marginTop: 2,
  },
  place: {
    fontSize: 11,
    fontFamily: THEME.font.body,
    color: THEME.color.ember,
    marginTop: 3,
    opacity: 0.85,
  },
  time: {
    fontFamily: THEME.font.display,
    fontSize: 24,
    lineHeight: 24,
    color: THEME.color.ink,
  },
  far: {
    fontSize: 12,
    color: THEME.color.fg3,
    fontFamily: THEME.font.body,
  },
});
