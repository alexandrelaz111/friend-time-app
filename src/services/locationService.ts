import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';
import { getPlaceFromCoords } from './placesService';
import { DEFAULT_LOCATION_CONFIG, Location as LocationType } from '../types';

// Nom de la tâche de géolocalisation en arrière-plan
export const LOCATION_TASK_NAME = 'FRIEND_TIME_BACKGROUND_LOCATION';

// Variable pour stocker l'ID utilisateur actuel
let currentUserId: string | null = null;

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

  // Demander les permissions
  console.log('📍 Demande permission foreground...');
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  console.log('📍 Permission foreground:', foregroundStatus);

  if (foregroundStatus !== 'granted') {
    console.log('❌ Permission localisation foreground refusée');
    return false;
  }

  console.log('📍 Demande permission background...');
  try {
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    console.log('📍 Permission background:', backgroundStatus);

    if (backgroundStatus !== 'granted') {
      console.log('⚠️ Permission localisation background refusée - mode foreground uniquement');
    }
  } catch (bgError) {
    console.log('⚠️ Erreur permission background (normal dans Expo Go):', bgError);
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

    // Vérifie si le tracking est déjà actif
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.log('📍 Tracking déjà actif ?', isTracking);

    if (isTracking) {
      console.log('✅ Tracking déjà actif');
      return true;
    }

    console.log('📍 Démarrage du tracking en arrière-plan...');
    // Démarre le tracking en arrière-plan
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced, // Bon compromis précision/batterie
      timeInterval: DEFAULT_LOCATION_CONFIG.updateInterval * 1000, // En millisecondes
      distanceInterval: 10, // Mise à jour si déplacement de 10m minimum
      deferredUpdatesInterval: 60000, // Regrouper les mises à jour toutes les minutes
      deferredUpdatesDistance: 50, // Ou si déplacement de 50m
      showsBackgroundLocationIndicator: true, // Indicateur iOS
      foregroundService: {
        notificationTitle: 'FriendTime',
        notificationBody: 'Tracking du temps avec vos amis actif',
        notificationColor: '#6366f1',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
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

  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000, // 30 secondes
      distanceInterval: 10, // 10 mètres
    },
    async (location) => {
      console.log('📍 Position reçue:', location.coords.latitude, location.coords.longitude);

      if (!currentUserId) return;

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
};

/**
 * Obtient la position actuelle (one-shot)
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
 * Met à jour la position de l'utilisateur dans Supabase
 */
export const updateUserLocation = async (location: LocationType): Promise<void> => {
  if (!currentUserId) return;

  // Vérifie la précision
  if (location.accuracy && location.accuracy > DEFAULT_LOCATION_CONFIG.minAccuracy) {
    console.log('Position ignorée: précision insuffisante');
    return;
  }

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
 */
export const checkProximityWithFriends = async (
  latitude: number,
  longitude: number
): Promise<void> => {
  if (!currentUserId) return;

  try {
    // Appelle la fonction Supabase pour trouver les amis proches
    const { data: nearbyFriends, error } = await supabase.rpc('get_nearby_friends', {
      p_user_id: currentUserId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_threshold_meters: DEFAULT_LOCATION_CONFIG.proximityThreshold,
    });

    if (error) {
      console.error('Erreur vérification proximité:', error);
      return;
    }

    // Récupère les sessions actives de l'utilisateur
    const { data: activeSessions } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('is_active', true);

    const activeSessionFriendIds = new Set(
      (activeSessions || []).map(s => s.friend_id)
    );
    const nearbyFriendIds = new Set(
      (nearbyFriends || []).map((f: any) => f.friend_id)
    );

    // Démarrer de nouvelles sessions pour les amis nouvellement proches
    for (const friend of nearbyFriends || []) {
      if (!activeSessionFriendIds.has(friend.friend_id)) {
        await startTimeSession(friend.friend_id, latitude, longitude);
        console.log(`Session démarrée avec ${friend.username}`);
      }
    }

    // Terminer les sessions pour les amis qui ne sont plus proches
    for (const session of activeSessions || []) {
      if (!nearbyFriendIds.has(session.friend_id)) {
        await endTimeSession(session.id);
        console.log(`Session terminée avec ami ${session.friend_id}`);
      }
    }
  } catch (error) {
    console.error('Erreur gestion sessions:', error);
  }
};

/**
 * Démarre une nouvelle session de temps avec un ami.
 * Les coordonnées GPS sont enregistrées pour le reverse geocoding ultérieur.
 */
export const startTimeSession = async (
  friendId: string,
  latitude?: number,
  longitude?: number,
): Promise<void> => {
  if (!currentUserId) return;

  const { error } = await supabase
    .from('time_sessions')
    .insert({
      user_id: currentUserId,
      friend_id: friendId,
      started_at: new Date().toISOString(),
      is_active: true,
      ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
    });

  if (error) {
    console.error('Erreur démarrage session:', error);
  }
};

/**
 * Termine une session de temps.
 * Récupère le lieu depuis les coordonnées GPS enregistrées au démarrage
 * (reverse geocoding Nominatim).
 */
export const endTimeSession = async (sessionId: string): Promise<void> => {
  const now = new Date().toISOString();

  // Récupère la session (durée + coordonnées pour le lieu)
  const { data: session } = await supabase
    .from('time_sessions')
    .select('started_at, latitude, longitude')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  const durationSeconds = Math.floor(
    (new Date(now).getTime() - new Date(session.started_at).getTime()) / 1000
  );

  // Reverse geocoding si les coordonnées sont disponibles
  let placeData: Record<string, string> = {};
  if (session.latitude != null && session.longitude != null) {
    const place = await getPlaceFromCoords(session.latitude, session.longitude);
    placeData = {
      place_name:     place.place_name,
      place_category: place.place_category,
      place_emoji:    place.place_emoji,
      city:           place.city,
    };
  }

  const { error } = await supabase
    .from('time_sessions')
    .update({
      ended_at:         now,
      duration_seconds: durationSeconds,
      is_active:        false,
      ...placeData,
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
