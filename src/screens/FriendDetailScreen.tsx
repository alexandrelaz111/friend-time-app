// src/screens/FriendDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Clock3, Calendar, Flame } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getFriendSessions, computeStreak } from '../services/friendService';
import { supabase } from '../services/supabase';
import { TimeSession, RootStackParamList, User } from '../types';
import { useTranslation } from 'react-i18next';
import { THEME, formatHours } from '../theme';
import { Avatar } from '../components/Avatar';
import { StreakBadge } from '../components/StreakBadge';

type DetailRoute = RouteProp<RootStackParamList, 'FriendDetail'>;

const formatSessionDate = (iso: string, t: (key: string, opts?: Record<string, any>) => string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('detail.today');
  if (diffDays === 1) return t('detail.yesterday');
  if (diffDays < 7) return t('detail.daysAgo', { count: diffDays });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}`;
};

export const FriendDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<DetailRoute>();
  const { friendId, friendName, friendAvatarUrl } = route.params;
  const { user } = useAuth();

  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [friend, setFriend] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [sessionsData, profileData] = await Promise.all([
          getFriendSessions(user.id, friendId),
          supabase.from('profiles').select('*').eq('id', friendId).single(),
        ]);
        setSessions(sessionsData);
        if (profileData.data) setFriend(profileData.data as User);
      } catch (e) {
        console.error('Erreur chargement detail ami:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, friendId]);

  const streak = computeStreak(sessions);
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalHours = totalSeconds / 3600;
  const avatarUrl = friend?.avatar_url || friendAvatarUrl;

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={THEME.color.ember} size="large" />
      </View>
    );
  }

  // Grouper par date
  const sessionsByDate = new Map<string, TimeSession[]>();
  for (const session of sessions) {
    const label = formatSessionDate(session.started_at, t);
    const existing = sessionsByDate.get(label) || [];
    existing.push(session);
    sessionsByDate.set(label, existing);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header profil */}
      <View style={s.profileHeader}>
        <Avatar name={friendName} imageUrl={avatarUrl} size={88} />
        <View style={s.nameRow}>
          <Text style={s.name}>{friendName}</Text>
          <StreakBadge streak={streak} />
        </View>
        {friend?.email && <Text style={s.email}>{friend.email}</Text>}
      </View>

      {/* Stats */}
      <View style={[s.statsCard, THEME.shadow.sm]}>
        <View style={s.statItem}>
          <View style={[s.statIcon, { backgroundColor: THEME.color.emberSoft }]}>
            <Clock3 size={18} color={THEME.color.ember} strokeWidth={1.75} />
          </View>
          <Text style={s.statValue}>{formatHours(totalHours)}</Text>
          <Text style={s.statLabel}>{t('detail.together')}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <View style={[s.statIcon, { backgroundColor: THEME.color.sageSoft }]}>
            <Calendar size={18} color={THEME.color.sage} strokeWidth={1.75} />
          </View>
          <Text style={s.statValue}>{sessions.length}</Text>
          <Text style={s.statLabel}>{sessions.length === 1 ? t('detail.session') : t('detail.sessions')}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <View style={[s.statIcon, { backgroundColor: THEME.color.honeySoft }]}>
            <Flame size={18} color={THEME.color.honeyDeep} strokeWidth={1.75} />
          </View>
          <Text style={s.statValue}>{streak > 0 ? `${streak}j` : '—'}</Text>
          <Text style={s.statLabel}>{t('detail.streak')}</Text>
        </View>
      </View>

      {/* Historique */}
      <Text style={s.sectionTitle}>{t('detail.history')}</Text>

      {sessions.length === 0 ? (
        <View style={[s.emptyCard, THEME.shadow.sm]}>
          <Text style={s.emptyTitle}>{t('detail.noSessions')}</Text>
          <Text style={s.emptyText}>
            {t('detail.noSessionsText', { name: friendName })}
          </Text>
        </View>
      ) : (
        Array.from(sessionsByDate.entries()).map(([dateLabel, dateSessions]) => (
          <View key={dateLabel} style={s.dateGroup}>
            <Text style={s.dateLabel}>{dateLabel}</Text>
            {dateSessions.map((session) => (
              <View key={session.id} style={[s.sessionCard, THEME.shadow.sm]}>
                <Text style={s.sessionEmoji}>
                  {session.place_emoji || '📍'}
                </Text>
                <View style={s.sessionInfo}>
                  <Text style={s.sessionPlace}>
                    {session.place_name || t('detail.unknownPlace')}
                  </Text>
                  {session.city ? (
                    <Text style={s.sessionCity}>{session.city}</Text>
                  ) : null}
                </View>
                <Text style={s.sessionDuration}>
                  {formatDuration(session.duration_seconds)}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.color.cream },
  content: { padding: 20, paddingBottom: 40 },
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: THEME.color.cream,
  },

  // Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  name: {
    fontFamily: THEME.font.display,
    fontSize: 34,
    lineHeight: 36,
    color: THEME.color.ink,
  },
  email: {
    fontFamily: THEME.font.body,
    fontSize: 13,
    color: THEME.color.fg2,
    marginTop: 4,
  },

  // Stats
  statsCard: {
    backgroundColor: THEME.color.paper,
    borderRadius: 22,
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: {
    fontFamily: THEME.font.display,
    fontSize: 26,
    lineHeight: 28,
    color: THEME.color.ink,
  },
  statLabel: {
    fontFamily: THEME.font.body,
    fontSize: 11,
    color: THEME.color.fg2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: THEME.color.sandSoft,
    marginVertical: 6,
  },

  // Section
  sectionTitle: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 18,
    color: THEME.color.ink,
    marginBottom: 14,
  },

  // Date groups
  dateGroup: {
    marginBottom: 16,
  },
  dateLabel: {
    fontFamily: THEME.font.bodySemibold,
    fontSize: 12,
    color: THEME.color.fg2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Session card
  sessionCard: {
    backgroundColor: THEME.color.paper,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sessionEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionPlace: {
    fontFamily: THEME.font.bodySemibold,
    fontSize: 15,
    color: THEME.color.ink,
  },
  sessionCity: {
    fontFamily: THEME.font.body,
    fontSize: 12,
    color: THEME.color.fg2,
    marginTop: 2,
  },
  sessionDuration: {
    fontFamily: THEME.font.display,
    fontSize: 22,
    lineHeight: 24,
    color: THEME.color.ember,
  },

  // Empty
  emptyCard: {
    backgroundColor: THEME.color.paper,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 16,
    color: THEME.color.ink,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: THEME.font.body,
    fontSize: 13,
    color: THEME.color.fg2,
    textAlign: 'center',
    lineHeight: 20,
  },
});
