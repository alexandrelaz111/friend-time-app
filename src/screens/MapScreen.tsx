// src/screens/MapScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { THEME, formatHours } from '../theme';
import { Avatar } from '../components/Avatar';

interface FriendInfo {
  friend_id: string;
  friend_name: string;
  friend_avatar_url?: string;
}

interface SessionMarker {
  id: string;
  latitude: number;
  longitude: number;
  place_name: string;
  place_emoji: string;
  place_category: string;
  city: string;
  friends: FriendInfo[];
  duration_seconds: number;
  started_at: string;
  sessions: number;
}

// Regroupe les sessions par lieu (arrondi coords)
const groupByPlace = (sessions: any[]): SessionMarker[] => {
  const map = new Map<string, SessionMarker>();

  for (const s of sessions) {
    const key = `${s.latitude.toFixed(4)},${s.longitude.toFixed(4)}`;
    const existing = map.get(key);
    const friendInfo: FriendInfo = {
      friend_id: s.friend_id,
      friend_name: s.friend_name,
      friend_avatar_url: s.friend_avatar_url,
    };

    if (existing) {
      existing.duration_seconds += s.duration_seconds || 0;
      existing.sessions += 1;
      // Ajouter l'ami s'il n'est pas déjà dans la liste
      if (!existing.friends.some(f => f.friend_id === friendInfo.friend_id)) {
        existing.friends.push(friendInfo);
      }
      if (new Date(s.started_at) > new Date(existing.started_at)) {
        existing.started_at = s.started_at;
        existing.place_name = s.place_name || existing.place_name;
        existing.place_emoji = s.place_emoji || existing.place_emoji;
      }
    } else {
      map.set(key, {
        id: s.id,
        latitude: s.latitude,
        longitude: s.longitude,
        place_name: s.place_name || 'Lieu inconnu',
        place_emoji: s.place_emoji || '📍',
        place_category: s.place_category || 'unknown',
        city: s.city || '',
        friends: [friendInfo],
        duration_seconds: s.duration_seconds || 0,
        started_at: s.started_at,
        sessions: 1,
      });
    }
  }

  return Array.from(map.values());
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const formatDuration = (seconds: number) => {
  const hours = seconds / 3600;
  return formatHours(Math.round(hours * 10) / 10);
};

export const MapScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [markers, setMarkers] = useState<SessionMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SessionMarker | null>(null);
  const mapRef = useRef<MapView>(null);

  const loadSessions = async () => {
    if (!user) return;
    try {
      // Sessions où l'user est participant (dans les deux sens)
      const { data: sessionsAsUser } = await supabase
        .from('time_sessions')
        .select('id, latitude, longitude, place_name, place_emoji, place_category, city, duration_seconds, started_at, friend_id')
        .eq('user_id', user.id)
        .eq('is_active', false)
        .not('latitude', 'is', null);

      const { data: sessionsAsFriend } = await supabase
        .from('time_sessions')
        .select('id, latitude, longitude, place_name, place_emoji, place_category, city, duration_seconds, started_at, user_id')
        .eq('friend_id', user.id)
        .eq('is_active', false)
        .not('latitude', 'is', null);

      // Récupérer les noms des amis
      const friendIds = new Set<string>();
      (sessionsAsUser || []).forEach(s => friendIds.add(s.friend_id));
      (sessionsAsFriend || []).forEach(s => friendIds.add(s.user_id));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', Array.from(friendIds));

      const profileMap = new Map<string, { name: string; avatar_url?: string }>();
      (profiles || []).forEach(p => profileMap.set(p.id, { name: p.username, avatar_url: p.avatar_url }));

      const allSessions = [
        ...(sessionsAsUser || []).map(s => ({
          ...s,
          friend_name: profileMap.get(s.friend_id)?.name || 'Ami',
          friend_avatar_url: profileMap.get(s.friend_id)?.avatar_url,
          friend_id: s.friend_id,
        })),
        ...(sessionsAsFriend || []).map(s => ({
          ...s,
          friend_name: profileMap.get(s.user_id)?.name || 'Ami',
          friend_avatar_url: profileMap.get(s.user_id)?.avatar_url,
          friend_id: s.user_id,
        })),
      ];

      setMarkers(groupByPlace(allSessions));
    } catch (e) {
      console.error('Erreur chargement sessions map:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadSessions(); }, [user]));

  // Région initiale : centre sur les markers ou Paris par défaut
  const initialRegion: Region = markers.length > 0
    ? {
        latitude: markers.reduce((s, m) => s + m.latitude, 0) / markers.length,
        longitude: markers.reduce((s, m) => s + m.longitude, 0) / markers.length,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.08, longitudeDelta: 0.08 };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={THEME.color.ember} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        onPress={() => setSelected(null)}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            tracksViewChanges={false}
            onPress={(e) => {
              e.stopPropagation();
              setSelected(m);
            }}
          >
            <View style={s.markerContainer}>
              <View style={s.markerBubble}>
                <Text style={s.markerEmoji}>{m.place_emoji}</Text>
              </View>
              <View style={s.markerArrow} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header flottant */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('map.ourPlaces')}</Text>
        <Text style={s.headerCount}>{markers.length > 1 ? t('map.places', { count: markers.length }) : t('map.place', { count: markers.length })}</Text>
      </View>

      {/* Card du lieu sélectionné */}
      {selected && (
        <View style={[s.card, THEME.shadow.lg]}>
          <Pressable style={s.cardClose} onPress={() => setSelected(null)}>
            <X size={18} color={THEME.color.fg2} strokeWidth={1.75} />
          </Pressable>

          <View style={s.cardHeader}>
            <Text style={s.cardEmoji}>{selected.place_emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardPlace}>{selected.place_name}</Text>
              {selected.city ? <Text style={s.cardCity}>{selected.city}</Text> : null}
            </View>
          </View>

          <View style={s.cardDivider} />

          <View style={s.cardStats}>
            <View style={s.cardStat}>
              <Text style={s.cardStatValue}>{formatDuration(selected.duration_seconds)}</Text>
              <Text style={s.cardStatLabel}>{t('map.together')}</Text>
            </View>
            <View style={s.cardStatDivider} />
            <View style={s.cardStat}>
              <Text style={s.cardStatValue}>{selected.sessions}</Text>
              <Text style={s.cardStatLabel}>{selected.sessions > 1 ? t('map.visits') : t('map.visit')}</Text>
            </View>
            <View style={s.cardStatDivider} />
            <View style={s.cardStat}>
              <Text style={s.cardStatValue}>{formatDate(selected.started_at)}</Text>
              <Text style={s.cardStatLabel}>{t('map.lastTime')}</Text>
            </View>
          </View>

          <View style={s.cardFriends}>
            <View style={s.cardAvatarStack}>
              {selected.friends.slice(0, 4).map((f, i) => (
                <View key={f.friend_id} style={[s.cardAvatarWrap, { marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }]}>
                  <Avatar name={f.friend_name} imageUrl={f.friend_avatar_url} size={28} />
                </View>
              ))}
            </View>
            <Text style={s.cardFriendName}>
              {t('map.with')} {selected.friends.map(f => f.friend_name).join(', ')}
            </Text>
          </View>
        </View>
      )}

      {/* Empty state */}
      {markers.length === 0 && !loading && (
        <View style={[s.emptyCard, THEME.shadow.md]}>
          <Text style={s.emptyTitle}>{t('map.noPlaces')}</Text>
          <Text style={s.emptyText}>
            {t('map.noPlacesText')}
          </Text>
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: THEME.color.cream,
  },

  // Markers custom
  markerContainer: { alignItems: 'center' },
  markerBubble: {
    backgroundColor: THEME.color.paper,
    borderRadius: 16,
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: THEME.color.ember,
    ...THEME.shadow.sm,
  },
  markerEmoji: { fontSize: 18 },
  markerArrow: {
    width: 0, height: 0, marginTop: -1,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: THEME.color.ember,
  },

  // Header flottant
  header: {
    position: 'absolute', top: 60, left: 20, right: 20,
    backgroundColor: THEME.color.paper,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    ...THEME.shadow.md,
  },
  headerTitle: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 20, color: THEME.color.ink,
  },
  headerCount: {
    fontFamily: THEME.font.bodySemibold,
    fontSize: 12, color: THEME.color.fg2,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },

  // Card detail
  card: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: THEME.color.paper,
    borderRadius: 24, padding: 20,
  },
  cardClose: {
    position: 'absolute', top: 14, right: 14, zIndex: 1,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: THEME.color.shell,
    alignItems: 'center', justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  cardEmoji: { fontSize: 32 },
  cardPlace: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 17, color: THEME.color.ink,
  },
  cardCity: {
    fontFamily: THEME.font.body,
    fontSize: 13, color: THEME.color.fg2, marginTop: 2,
  },
  cardDivider: {
    height: 1, backgroundColor: THEME.color.sandSoft,
    marginVertical: 14,
  },
  cardStats: {
    flexDirection: 'row', justifyContent: 'space-around',
  },
  cardStat: { alignItems: 'center', flex: 1 },
  cardStatValue: {
    fontFamily: THEME.font.display,
    fontSize: 22, lineHeight: 24, color: THEME.color.ink,
  },
  cardStatLabel: {
    fontFamily: THEME.font.body,
    fontSize: 11, color: THEME.color.fg2, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cardStatDivider: {
    width: 1, backgroundColor: THEME.color.sandSoft,
  },
  cardFriends: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: THEME.color.sandSoft,
  },
  cardAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatarWrap: {
    borderWidth: 2,
    borderColor: THEME.color.paper,
    borderRadius: 999,
  },
  cardFriendName: {
    flex: 1,
    fontFamily: THEME.font.bodySemibold,
    fontSize: 14, color: THEME.color.ink,
  },

  // Empty
  emptyCard: {
    position: 'absolute', bottom: 40, left: 24, right: 24,
    backgroundColor: THEME.color.paper,
    borderRadius: 20, padding: 24, alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 16, color: THEME.color.ink, marginBottom: 6,
  },
  emptyText: {
    fontFamily: THEME.font.body,
    fontSize: 13, color: THEME.color.fg2,
    textAlign: 'center', lineHeight: 20,
  },
});
