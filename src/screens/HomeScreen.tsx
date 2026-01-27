import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { getFriendTimeStats, getStatsForPeriodLive, getActiveSessions } from '../services/friendService';
import { FriendTimeStats } from '../types';
import { normalizeFont } from '../utils/helpers';
import { useTheme } from '../theme/colors';

export const HomeScreen: React.FC = () => {
  const { user, isLocationEnabled, enableLocation } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState<FriendTimeStats[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [baseServerDurations, setBaseServerDurations] = useState<Record<string, number>>({});
  const [fetchTime, setFetchTime] = useState(Date.now());
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [serverTimestamp, setServerTimestamp] = useState(new Date());
  const [monthlyRange, setMonthlyRange] = useState({ startOfMonth: new Date(), endOfMonth: new Date() });
  const [monthlyTotal, setMonthlyTotal] = useState({ seconds: 0, friends: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [baseStats, setBaseStats] = useState<FriendTimeStats[]>([]); // Stats de base (sans sessions actives)
  const [baseMonthlySeconds, setBaseMonthlySeconds] = useState(0); // Total du mois sans sessions actives

  // Filtre intelligent: identifie les sessions valides basé sur la récence de la position
  // ARCHITECTURE: Filtre côté client = RÉACTIF (instantané) + LÉGER
  // NOTE: Utilise Date.now() au lieu de serverTimestamp pour ne pas déclencher de recalc tous les 5s
  const validActiveSessions = useMemo(() => {
    const nowTimestamp = Date.now();
    const maxInactivityMs = 3 * 60 * 1000; // 3 minutes d'inactivité max
    
    return activeSessions.filter(session => {
      // Cas 1: Pas de données de position du tout - session valide par défaut (données peuvent être en cours de synchronisation)
      if (!session.user_last_position_at && !session.friend_last_position_at) {
        return true;
      }
      
      // Cas 2: Au moins une position est présente - vérifier sa récence
      const userLastPositionAt = session.user_last_position_at 
        ? new Date(session.user_last_position_at).getTime() 
        : null;
      
      const friendLastPositionAt = session.friend_last_position_at 
        ? new Date(session.friend_last_position_at).getTime() 
        : null;
      
      // Si une position existe et est récente (< 3min), session valide
      // Cela tolère le cas où une personne a fermé l'app mais l'autre est active
      if (userLastPositionAt !== null) {
        const userInactivityMs = nowTimestamp - userLastPositionAt;
        if (userInactivityMs < maxInactivityMs) {
          return true; // Position utilisateur récente = session valide
        }
      }
      
      if (friendLastPositionAt !== null) {
        const friendInactivityMs = nowTimestamp - friendLastPositionAt;
        if (friendInactivityMs < maxInactivityMs) {
          return true; // Position ami récente = session valide
        }
      }
      
      // Aucune position récente trouvée
      return false;
    });
  }, [activeSessions]); // ← Dépend SEULEMENT de activeSessions, pas de serverTimestamp

  // Calcul memoized des durées des sessions VALIDES
  // ARCHITECTURE: serverDuration (du RPC) + temps écoulé depuis fetch = source unique de vérité
  // renderTrigger force les recalcs chaque seconde pour affichage fluide
  // NOTE: fetchTime NOT in dependencies - Date.now() is called directly, not referenced as dependency
  const activeSessionDurations = useMemo(() => {
    const durations = new Map<string, number>();
    const elapsedSinceFetch = Math.floor((Date.now() - fetchTime) / 1000);
    
    for (const session of validActiveSessions) {
      // Source de vérité = serverDuration du RPC + temps réel écoulé depuis fetch
      const serverDurationSeconds = baseServerDurations[session.id] || 0;
      const displayDuration = Math.round(serverDurationSeconds + elapsedSinceFetch);
      durations.set(session.id, displayDuration);
    }
    
    return durations;
  }, [validActiveSessions, baseServerDurations, renderTrigger]);

  // Stats mensuelles memoized (synchrone) - utilise validActiveSessions filtrées
  // ARCHITECTURE: serverDuration + temps réel écoulé depuis fetch
  // renderTrigger force les recalcs chaque seconde pour affichage fluide
  // NOTE: fetchTime NOT in dependencies - Date.now() is called directly, not referenced as dependency
  const monthlyTotalLive = useMemo(() => {
    const { startOfMonth, endOfMonth } = monthlyRange;
    const elapsedSinceFetch = Math.floor((Date.now() - fetchTime) / 1000);

    let totalSeconds = 0;
    const friendIds = new Set<string>();

    for (const session of validActiveSessions) {
      const startTime = new Date(session.started_at);
      if (startTime >= startOfMonth && startTime <= endOfMonth) {
        // Source unique: serverDuration + temps écoulé depuis fetch
        const serverDurationSeconds = baseServerDurations[session.id] || 0;
        const displayDuration = Math.round(serverDurationSeconds + elapsedSinceFetch);
        totalSeconds += displayDuration;
        friendIds.add(session.friend_id);
      }
    }

    return {
      seconds: baseMonthlySeconds + totalSeconds,
      friends: friendIds.size,
    };
  }, [monthlyRange, validActiveSessions, baseMonthlySeconds, baseServerDurations, renderTrigger]);

  // Stats par ami memoized (synchrone) - utilise validActiveSessions filtrées
  // ARCHITECTURE: serverDuration + temps réel écoulé depuis fetch
  // renderTrigger force les recalcs chaque seconde pour affichage fluide
  // NOTE: fetchTime NOT in dependencies - Date.now() is called directly, not referenced as dependency
  const statsLive = useMemo(() => {
    const elapsedSinceFetch = Math.floor((Date.now() - fetchTime) / 1000);
    
    return baseStats.map(stat => {
      const activeSessForFriend = validActiveSessions.filter(
        s => s.friend_id === stat.friend_id
      );

      const activeDuration = activeSessForFriend.reduce((sum, session) => {
        // Source unique: serverDuration + temps écoulé depuis fetch
        const serverDurationSeconds = baseServerDurations[session.id] || 0;
        const displayDuration = Math.round(serverDurationSeconds + elapsedSinceFetch);
        return sum + displayDuration;
      }, 0);

      const totalSeconds = stat.total_seconds + activeDuration;

      return {
        ...stat,
        total_seconds: totalSeconds,
        total_hours: Math.round((totalSeconds / 3600) * 10) / 10,
      };
    }).sort((a, b) => b.total_seconds - a.total_seconds);
  }, [validActiveSessions, baseStats, baseServerDurations, renderTrigger]);

  // Wrapper loadStats dans useCallback pour éviter les re-créations
  // ARCHITECTURE: Fetch données + store baseServerDurations + store fetchTime
  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      // Sessions actives
      const sessions = await getActiveSessions(user.id);
      setActiveSessions(sessions);

      // Stats par ami de base (SANS sessions actives - données historiques PURES)
      const friendStats = await getFriendTimeStats(user.id);
      setBaseStats(friendStats);

      // Stats du mois en cours (sessions terminées seulement)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const periodStats = await getStatsForPeriodLive(user.id, startOfMonth, endOfMonth, now, sessions);
      const baseSeconds = Math.round(periodStats.totalHours * 3600);
      setBaseMonthlySeconds(baseSeconds);
      
      // DÉCOUPLEZ: Stocker les dates du mois séparément
      setMonthlyRange({ startOfMonth, endOfMonth });
      
      // ARCHITECTURE: Stocker les durées serveur et le timestamp du fetch
      const durations: Record<string, number> = {};
      for (const session of sessions) {
        durations[session.id] = session.duration_seconds || 0;
      }
      setBaseServerDurations(durations);
      setFetchTime(Date.now());
      setServerTimestamp(new Date());
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  // TIMER EFFECT: Drift-corrected timer for precise 1-second intervals
  // Uses setTimeout with delay recalculation to stay synchronized to second boundaries
  // This ensures smooth real-time display while maintaining the single source of truth
  // Formula: display = serverDuration + (Date.now() - fetchTime) / 1000
  useEffect(() => {
    let lastTickTime = Date.now();
    let timeoutId: NodeJS.Timeout | null = null;
    
    const scheduleNextTick = () => {
      const now = Date.now();
      const elapsed = now - lastTickTime;
      // Calculate delay to next second boundary: how much time until next exact second
      const delay = Math.max(0, 1000 - (elapsed % 1000));
      
      timeoutId = setTimeout(() => {
        setRenderTrigger(prev => (prev + 1) % Number.MAX_SAFE_INTEGER);
        lastTickTime = Date.now();  // Capture exact moment of tick
        scheduleNextTick();
      }, delay);
    };
    
    scheduleNextTick();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // RECHARGEMENT EFFECT: Separate 5-second data refresh cycle with rate limiting
  useEffect(() => {
    let isLoading = false;
    
    const interval = setInterval(async () => {
      if (!isLoading && user) {
        isLoading = true;
        try {
          await loadStats();
        } catch (error) {
          console.error('Erreur rechargement async stats:', error);
        } finally {
          isLoading = false;
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);  // ← Round to integer

    if (hours > 0) {
      return `${hours}h ${minutes}min ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}min ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getCurrentMonth = (): string => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[serverTimestamp.getMonth()];
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
                {formatDuration(activeSessionDurations.get(session.id) || 0)}
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
            <Text style={styles.summaryValue}>{formatDuration(monthlyTotalLive.seconds || 0)}</Text>
            <Text style={styles.summaryLabel}>passées avec des amis</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.primaryLight }]} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{monthlyTotalLive.friends}</Text>
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
        ) : statsLive.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Pas encore de données</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Ajoute des amis et passe du temps avec eux pour voir tes statistiques
            </Text>
          </View>
        ) : (
          statsLive.map((stat, index) => (
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
