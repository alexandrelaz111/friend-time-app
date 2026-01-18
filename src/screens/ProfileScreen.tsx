import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { user, signOut, isLocationEnabled, enableLocation, disableLocation } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleToggleLocation = async (value: boolean) => {
    if (value) {
      const success = await enableLocation();
      if (!success) {
        Alert.alert(
          'Permission requise',
          'Autorise l\'accès à la localisation dans les paramètres de ton téléphone pour utiliser cette fonctionnalité.'
        );
      }
    } else {
      Alert.alert(
        'Désactiver le tracking',
        'Tu ne pourras plus mesurer le temps passé avec tes amis. Continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Désactiver',
            style: 'destructive',
            onPress: disableLocation,
          },
        ]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Tu es sûr de vouloir te déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profil */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Paramètres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Tracking de localisation</Text>
              <Text style={styles.settingDescription}>
                Mesure automatiquement le temps passé avec tes amis
              </Text>
            </View>
            <Switch
              value={isLocationEnabled}
              onValueChange={handleToggleLocation}
              trackColor={{ false: '#334155', true: '#6366f1' }}
              thumbColor={isLocationEnabled ? '#fff' : '#94a3b8'}
            />
          </View>
        </View>

        <View style={styles.settingCard}>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Distance de proximité</Text>
              <Text style={styles.settingDescription}>
                50 mètres (par défaut)
              </Text>
            </View>
            <Text style={styles.settingArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Informations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment ça marche ?</Text>
          <Text style={styles.infoText}>
            FriendTime utilise ta localisation pour détecter quand tu es proche de tes amis (à moins de 50 mètres).
            Le temps passé ensemble est automatiquement comptabilisé.
          </Text>
          <Text style={styles.infoText}>
            Pour que ça fonctionne, toi ET ton ami devez avoir l'app installée avec le tracking activé.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Vie privée</Text>
          <Text style={styles.infoText}>
            Seuls tes amis acceptés peuvent voir que tu es proche d'eux.
            Ta position exacte n'est jamais partagée, seulement la proximité.
          </Text>
        </View>
      </View>

      {/* Version et déconnexion */}
      <View style={styles.footer}>
        <Text style={styles.version}>FriendTime v1.0.0</Text>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOut}
          disabled={loggingOut}
        >
          <Text style={styles.logoutText}>
            {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
          </Text>
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#94a3b8',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  settingArrow: {
    color: '#64748b',
    fontSize: 18,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  version: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
