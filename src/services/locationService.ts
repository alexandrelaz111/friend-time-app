import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, PermissionsAndroid } from 'react-native';
import { supabase } from './supabase';
import { DEFAULT_LOCATION_CONFIG, Location as LocationType } from '../types';

// Nom de la tâche de géolocalisation en arrière-plan
export const LOCATION_TASK_NAME = 'FRIEND_TIME_BACKGROUND_LOCATION';

// Variable pour stocker l'ID utilisateur actuel
let currentUserId: string | null = null;

// Intervalle de nettoyage périodique (optionnel)
let cleanupInterval: NodeJS.Timeout | null = null;

// Stocke la dernière position mise à jour et son timestamp
let lastLocationUpdate: {
  latitude: number;
  longitude: number;
  timestamp: number;
} | null = null;

/**
 * Définit la tâche de géolocalisation en arrière-plan
 * Cette tâche s'exécute même quand l'app est fermée
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Erreur tâche de localisation:', error);
    return;
  }

  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations[0];

  if (!location || !currentUserId) return;

  try {
    // Mettre à jour la position dans Supabase
    await updateUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      timestamp: location.timestamp,
    });

    // Vérifier la proximité avec les amis
    await checkProximityWithFriends(
      location.coords.latitude,
      location.coords.longitude
    );
  } catch (err) {
    console.error('Erreur mise à jour localisation:', err);
  }
});

/**
 * Initialise le service de localisation
 */
export const initLocationService = async (userId: string): Promise<boolean> => {
  console.log('🔧 Initialisation du service de localisation pour user:', userId);
  currentUserId = userId;
  lastLocationUpdate = null; // Réinitialiser pour nouveau user

  // Nettoyer les sessions obsolètes au démarrage
  console.log('🧹 Nettoyage des sessions obsolètes au démarrage...');
  await cleanupStaleSessions();

  // Demander les permissions foreground
  console.log('📍 Demande permission foreground...');
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  console.log('📍 Permission foreground:', foregroundStatus);

  if (foregroundStatus !== 'granted') {
    console.log('❌ Permission localisation foreground refusée');
    return false;
  }

  // Demander les permissions background
  // Sur Android 11+, cette permission nécessite une approche en deux étapes
  console.log('📍 Demande permission background...');
  try {
    // Sur Android, afficher d'abord un message explicatif si nécessaire
    if (Platform.OS === 'android') {
      console.log('📱 Android détecté - demande permission background avec explication');
      
      // Android 13+ (API 33+) : Demander la permission de notification pour le foreground service
      if (Platform.Version >= 33) {
        console.log('🔔 Android 13+ détecté - vérification permission notifications...');
        try {
          const notificationPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          
          if (!notificationPermission) {
            console.log('🔔 Demande permission notifications...');
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
              {
                title: 'Permission notifications',
                message: 'FriendTime a besoin de notifications pour le tracking en arrière-plan',
                buttonNeutral: 'Plus tard',
                buttonNegative: 'Annuler',
                buttonPositive: 'Autoriser',
              }
            );
            
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
              console.log('✅ Permission notifications accordée');
            } else {
              console.log('⚠️ Permission notifications refusée - le foreground service pourrait ne pas fonctionner');
            }
          } else {
            console.log('✅ Permission notifications déjà accordée');
          }
        } catch (notifError) {
          console.log('⚠️ Erreur vérification permission notifications:', notifError);
        }
      }
      // Note: Dans une vraie app, afficher un dialogue explicatif ici
      // avant de demander la permission background
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    console.log('📍 Permission background:', backgroundStatus);

    if (backgroundStatus !== 'granted') {
      if (Platform.OS === 'ios') {
        console.log('⚠️ iOS - Permission background refusée, fonctionnalités limitées');
      } else {
        console.log('⚠️ Android - Permission background refusée');
        console.log('💡 L\'utilisateur peut l\'activer manuellement dans Paramètres > Apps > FriendTime > Autorisations');
      }
    }
  } catch (bgError) {
    console.log('⚠️ Erreur permission background:', bgError);
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      console.log('⚠️ Plateforme non supportée ou Expo Go');
    }
  }

  console.log('✅ Service de localisation initialisé');
  return true;
};

