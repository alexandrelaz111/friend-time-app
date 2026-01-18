import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getFriendTimeStats, getStatsForPeriod } from '../services/friendService';
import { FriendTimeStats } from '../types';

export const HomeScreen: React.FC = () => {
  const { user, isLocationEnabled, enableLocation } = useAuth();
  const [stats, setStats] = useState<FriendTimeStats[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState({ hours: 0, friends: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Stats par ami
      const friendStats = await getFriendTimeStats(user.id);
      setStats(friendStats);

      // Stats du mois en cours
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const periodStats = await getStatsForPeriod(user.id, startOfMonth, endOfMonth);
      setMonthlyTotal({
        hours: periodStats.totalHours,
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }
    return `${hours}h`;
  };

  const getCurrentMonth = (): string => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[new Date().getMonth()];
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Salut {user?.username} !</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, isLocationEnabled ? styles.statusActive : styles.statusInactive]} />
          <Text style={styles.statusText}>
            {isLocationEnabled ? 'Tracking actif' : 'Tracking inactif'}
          </Text>
        </View>
      </View>

      {/* Alerte si localisation désactivée */}
      {!isLocationEnabled && (
        <TouchableOpacity style={styles.alertCard} onPress={enableLocation}>
          <Text style={styles.alertTitle}>Localisation désactivée</Text>
          <Text style={styles.alertText}>
            Active la localisation pour mesurer le temps passé avec tes amis
          </Text>
          <Text style={styles.alertAction}>Activer maintenant</Text>
        </TouchableOpacity>
      )}

      {/* Carte résumé du mois */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{getCurrentMonth()} 2025</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{formatTime(monthlyTotal.hours)}</Text>
            <Text style={styles.summaryLabel}>passées ensemble</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{monthlyTotal.friends}</Text>
            <Text style={styles.summaryLabel}>amis vus</Text>
          </View>
        </View>
      </View>

      {/* Liste des amis avec temps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Temps par ami</Text>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Chargement...</Text>
          </View>
        ) : stats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Pas encore de données</Text>
            <Text style={styles.emptyText}>
              Ajoute des amis et passe du temps avec eux pour voir tes statistiques
            </Text>
          </View>
        ) : (
          stats.map((stat, index) => (
            <View key={stat.friend_id} style={styles.friendCard}>
              <View style={styles.friendRank}>
                <Text style={styles.friendRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{stat.friend.username}</Text>
                <Text style={styles.friendMeta}>
                  {stat.sessions_count} session{stat.sessions_count > 1 ? 's' : ''}
                  {stat.last_seen && ` • Vu le ${new Date(stat.last_seen).toLocaleDateString('fr-FR')}`}
                </Text>
              </View>
              <View style={styles.friendTime}>
                <Text style={styles.friendTimeValue}>{formatTime(stat.total_hours)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
    fontSize: 24,
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
    fontSize: 12,
  },
  alertCard: {
    backgroundColor: '#7c2d12',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertText: {
    color: '#fed7aa',
    fontSize: 14,
    marginBottom: 8,
  },
  alertAction: {
    color: '#fb923c',
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 36,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: '#c7d2fe',
    fontSize: 12,
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
    fontSize: 18,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  friendMeta: {
    color: '#64748b',
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '700',
  },
});
