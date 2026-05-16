// src/screens/FriendsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Check, X, Search } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import {
  getFriends, getPendingRequests, searchUserByUsername,
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
} from '../services/friendService';
import { Friend, RootStackParamList } from '../types';
import { THEME } from '../theme';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { StatusPill } from '../components/StatusPill';

export const FriendsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<Friend[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searching, setSearching] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [list, pend] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id),
      ]);
      setFriends(list);
      setPending(pend);
    } catch (e) {
      console.error('Erreur chargement amis:', e);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [user]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!searchUsername.trim() || !user) return;
    if (searchUsername.trim().toLowerCase() === user.username.toLowerCase()) {
      Alert.alert('Erreur', "Tu ne peux pas t'ajouter toi-meme");
      return;
    }
    setSearching(true);
    try {
      const found = await searchUserByUsername(searchUsername.trim());
      if (!found) {
        Alert.alert('Utilisateur non trouve', `Aucun utilisateur avec le nom "${searchUsername}"`);
        return;
      }
      const already = friends.some(f => f.friend?.id === found.id || f.friend_id === found.id);
      if (already) {
        Alert.alert('Deja amis', `Tu es deja ami avec ${found.username}`);
        return;
      }
      Alert.alert('Utilisateur trouve', `Envoyer une demande a ${found.username} ?`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            const { success, error } = await sendFriendRequest(user.id, found.id);
            if (success) {
              Alert.alert('Demande envoyee', `Demande envoyee a ${found.username}`);
              setSearchUsername('');
              setModalVisible(false);
            } else {
              Alert.alert('Erreur', error || "Impossible d'envoyer la demande");
            }
          },
        },
      ]);
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSearching(false);
    }
  };

  const handleAccept = async (f: Friend) => {
    const { success, error } = await acceptFriendRequest(f.id);
    if (success) loadData();
    else Alert.alert('Erreur', error || "Impossible d'accepter");
  };

  const handleReject = (f: Friend) => {
    Alert.alert('Refuser la demande', `Refuser la demande de ${f.friend?.username} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Refuser', style: 'destructive',
        onPress: async () => {
          const { success, error } = await rejectFriendRequest(f.id);
          if (success) loadData();
          else Alert.alert('Erreur', error || 'Impossible de refuser');
        },
      },
    ]);
  };

  const handleRemove = (f: Friend) => {
    Alert.alert("Supprimer l'ami", `Supprimer ${f.friend?.username} de tes amis ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          const { success, error } = await removeFriend(f.id);
          if (success) loadData();
          else Alert.alert('Erreur', error || 'Impossible de supprimer');
        },
      },
    ]);
  };

  const renderPending = ({ item }: { item: Friend }) => (
    <View style={[s.pendingCard, THEME.shadow.sm]}>
      <View style={s.pendingAccent} />
      <View style={s.pendingRow}>
        <Avatar name={item.friend?.username} imageUrl={item.friend?.avatar_url} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.friendName}>{item.friend?.username}</Text>
          <Text style={s.pendingMeta}>t'a envoye une demande</Text>
        </View>
      </View>
      <View style={s.pendingActions}>
        <Button
          variant="primary" size="sm" leadingIcon={Check}
          style={{ backgroundColor: THEME.color.sage, flex: 1 }}
          fullWidth
          onPress={() => handleAccept(item)}
        >
          Accepter
        </Button>
        <Button
          variant="secondary" size="sm" leadingIcon={X}
          style={{ flex: 1 }}
          fullWidth
          onPress={() => handleReject(item)}
        >
          Refuser
        </Button>
      </View>
    </View>
  );

  const renderFriend = ({ item }: { item: Friend }) => (
    <Pressable
      onPress={() => navigation.navigate('FriendDetail', {
        friendId: item.friend?.id || item.friend_id,
        friendName: item.friend?.username || '',
        friendAvatarUrl: item.friend?.avatar_url,
      })}
      onLongPress={() => handleRemove(item)}
      style={({ pressed }) => [
        s.friendCard,
        THEME.shadow.sm,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
      ]}
    >
      <Avatar name={item.friend?.username} imageUrl={item.friend?.avatar_url} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={s.friendName}>{item.friend?.username}</Text>
        <Text style={s.friendMeta}>
          Ami depuis le {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Mes amis</Text>
        <Button
          variant="primary" size="sm" leadingIcon={Plus}
          style={{ borderRadius: 999, paddingHorizontal: 14 }}
          onPress={() => setModalVisible(true)}
        >
          Ajouter
        </Button>
      </View>

      {pending.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionEyebrow}>Demandes en attente · {pending.length}</Text>
          <FlatList
            data={pending}
            renderItem={renderPending}
            keyExtractor={(it) => it.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 10 }}
          />
        </View>
      )}

      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(it) => it.id}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.color.ember} />
        }
        ListHeaderComponent={
          friends.length > 0 ? (
            <Text style={[s.sectionEyebrow, { marginBottom: 10 }]}>
              Tes amis · {friends.length}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Aucun ami pour l'instant</Text>
            <Text style={s.emptyText}>
              Ajoute des amis pour commencer a tracker le temps passe ensemble.
            </Text>
          </View>
        }
      />

      {/* Modal d'ajout */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, THEME.shadow.lg]}>
            <Text style={s.modalTitle}>Ajouter un ami</Text>
            <Text style={s.modalSubtitle}>Entre le nom d'utilisateur de ton ami.</Text>
            <Input
              placeholder="Nom d'utilisateur"
              value={searchUsername}
              onChangeText={setSearchUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={s.modalActions}>
              <Button
                variant="secondary"
                style={{ flex: 1 }} fullWidth
                onPress={() => { setModalVisible(false); setSearchUsername(''); }}
              >
                Annuler
              </Button>
              <Button
                variant="primary" leadingIcon={Search}
                style={{ flex: 1 }} fullWidth
                loading={searching}
                onPress={handleSearch}
              >
                Rechercher
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.color.cream },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12, paddingBottom: 8,
  },
  title: {
    fontFamily: THEME.font.bodyBold,
    fontSize: 28,
    color: THEME.color.ink,
    letterSpacing: -0.5,
  },
  section: { paddingHorizontal: 20, paddingTop: 8 },
  sectionEyebrow: {
    fontSize: 11,
    fontFamily: THEME.font.bodySemibold,
    color: THEME.color.fg2,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  list: { padding: 20, paddingTop: 12 },
  friendCard: {
    backgroundColor: THEME.color.paper,
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  friendName: {
    fontSize: 15,
    fontFamily: THEME.font.bodySemibold,
    color: THEME.color.ink,
  },
  friendMeta: {
    fontSize: 12,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
    marginTop: 2,
  },
  pendingCard: {
    backgroundColor: THEME.color.paper,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  pendingAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: THEME.color.honey,
  },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 4, marginBottom: 12 },
  pendingMeta: { fontSize: 12, fontFamily: THEME.font.body, color: THEME.color.honeyDeep },
  pendingActions: { flexDirection: 'row', gap: 10, paddingLeft: 4 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: {
    fontSize: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31,24,18,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: THEME.color.paper,
    borderRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontFamily: THEME.font.display,
    fontSize: 30,
    lineHeight: 33,
    color: THEME.color.ink,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
