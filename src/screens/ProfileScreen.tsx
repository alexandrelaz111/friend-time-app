// src/screens/ProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert, ScrollView, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MapPin, MapPinOff, Bell, ChevronRight, LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getFriends, getFriendTimeStats } from '../services/friendService';
import { THEME, formatHours } from '../theme';
import { Avatar } from '../components/Avatar';

export const ProfileScreen: React.FC = () => {
  const { user, signOut, isLocationEnabled, enableLocation, disableLocation } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileStats, setProfileStats] = useState({ totalHours: 0, friendsCount: 0, sessionsCount: 0 });

  const loadProfileStats = async () => {
    if (!user) return;
    try {
      const [friends, stats] = await Promise.all([
        getFriends(user.id),
        getFriendTimeStats(user.id),
      ]);
      const totalSessions = stats.reduce((sum, s) => sum + s.sessions_count, 0);
      const totalHours = stats.reduce((sum, s) => sum + s.total_hours, 0);
      setProfileStats({
        totalHours: Math.round(totalHours * 10) / 10,
        friendsCount: friends.length,
        sessionsCount: totalSessions,
      });
    } catch (e) {
      console.error('Erreur chargement stats profil:', e);
    }
  };

  useFocusEffect(useCallback(() => { loadProfileStats(); }, [user]));

  const handleToggleLocation = async (value: boolean) => {
    if (value) {
      const success = await enableLocation();
      if (!success) {
        Alert.alert(
          'Permission requise',
          "Autorise l'acces a la localisation dans les parametres de ton telephone."
        );
      }
    } else {
      Alert.alert(
        'Desactiver le tracking',
        'Tu ne pourras plus mesurer le temps passe avec tes amis. Continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Desactiver', style: 'destructive', onPress: disableLocation },
        ]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert('Deconnexion', 'Tu es sur de vouloir te deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Deconnecter',
        style: 'destructive',
        onPress: async () => { setLoggingOut(true); await signOut(); },
      },
    ]);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Carte profil */}
      <View style={[s.profileCard, THEME.shadow.sm]}>
        <Avatar name={user?.username} size={92} />
        <Text style={s.username}>{user?.username}</Text>
        <Text style={s.email}>{user?.email}</Text>

        <View style={s.statsRow}>
          <View style={s.statCol}>
            <Text style={[s.statValue, { color: THEME.color.ember }]}>{formatHours(profileStats.totalHours)}</Text>
            <Text style={s.statLabel}>total</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCol}>
            <Text style={s.statValue}>{profileStats.friendsCount}</Text>
            <Text style={s.statLabel}>{profileStats.friendsCount === 1 ? 'ami' : 'amis'}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCol}>
            <Text style={s.statValue}>{profileStats.sessionsCount}</Text>
            <Text style={s.statLabel}>sessions</Text>
          </View>
        </View>
      </View>

      {/* Parametres */}
      <Text style={s.sectionEyebrow}>Parametres</Text>
      <View style={[s.settingsGroup, THEME.shadow.sm]}>
        <View style={s.settingRow}>
          <View style={[s.settingIcon, {
            backgroundColor: isLocationEnabled ? THEME.color.sageSoft : THEME.color.tomatoSoft,
          }]}>
            {isLocationEnabled
              ? <MapPin size={18} color={THEME.color.sageDeep} strokeWidth={1.75} />
              : <MapPinOff size={18} color={THEME.color.tomato} strokeWidth={1.75} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.settingLabel}>Tracking de localisation</Text>
            <Text style={s.settingDesc}>Mesure auto du temps avec tes amis</Text>
          </View>
          <Switch
            value={isLocationEnabled}
            onValueChange={handleToggleLocation}
            trackColor={{ false: THEME.color.sand, true: THEME.color.ember }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={THEME.color.sand}
          />
        </View>

        <View style={s.divider} />

        <Pressable style={({ pressed }) => [s.settingRow, pressed && { opacity: 0.7 }]}>
          <View style={[s.settingIcon, { backgroundColor: THEME.color.shell }]}>
            <MapPin size={18} color={THEME.color.fg2} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.settingLabel}>Distance de proximite</Text>
            <Text style={s.settingDesc}>50 metres</Text>
          </View>
          <ChevronRight size={18} color={THEME.color.fg3} strokeWidth={1.75} />
        </Pressable>

        <View style={s.divider} />

        <Pressable style={({ pressed }) => [s.settingRow, pressed && { opacity: 0.7 }]}>
          <View style={[s.settingIcon, { backgroundColor: THEME.color.shell }]}>
            <Bell size={18} color={THEME.color.fg2} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.settingLabel}>Notifications</Text>
            <Text style={s.settingDesc}>Toutes activees</Text>
          </View>
          <ChevronRight size={18} color={THEME.color.fg3} strokeWidth={1.75} />
        </Pressable>
      </View>

      {/* A propos */}
      <Text style={s.sectionEyebrow}>A propos</Text>
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>Vie privee d'abord</Text>
        <Text style={s.infoText}>
          Ta position exacte n'est jamais partagee. Seule la proximite avec tes amis est mesuree,
          et seulement entre vous.
        </Text>
      </View>

      {/* Sign out */}
      <Pressable
        onPress={handleSignOut}
        disabled={loggingOut}
        style={({ pressed }) => [s.signOut, pressed && { opacity: 0.7 }]}
      >
        <LogOut size={18} color={THEME.color.tomato} strokeWidth={1.75} />
        <Text style={s.signOutText}>{loggingOut ? 'Deconnexion...' : 'Se deconnecter'}</Text>
      </Pressable>
      <Text style={s.version}>FriendTime v1.0.0</Text>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.color.cream },
  content: { padding: 20, paddingBottom: 32 },

  profileCard: {
    backgroundColor: THEME.color.paper,
    borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 28,
    alignItems: 'center',
  },
  username: {
    marginTop: 14,
    fontFamily: THEME.font.display,
    fontSize: 32,
    lineHeight: 34,
    color: THEME.color.ink,
    letterSpacing: -0.5,
  },
  email: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 18, paddingTop: 18,
    borderTopWidth: 1, borderTopColor: THEME.color.sandSoft,
    alignSelf: 'stretch',
  },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: THEME.font.display,
    fontSize: 28,
    lineHeight: 30,
    color: THEME.color.ink,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: THEME.font.bodySemibold,
    color: THEME.color.fg2,
    marginTop: 4,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  statDivider: { width: 1, backgroundColor: THEME.color.sandSoft },

  sectionEyebrow: {
    fontSize: 11,
    fontFamily: THEME.font.bodySemibold,
    color: THEME.color.fg2,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },

  settingsGroup: {
    backgroundColor: THEME.color.paper,
    borderRadius: 20,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  settingIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: THEME.font.bodySemibold,
    color: THEME.color.ink,
  },
  settingDesc: {
    fontSize: 12,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.color.sandSoft,
    marginLeft: 68,
  },

  infoCard: {
    backgroundColor: THEME.color.linen,
    borderWidth: 1,
    borderColor: THEME.color.sandSoft,
    borderRadius: 18,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: THEME.font.bodyBold,
    color: THEME.color.ink,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
    lineHeight: 20,
  },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    padding: 12,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: THEME.font.bodyBold,
    color: THEME.color.tomato,
  },
  version: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 11,
    fontFamily: THEME.font.body,
    color: THEME.color.fg3,
  },
});
