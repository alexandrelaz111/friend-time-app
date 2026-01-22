import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  getFriends,
  getPendingRequests,
  searchUserByUsername,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '../services/friendService';
import { Friend } from '../types';
import { successHaptic, errorHaptic, lightHaptic, warningHaptic } from '../utils/haptics';

export const FriendsScreen: React.FC = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      const [friendsList, pending] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id),
      ]);

      setFriends(friendsList);
      setPendingRequests(pending);
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!searchUsername.trim() || !user) return;

    if (searchUsername.trim().toLowerCase() === user.username.toLowerCase()) {
      await errorHaptic();
      Alert.alert('Erreur', 'Tu ne peux pas t\'ajouter toi-même');
      return;
    }

    setSearching(true);

    try {
      const foundUser = await searchUserByUsername(searchUsername.trim());

      if (!foundUser) {
        await errorHaptic();
        Alert.alert('Utilisateur non trouvé', `Aucun utilisateur avec le nom "${searchUsername}"`);
        return;
      }

      // Vérifie si déjà ami
      const isAlreadyFriend = friends.some(
        f => f.friend?.id === foundUser.id || f.friend_id === foundUser.id
      );

      if (isAlreadyFriend) {
        await warningHaptic();
        Alert.alert('Déjà amis', `Tu es déjà ami avec ${foundUser.username}`);
        return;
      }

      await lightHaptic();
      Alert.alert(
        'Utilisateur trouvé',
        `Envoyer une demande d'amitié à ${foundUser.username} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Envoyer',
            onPress: async () => {
              const { success, error } = await sendFriendRequest(user.id, foundUser.id);
              if (success) {
                await successHaptic();
                Alert.alert('Demande envoyée', `Demande envoyée à ${foundUser.username}`);
                setSearchUsername('');
                setModalVisible(false);
              } else {
                await errorHaptic();
                Alert.alert('Erreur', error || 'Impossible d\'envoyer la demande');
              }
            },
          },
        ]
      );
    } catch (error) {
      await errorHaptic();
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSearching(false);
    }
  };

  const handleAcceptRequest = async (friendship: Friend) => {
    const { success, error } = await acceptFriendRequest(friendship.id);
    if (success) {
      await successHaptic();
      await loadData();
    } else {
      await errorHaptic();
      Alert.alert('Erreur', error || 'Impossible d\'accepter la demande');
    }
  };

  const handleRejectRequest = async (friendship: Friend) => {
    await lightHaptic();
    Alert.alert(
      'Refuser la demande',
      `Refuser la demande de ${friendship.friend?.username} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await rejectFriendRequest(friendship.id);
            if (success) {
              await warningHaptic();
              await loadData();
            } else {
              await errorHaptic();
              Alert.alert('Erreur', error || 'Impossible de refuser');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFriend = async (friendship: Friend) => {
    await lightHaptic();
    Alert.alert(
      'Supprimer l\'ami',
      `Supprimer ${friendship.friend?.username} de tes amis ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await removeFriend(friendship.id);
            if (success) {
              await warningHaptic();
              await loadData();
            } else {
              await errorHaptic();
              Alert.alert('Erreur', error || 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const renderPendingRequest = ({ item }: { item: Friend }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.friend?.username}</Text>
        <Text style={styles.requestMeta}>Demande en attente</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.actionButtonText}>Accepter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Refuser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendCard}
      onLongPress={() => handleRemoveFriend(item)}
    >
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>
          {item.friend?.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.friend?.username}</Text>
        <Text style={styles.friendMeta}>
          Ami depuis le {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
      {/* Header avec bouton d'ajout */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes amis</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Demandes en attente */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Demandes en attente ({pendingRequests.length})
          </Text>
          <FlatList
            data={pendingRequests}
            renderItem={renderPendingRequest}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Liste des amis */}
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucun ami pour l'instant</Text>
            <Text style={styles.emptyText}>
              Ajoute des amis pour commencer à tracker le temps passé ensemble
            </Text>
          </View>
        }
      />

      {/* Modal d'ajout d'ami */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={Keyboard.dismiss}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Ajouter un ami</Text>
            <Text style={styles.modalSubtitle}>
              Entre le nom d'utilisateur de ton ami
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Nom d'utilisateur"
              placeholderTextColor="#9ca3af"
              value={searchUsername}
              onChangeText={setSearchUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setSearchUsername('');
                  Keyboard.dismiss();
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSearchButton]}
                onPress={handleSearch}
                disabled={searching}
              >
                <Text style={styles.modalSearchText}>
                  {searching ? 'Recherche...' : 'Rechercher'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
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
  header: {
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  requestCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  requestInfo: {
    marginBottom: 12,
  },
  requestName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  requestMeta: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748b',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#94a3b8',
  },
  friendCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  searchInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748b',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalSearchButton: {
    backgroundColor: '#6366f1',
  },
  modalSearchText: {
    color: '#fff',
    fontWeight: '600',
  },
});
