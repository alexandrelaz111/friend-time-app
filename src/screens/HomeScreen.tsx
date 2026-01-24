import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getFriendTimeStatsLive, getStatsForPeriodLive, getActiveSessions } from '../services/friendService';
import { FriendTimeStats } from '../types';
import { normalizeFont } from '../utils/helpers';
import { useTheme } from '../theme/colors';

export const HomeScreen: React.FC = () => {
  const { user, isLocationEnabled, enableLocation } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState<FriendTimeStats[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [monthlyTotal, setMonthlyTotal] = useState({ seconds: 0, friends: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [baseStats, setBaseStats] = useState<FriendTimeStats[]>([]); // Stats de base (sans sessions actives)
  const [baseMonthlySeconds, setBaseMonthlySeconds] = useState(0); // Total du mois sans sessions actives

  // Calcule localement le temps des sessions actives du mois
  const calculateActiveSessionsTime = useCallback((sessions: any[], currentTime: Date) => {
    const now = currentTime;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let totalSeconds = 0;
    const friendIds = new Set<string>();

    for (const session of sessions) {
      const startTime = new Date(session.started_at);
      // Vérifier si la session active est dans le mois
      if (startTime >= startOfMonth && startTime <= endOfMonth) {
        const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
        totalSeconds += Math.max(0, elapsed);
        friendIds.add(session.friend_id);
      }
    }

    return { totalSeconds, friendsCount: friendIds.size };
  }, []);

  // Recalcule les stats localement avec currentTime (sans requête BD)
  const updateLiveStats = useCallback(async () => {
    if (!user) return;

    try {
      // Stats par ami EN TEMPS RÉEL (recalcul local)
      const friendStats = await getFriendTimeStatsLive(user.id, currentTime, activeSessions);
      setStats(friendStats);

      // Stats mensuelles EN TEMPS RÉEL (recalcul local)
      const activeTime = calculateActiveSessionsTime(activeSessions, currentTime);
      setMonthlyTotal({
        seconds: baseMonthlySeconds + activeTime.totalSeconds,
        friends: activeTime.friendsCount, // On pourrait améliorer pour compter tous les amis
      });
    } catch (error) {
      console.error('Erreur recalcul stats:', error);
    }
  }, [user, currentTime, activeSessions, baseMonthlySeconds, calculateActiveSessionsTime]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Sessions actives
      const sessions = await getActiveSessions(user.id);
      console.log('🔄 Sessions actives chargées:', sessions);
      setActiveSessions(sessions);

      // Stats par ami de base
      const friendStats = await getFriendTimeStatsLive(user.id, currentTime, sessions);
      setStats(friendStats);
      setBaseStats(friendStats);

      // Stats du mois en cours (sessions terminées seulement)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const periodStats = await getStatsForPeriodLive(user.id, startOfMonth, endOfMonth, currentTime, sessions);
      const baseSeconds = Math.round(periodStats.totalHours * 3600);
      setBaseMonthlySeconds(baseSeconds);
      
      // Calculer le temps des sessions actives et ajouter
      const activeTime = calculateActiveSessionsTime(sessions, currentTime);
      setMonthlyTotal({
        seconds: baseSeconds + activeTime.totalSeconds,
        friends: periodStats.friendsCount,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [user])
  );

  // Rafraîchissement automatique des sessions actives toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user) {
        await loadStats();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Timer pour mettre à jour l'heure actuelle chaque seconde (pour calcul durée en temps réel)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Recalcule les stats chaque fois que currentTime ou activeSessions changent
  useEffect(() => {
    updateLiveStats();
  }, [currentTime, activeSessions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}min ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Calcule la durée en temps réel depuis started_at (côté client)
  const calculateLiveDuration = (startedAt: string): number => {
    const start = new Date(startedAt);
    const diff = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    return Math.max(0, diff); // Évite les valeurs négatives
  };

  const getCurrentMonth = (): string => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[new Date().getMonth()];
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>Salut {user?.username} !</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
          <View style={[styles.statusDot, isLocationEnabled ? styles.statusActive : styles.statusInactive]} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {isLocationEnabled ? 'Tracking actif' : 'Tracking inactif'}
          </Text>
        </View>
      </View>

      {/* Alerte si localisation désactivée */}
      {!isLocationEnabled && (
        <TouchableOpacity style={[styles.alertCard, { backgroundColor: colors.alertBackground }]} onPress={enableLocation}>
          <Text style={[styles.alertTitle, { color: colors.text }]}>⚠️ Tracking désactivé</Text>
          <Text style={[styles.alertText, { color: colors.alertText }]}>
            Active la localisation pour commencer à mesurer le temps passé avec tes amis.
          </Text>
          <Text style={[styles.alertAction, { color: colors.alertAction }]}>Activer maintenant →</Text>
        </TouchableOpacity>
      )}

      {/* Sessions actives en cours */}
      {activeSessions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🟢 Sessions en cours</Text>
          {activeSessions.map((session) => (
            <View key={session.id} style={[styles.activeSessionCard, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <View style={styles.activeSessionHeader}>
                <Text style={[styles.activeSessionName, { color: colors.text }]}>
                  {session.friend?.username || 'Ami'}
                </Text>
                <View style={[styles.pulseDot, { backgroundColor: colors.success }]} />
              </View>
              <Text style={[styles.activeSessionDuration, { color: colors.success }]}>
                {formatDuration(calculateLiveDuration(session.started_at))}
              </Text>
              <Text style={[styles.activeSessionLabel, { color: colors.textSecondary }]}>
                Temps passé ensemble
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Carte résumé du mois */}
      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.summaryTitle}>{getCurrentMonth()} 2025</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{formatDuration(monthlyTotal.seconds || 0)}</Text>
            <Text style={styles.summaryLabel}>passées avec des amis</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.primaryLight }]} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{monthlyTotal.friends}</Text>
            <Text style={styles.summaryLabel}>amis vus</Text>
          </View>
        </View>
      </View>

      {/* Liste des amis avec temps */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Temps par ami</Text>

        {loading ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chargement...</Text>
          </View>
        ) : stats.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Pas encore de données</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Ajoute des amis et passe du temps avec eux pour voir tes statistiques
            </Text>
          </View>
        ) : (
          stats.map((stat, index) => (
            <View key={stat.friend_id} style={[styles.friendCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.friendRank, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.friendRankText, { color: colors.textSecondary }]}>#{index + 1}</Text>
              </View>
              <View style={styles.friendInfo}>
                <Text style={[styles.friendName, { color: colors.text }]}>{stat.friend.username}</Text>
                <Text style={[styles.friendMeta, { color: colors.textTertiary }]}>
                  {stat.sessions_count} session{stat.sessions_count > 1 ? 's' : ''}
                  {stat.last_seen && ` • Vu le ${new Date(stat.last_seen).toLocaleDateString('fr-FR')}`}
                </Text>
              </View>
              <View style={styles.friendTime}>
                <Text style={styles.friendTimeValue}>{formatDuration(stat.total_seconds || 0)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {
    fontSize: normalizeFont(24),
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: '#22c55e',
  },
  statusInactive: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: normalizeFont(12),
  },
  alertCard: {
    backgroundColor: '#7c2d12',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 44,
  },
  alertTitle: {
    color: '#fff',
    fontSize: normalizeFont(16),
    fontWeight: '600',
    marginBottom: 4,
  },
  alertText: {
    color: '#fed7aa',
    fontSize: normalizeFont(14),
    marginBottom: 8,
  },
  alertAction: {
    color: '#fb923c',
    fontSize: normalizeFont(14),
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  summaryTitle: {
    color: '#e0e7ff',
    fontSize: normalizeFont(14),
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    color: '#fff',
    fontSize: normalizeFont(36),
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: '#c7d2fe',
    fontSize: normalizeFont(12),
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#818cf8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: normalizeFont(18),
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: normalizeFont(16),
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: normalizeFont(14),
    textAlign: 'center',
  },
  friendCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendRankText: {
    color: '#94a3b8',
    fontSize: normalizeFont(12),
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: normalizeFont(16),
    fontWeight: '600',
  },
  friendMeta: {
    color: '#64748b',
    fontSize: normalizeFont(12),
    marginTop: 2,
  },
  friendTime: {
    backgroundColor: '#312e81',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  friendTimeValue: {
    color: '#a5b4fc',
    fontSize: normalizeFont(16),
    fontWeight: '700',
  },
  activeSessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  activeSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeSessionName: {
    fontSize: normalizeFont(16),
    fontWeight: '600',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.8,
  },
  activeSessionDuration: {
    fontSize: normalizeFont(28),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activeSessionLabel: {
    fontSize: normalizeFont(12),
  },
});
