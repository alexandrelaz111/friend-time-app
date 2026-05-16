// src/screens/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPinOff, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getFriendTimeStats, getStatsForPeriod, getFriendSessions, computeStreak } from '../services/friendService';
import { FriendTimeStats, RootStackParamList } from '../types';
import { THEME, formatHours, formatRelativeDate } from '../theme';
import { HeroStatCard } from '../components/HeroStatCard';
import { FriendRow } from '../components/FriendRow';
import { StatusPill } from '../components/StatusPill';

// Génère des insights fun et personnalisés
const generateInsights = (stats: FriendTimeStats[], monthlyTotal: { hours: number; friends: number }, t: (key: string, opts?: Record<string, any>) => string): string[] => {
  const insights: string[] = [];
  if (stats.length === 0) return insights;

  const currentMonth = t(`months.${new Date().getMonth()}`);

  // Top ami
  const top = stats[0];
  if (top && top.total_hours > 0) {
    const h = formatHours(top.total_hours);
    insights.push(t('insights.topFriend', { hours: h, name: top.friend.username, month: currentMonth }));
  }

  // Lieu prefere du top ami
  if (top?.last_place_emoji && top?.last_place_name) {
    const text = top.last_city
      ? t('insights.lastSpotCity', { name: top.friend.username, place: top.last_place_name, city: top.last_city })
      : t('insights.lastSpot', { name: top.friend.username, place: top.last_place_name });
    insights.push(`${top.last_place_emoji} ${text}`);
  }

  // Nombre de sessions total
  const totalSessions = stats.reduce((sum, s) => sum + s.sessions_count, 0);
  if (totalSessions > 0) {
    insights.push(t(totalSessions > 1 ? 'insights.moments_plural' : 'insights.moments', { count: totalSessions }));
  }

  // Comparaison fun du temps
  if (monthlyTotal.hours >= 1) {
    const movies = Math.floor(monthlyTotal.hours / 1.5);
    if (movies >= 1) {
      insights.push(t(movies > 1 ? 'insights.movieComparison_plural' : 'insights.movieComparison', { hours: formatHours(monthlyTotal.hours), count: movies }));
    }
  }

  // Plusieurs amis vus
  if (monthlyTotal.friends > 1) {
    insights.push(t('insights.multipleFriends', { count: monthlyTotal.friends, month: currentMonth }));
  }

  // Si vu recemment
  if (top?.last_seen) {
    const daysAgo = Math.floor((Date.now() - new Date(top.last_seen).getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) {
      insights.push(t('insights.seenToday', { name: top.friend.username }));
    } else if (daysAgo === 1) {
      insights.push(t('insights.seenYesterday', { name: top.friend.username }));
    }
  }

  return insights;
};

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLocationEnabled, enableLocation } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<FriendTimeStats[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [monthlyTotal, setMonthlyTotal] = useState({ hours: 0, friends: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    if (!user) return;
    try {
      const friendStats = await getFriendTimeStats(user.id);
      setStats(friendStats);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const periodStats = await getStatsForPeriod(user.id, startOfMonth, endOfMonth);
      setMonthlyTotal({ hours: periodStats.totalHours, friends: periodStats.friendsCount });

      // Charger les streaks pour chaque ami
      const streakMap: Record<string, number> = {};
      for (const stat of friendStats) {
        const sessions = await getFriendSessions(user.id, stat.friend_id);
        streakMap[stat.friend_id] = computeStreak(sessions);
      }
      setStreaks(streakMap);
    } catch (e) {
      console.error('Erreur chargement stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadStats(); }, [user]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const getCurrentMonth = () => {
    return `${t(`months.${new Date().getMonth()}`)} ${new Date().getFullYear()}`;
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.color.ember} />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting}>
          {t('home.greeting')} <Text style={s.greetingName}>{user?.username}</Text>
        </Text>
        <StatusPill tone={isLocationEnabled ? 'on' : 'off'}>
          {isLocationEnabled ? t('home.trackingOn') : t('home.trackingOff')}
        </StatusPill>
      </View>

      {/* Alerte localisation */}
      {!isLocationEnabled && (
        <Pressable onPress={enableLocation} style={s.alert}>
          <View style={s.alertIcon}>
            <MapPinOff size={20} color="#FFFFFF" strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>{t('home.locationDisabled')}</Text>
            <Text style={s.alertText}>{t('home.locationDisabledText')}</Text>
          </View>
          <Text style={s.alertCta}>{t('home.enable')}</Text>
        </Pressable>
      )}

      {/* Hero stat card */}
      <HeroStatCard
        month={getCurrentMonth()}
        hoursLabel={formatHours(monthlyTotal.hours)}
        friendsCount={monthlyTotal.friends}
      />

      {/* Insights fun */}
      {!loading && stats.length > 0 && (
        <View style={s.insightsSection}>
          <View style={s.insightsHeader}>
            <Sparkles size={14} color={THEME.color.honey} strokeWidth={2} />
            <Text style={s.insightsTitle}>{t('insights.title')}</Text>
          </View>
          {generateInsights(stats, monthlyTotal, t).slice(0, 3).map((text, i) => (
            <View key={i} style={s.insightRow}>
              <View style={s.insightDot} />
              <Text style={s.insightText}>{text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Classement */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{t('home.timePerFriend')}</Text>
        <Text style={s.sectionEyebrow}>{t('home.thisMonth')}</Text>
      </View>

      {loading ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>{t('home.loading')}</Text>
        </View>
      ) : stats.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>{t('home.noData')}</Text>
          <Text style={s.emptyText}>
            {t('home.noDataText')}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {stats.map((stat, i) => (
            <FriendRow
              key={stat.friend_id}
              rank={i + 1}
              name={stat.friend.username}
              avatarUrl={stat.friend.avatar_url}
              streak={streaks[stat.friend_id]}
              sessions={stat.sessions_count}
              lastSeen={formatRelativeDate(stat.last_seen, t)}
              time={formatHours(stat.total_hours)}
              lastPlaceEmoji={stat.last_place_emoji}
              lastPlaceName={stat.last_place_name}
              lastCity={stat.last_city}
              onPress={() => navigation.navigate('FriendDetail', {
                friendId: stat.friend_id,
                friendName: stat.friend.username,
                friendAvatarUrl: stat.friend.avatar_url,
              })}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.color.cream },
  content: { padding: 20, paddingBottom: 32, gap: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  greeting: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 28,
    color: THEME.color.ink,
    letterSpacing: -0.5,
  },
  greetingName: {
    fontFamily: THEME.font.display,
    fontWeight: '400',
  },
  alert: {
    backgroundColor: THEME.color.honeySoft,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  alertIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: THEME.color.honey,
    alignItems: 'center', justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontFamily: THEME.font.bodyBold,
    color: THEME.color.ink,
  },
  alertText: {
    fontSize: 12,
    fontFamily: THEME.font.body,
    color: THEME.color.walnut,
    marginTop: 2,
  },
  alertCta: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 13,
    color: THEME.color.honeyDeep,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 18,
    color: THEME.color.ink,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontFamily: THEME.font.bodySemibold,
    color: THEME.color.fg2,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  insightsSection: {
    backgroundColor: THEME.color.linen,
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: THEME.color.sandSoft,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  insightsTitle: {
    fontFamily: THEME.font.bodySemibold,
    fontSize: 13,
    color: THEME.color.honeyDeep,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  insightDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: THEME.color.honey,
    marginTop: 6,
  },
  insightText: {
    flex: 1,
    fontFamily: THEME.font.body,
    fontSize: 14,
    color: THEME.color.ink,
    lineHeight: 20,
  },
  empty: {
    backgroundColor: THEME.color.paper,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    ...THEME.shadow.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: THEME.font.bodyBold,
    color: THEME.color.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
    textAlign: 'center',
    lineHeight: 20,
  },
});