/**
 * Démarre le tracking de localisation en arrière-plan
 */
export const startLocationTracking = async (): Promise<boolean> => {
  try {
    console.log('🚀 Tentative de démarrage du tracking...');

    // Sur Android dans Expo Go, utiliser directement le foreground tracking
    if (Platform.OS === 'android') {
      console.log('📱 Android détecté - utilisation du foreground tracking dans Expo Go');
      await startForegroundTracking();
      return true;
    }

    // Vérifie si le tracking est déjà actif
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.log('📍 Tracking déjà actif ?', isTracking);

    if (isTracking) {
      console.log('✅ Tracking déjà actif');
      return true;
    }

    console.log('📍 Démarrage du tracking en arrière-plan...');
    // Démarre le tracking en arrière-plan avec configuration spécifique par plateforme
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced, // Bon compromis précision/batterie
      timeInterval: DEFAULT_LOCATION_CONFIG.updateInterval * 1000, // En millisecondes
      distanceInterval: 10, // Mise à jour si déplacement de 10m minimum
      deferredUpdatesInterval: 60000, // Regrouper les mises à jour toutes les minutes
      deferredUpdatesDistance: 50, // Ou si déplacement de 50m
      // Options spécifiques par plateforme
      ...Platform.select({
        ios: {
          showsBackgroundLocationIndicator: true, // Indicateur de localisation iOS
          pausesUpdatesAutomatically: false, // Ne pas mettre en pause automatiquement
          activityType: Location.ActivityType.Other, // Type d'activité
        },
        android: {
          foregroundService: {
            notificationTitle: 'FriendTime',
            notificationBody: 'Tracking du temps avec vos amis actif',
            notificationColor: '#6366f1',
          },
        },
      }),
    });

    console.log('✅ Tracking de localisation démarré avec succès!');
    return true;
  } catch (error: any) {
    console.error('❌ Erreur démarrage tracking background:', error?.message);

    // Fallback: utiliser le tracking foreground (fonctionne dans Expo Go)
    console.log('🔄 Tentative de tracking foreground à la place...');
    try {
      await startForegroundTracking();
      return true;
    } catch (fgError: any) {
      console.error('❌ Erreur tracking foreground aussi:', fgError?.message);
      return false;
    }
  }
};

/**
 * Tracking foreground (alternative pour Expo Go)
 */
let foregroundSubscription: Location.LocationSubscription | null = null;

export const startForegroundTracking = async (): Promise<void> => {
  console.log('📍 Démarrage tracking foreground...');
  console.log(`📍 Configuration: timeInterval=${DEFAULT_LOCATION_CONFIG.updateInterval}s, distanceInterval=10m, currentUserId=${currentUserId}`);

  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: DEFAULT_LOCATION_CONFIG.updateInterval * 1000,
      distanceInterval: 10,
    },
    async (location) => {
      console.log(`📍 Position reçue: (${location.coords.latitude}, ${location.coords.longitude}), accuracy: ${location.coords.accuracy}m`);

      if (!currentUserId) {
        console.warn('⚠️ Position ignorée - currentUserId null');
        return;
      }

      await updateUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      });

      await checkProximityWithFriends(
        location.coords.latitude,
        location.coords.longitude
      );
    }
  );

  console.log('✅ Tracking foreground démarré!');
};

/**
 * Arrête le tracking de localisation
 */
export const stopLocationTracking = async (): Promise<void> => {
  try {
    // Arrête le tracking background
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Tracking background arrêté');
    }
  } catch (error) {
    console.error('Erreur arrêt tracking background:', error);
  }

  // Arrête le tracking foreground
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
    console.log('Tracking foreground arrêté');
  }

  // Arrête le nettoyage périodique
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Nettoyage périodique arrêté');
  }
};

/**
 * Récupère la position actuelle de l'utilisateur
 */
export const getCurrentLocation = async (): Promise<LocationType | null> => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Erreur récupération position:', error);
    return null;
  }
};

/**
 * Calcule la distance entre deux points (formule Haversine simplifiée)
 * Retourne la distance en mètres
 */
const calculateDistanceBetweenCoords = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Met à jour la position de l'utilisateur dans Supabase
 * Logique: Met à jour si déplacement > 5m OU force mise à jour toutes les 120s
 * Cela garantit que get_nearby_friends() trouvera toujours des positions < 2 min
 */
export const updateUserLocation = async (location: LocationType): Promise<void> => {
  if (!currentUserId) return;

  // Vérifie la précision
  if (location.accuracy && location.accuracy > DEFAULT_LOCATION_CONFIG.minAccuracy) {
    console.log('📍 Position ignorée: précision insuffisante');
    return;
  }

  const now = Date.now();
  const shouldUpdate =
    !lastLocationUpdate || // Première mise à jour
    now - lastLocationUpdate.timestamp >= 120 * 1000 || // 120 secondes écoulées
    calculateDistanceBetweenCoords(
      lastLocationUpdate.latitude,
      lastLocationUpdate.longitude,
      location.latitude,
      location.longitude
    ) >= 5; // Déplacement > 5 mètres

  if (!shouldUpdate) {
    console.log('📍 Position ignorée: déplacement < 5m et < 120s');
    return;
  }

  // Mettre à jour la position locale
  lastLocationUpdate = {
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: now,
  };

  const { error } = await supabase
    .from('user_locations')
    .upsert({
      user_id: currentUserId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy || 0,
      recorded_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Erreur mise à jour position Supabase:', error);
  }
};

/**
 * Vérifie la proximité avec les amis et gère les sessions
 * Implémente une hysteresis: ouverture à 50m, fermeture à 60m
 */
export const checkProximityWithFriends = async (
  latitude: number,
  longitude: number
): Promise<void> => {
  if (!currentUserId) {
    console.log('⚠️ Proximité annulée - currentUserId null');
    return;
  }

  try {
    console.log(`🔍 Vérification proximité pour user ${currentUserId} à (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
    
    // HYSTERESIS: Deux seuils différents
    // Ouverture: < 50m (seuil par défaut)
    const { data: nearbyFriends, error: errorNearby } = await supabase.rpc('get_nearby_friends', {
      p_user_id: currentUserId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_threshold_meters: 50, // Seuil d'ouverture
    });

    if (errorNearby) {
      console.error('❌ Erreur vérification proximité:', errorNearby);
      return;
    }

    // Fermeture: < 60m (hysteresis = marge de 10m)
    const { data: nearbyFriendsForKeeping, error: errorKeeping } = await supabase.rpc('get_nearby_friends', {
      p_user_id: currentUserId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_threshold_meters: 60, // Seuil de fermeture (plus permissif)
    });

    if (errorKeeping) {
      console.error('❌ Erreur vérification hysteresis:', errorKeeping);
      return;
    }

    console.log(`📊 Amis proches (< 50m) trouvés: ${nearbyFriends?.length || 0}`, nearbyFriends);
    console.log(`📊 Amis à garder (< 60m) trouvés: ${nearbyFriendsForKeeping?.length || 0}`, nearbyFriendsForKeeping);

    // Récupère les sessions actives (bidirectionnelles: user_id OU friend_id)
    const { data: sessionsAsUser } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('is_active', true);

    const { data: sessionsAsFriend } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('friend_id', currentUserId)
      .eq('is_active', true);

    const allActiveSessions = [
      ...(sessionsAsUser || []),
      ...(sessionsAsFriend || []),
    ];

    console.log(`📝 Sessions actives: ${allActiveSessions?.length || 0}`, allActiveSessions);

    // Construire le set des friend_ids actifs (avec currentUserId)
    const activeSessionFriendIds = new Set(
      allActiveSessions.map(s => 
        s.user_id === currentUserId ? s.friend_id : s.user_id
      )
    );
    const nearbyFriendIds = new Set(
      (nearbyFriends || []).map((f: any) => f.friend_id)
    );
    
    // Set des amis à garder dans les sessions (seuil 60m = hysteresis)
    const keepSessionFriendIds = new Set(
      (nearbyFriendsForKeeping || []).map((f: any) => f.friend_id)
    );

    console.log(`🔑 Friend IDs sessions actives: [${Array.from(activeSessionFriendIds).join(', ')}]`);
    console.log(`🔑 Friend IDs proches (< 50m): [${Array.from(nearbyFriendIds).join(', ')}]`);
    console.log(`🔑 Friend IDs à garder (< 60m): [${Array.from(keepSessionFriendIds).join(', ')}]`);

    // Démarrer de nouvelles sessions pour les amis nouvellement proches
    for (const friend of nearbyFriends || []) {
      if (!activeSessionFriendIds.has(friend.friend_id)) {
        await startTimeSession(friend.friend_id);
        console.log(`🎉 Session démarrée avec ${friend.username} (${Math.round(friend.distance)}m)`);
      }
    }

    // Terminer les sessions pour les amis qui ne sont plus proches (> 60m)
    for (const session of allActiveSessions || []) {
      const friendIdInSession = session.user_id === currentUserId ? session.friend_id : session.user_id;
      if (!keepSessionFriendIds.has(friendIdInSession)) {
        await endTimeSession(session.id);
        console.log(`🛑 Session terminée avec ami ${friendIdInSession}`);
      }
    }
  } catch (error) {
    console.error('Erreur gestion sessions:', error);
  }
};

/**
 * Démarre une nouvelle session de temps avec un ami
 * Architecture bidirectionnelle: UNE SEULE session pour les deux users
 * Convention: user_id < friend_id (alphabétiquement) pour éviter doublons
 */
export const startTimeSession = async (friendId: string): Promise<void> => {
  if (!currentUserId) return;

  // Vérifier si une session active existe DÉJÀ (dans les deux sens)
  const { data: existingSession } = await supabase
    .from('time_sessions')
    .select('id')
    .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`)
    .eq('is_active', true)
    .maybeSingle();

  if (existingSession) {
    console.log('✅ Session déjà existante, pas de doublon créé');
    return;
  }

  // Créer UNE session unique avec convention: user_id < friend_id
  const [userId1, userId2] = [currentUserId, friendId].sort();
  const startedAt = new Date().toISOString();
  
  const { error } = await supabase
    .from('time_sessions')
    .insert({
      user_id: userId1,
      friend_id: userId2,
      started_at: startedAt,
      is_active: true,
    });

  if (error) {
    console.error('❌ Erreur démarrage session:', error);
  }
};

/**
 * Termine une session de temps
 */
export const endTimeSession = async (sessionId: string): Promise<void> => {
  const now = new Date().toISOString();

  // Récupère la session pour calculer la durée
  const { data: session } = await supabase
    .from('time_sessions')
    .select('started_at')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  const durationSeconds = Math.floor(
    (new Date(now).getTime() - new Date(session.started_at).getTime()) / 1000
  );

  const { error } = await supabase
    .from('time_sessions')
    .update({
      ended_at: now,
      duration_seconds: durationSeconds,
      is_active: false,
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Erreur fin session:', error);
  }
};

/**
 * Vérifie le statut du tracking
 */
export const isLocationTrackingActive = async (): Promise<boolean> => {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
};

/**
 * Définit l'ID de l'utilisateur courant
 */
export const setCurrentUserId = (userId: string | null): void => {
  currentUserId = userId;
};

/**
 * Nettoie les sessions obsolètes (positions pas à jour)
 * Utile à appeler au démarrage de l'app ou périodiquement
 */
export const cleanupStaleSessions = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('end_stale_sessions', {
      p_max_inactivity_minutes: 3,
    });

    if (error) {
      console.error('Erreur nettoyage sessions:', error);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      console.log(`🧹 ${count} session(s) obsolète(s) nettoyée(s)`);
    }
    return count;
  } catch (error) {
    console.error('Erreur nettoyage sessions:', error);
    return 0;
  }
};

/**
 * Démarre un nettoyage périodique des sessions obsolètes (optionnel)
 * Utile comme filet de sécurité pour attraper les cas edge
 * @param intervalMinutes Intervalle en minutes (défaut: 5 min)
 */
export const startPeriodicCleanup = (intervalMinutes: number = 5): void => {
  // Arrête l'intervalle existant si présent
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  // Démarre le nettoyage périodique
  cleanupInterval = setInterval(() => {
    console.log('🕐 Nettoyage périodique des sessions...');
    cleanupStaleSessions();
  }, intervalMinutes * 60 * 1000);

  console.log(`✅ Nettoyage périodique démarré (toutes les ${intervalMinutes} min)`);
};
