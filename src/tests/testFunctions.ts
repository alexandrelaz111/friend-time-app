// Fichier de fonctions de test pour l'application FriendTime
// Ce fichier contient toutes les fonctions de test, regroupées par fichier d'origine

import { vi } from 'vitest';

// Mock Supabase pour tous les tests
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns?: string) => ({
        limit: vi.fn((limitValue?: number) => {
          return vi.fn().mockResolvedValue({ data: [{ count: 1 }], error: null });
        }),
        ilike: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })),
        eq: vi.fn((column: string, value: any) => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          eq: vi.fn((column2: string, value2: any) => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            order: vi.fn(() => vi.fn().mockResolvedValue({ data: [], error: null })),
            gte: vi.fn((column3: string, value3: any) => ({
              lte: vi.fn((column4: string, value4: any) => vi.fn().mockResolvedValue({ data: [], error: null }))
            }))
          })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => vi.fn().mockResolvedValue({ data: [], error: null }))
          })),
          order: vi.fn(() => vi.fn().mockResolvedValue({ data: [], error: null }))
        })),
        or: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          eq: vi.fn(() => vi.fn().mockResolvedValue({ data: [], error: null }))
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => vi.fn().mockResolvedValue({ data: [], error: null }))
        })),
        order: vi.fn(() => vi.fn().mockResolvedValue({ data: [], error: null }))
      })),
      insert: vi.fn(() => vi.fn().mockResolvedValue({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => vi.fn().mockResolvedValue({ error: null }))
      })),
      upsert: vi.fn(() => vi.fn().mockResolvedValue({ error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => vi.fn().mockResolvedValue({ error: null }))
      }))
    })),
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } }
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(),
    },
    rpc: vi.fn((functionName: string, params?: any) => {
      // Mock des fonctions RPC Supabase
      if (functionName === 'get_nearby_friends') {
        return Promise.resolve({ data: [], error: null });
      }
      if (functionName === 'end_stale_sessions') {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
  },
  checkConnection: vi.fn().mockResolvedValue(true),
}));

// Mock Expo Location
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  startLocationUpdatesAsync: vi.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: vi.fn().mockResolvedValue(undefined),
  hasStartedLocationUpdatesAsync: vi.fn().mockResolvedValue(false),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({
    coords: {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 10,
    },
    timestamp: Date.now(),
  }),
  Accuracy: {
    Balanced: 1,
    High: 2,
  },
  ActivityType: {
    Other: 1,
  },
}));

// Mock Expo TaskManager
vi.mock('expo-task-manager', () => ({
  defineTask: vi.fn(),
}));

// ========================================
// TESTS POUR friendService.ts
// ========================================

/**
 * Test de la fonction searchUserByUsername
 * Recherche un utilisateur dans la base de données par son nom d'utilisateur
 * Teste différents scénarios de recherche : valide, vide, inexistant
 */
export const searchUserByUsername_Test = async (): Promise<number> => {
  try {
    const { searchUserByUsername } = await import('../services/friendService');

    // Cas 1: Recherche avec un nom d'utilisateur valide existant
    await searchUserByUsername('testuser');

    // Cas 2: Recherche avec un nom d'utilisateur vide
    await searchUserByUsername('');

    // Cas 3: Recherche avec un nom d'utilisateur inexistant
    await searchUserByUsername('nonexistentuser12345');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction sendFriendRequest
 * Envoie une demande d'amitié entre deux utilisateurs
 * Vérifie la gestion des relations existantes et des demandes en attente
 */
export const sendFriendRequest_Test = async (): Promise<number> => {
  try {
    const { sendFriendRequest } = await import('../services/friendService');

    // Cas 1: Envoi de demande avec des IDs d'utilisateurs valides
    await sendFriendRequest('user1', 'user2');

    // Cas 2: Envoi de demande avec des IDs vides
    await sendFriendRequest('', '');

    // Cas 3: Envoi de demande avec des IDs identiques (auto-demande)
    await sendFriendRequest('user1', 'user1');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction acceptFriendRequest
 * Accepte une demande d'amitié en attente en changeant son statut
 * Teste la validation des IDs de demande d'amitié
 */
export const acceptFriendRequest_Test = async (): Promise<number> => {
  try {
    const { acceptFriendRequest } = await import('../services/friendService');

    // Cas 1: Acceptation d'une demande avec un ID valide
    await acceptFriendRequest('valid-id');

    // Cas 2: Acceptation d'une demande avec un ID vide
    await acceptFriendRequest('');

    // Cas 3: Acceptation d'une demande avec un ID null
    await acceptFriendRequest(null as any);

    // Cas 4: Acceptation d'une demande avec un ID undefined
    await acceptFriendRequest(undefined as any);
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction rejectFriendRequest
 * Rejette une demande d'amitié en attente en changeant son statut
 * Teste la validation des IDs de demande d'amitié
 */
export const rejectFriendRequest_Test = async (): Promise<number> => {
  try {
    const { rejectFriendRequest } = await import('../services/friendService');

    // Cas 1: Rejet d'une demande avec un ID valide
    await rejectFriendRequest('valid-id');

    // Cas 2: Rejet d'une demande avec un ID vide
    await rejectFriendRequest('');

    // Cas 3: Rejet d'une demande avec un ID null
    await rejectFriendRequest(null as any);

    // Cas 4: Rejet d'une demande avec un ID undefined
    await rejectFriendRequest(undefined as any);
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction removeFriend
 * Supprime une amitié existante en supprimant l'enregistrement de la base de données
 * Teste la validation des IDs d'amitié
 */
export const removeFriend_Test = async (): Promise<number> => {
  try {
    const { removeFriend } = await import('../services/friendService');

    // Cas 1: Suppression d'une amitié avec un ID valide
    await removeFriend('valid-id');

    // Cas 2: Suppression d'une amitié avec un ID vide
    await removeFriend('');

    // Cas 3: Suppression d'une amitié avec un ID null
    await removeFriend(null as any);

    // Cas 4: Suppression d'une amitié avec un ID undefined
    await removeFriend(undefined as any);
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction getFriends
 * Récupère la liste des amis acceptés pour un utilisateur donné
 * Combine les amitiés où l'utilisateur est l'expéditeur ou le destinataire
 */
export const getFriends_Test = async (): Promise<number> => {
  try {
    const { getFriends } = await import('../services/friendService');

    // Cas 1: Récupération des amis avec un ID utilisateur valide
    await getFriends('valid-user-id');

    // Cas 2: Récupération des amis avec un ID utilisateur vide
    await getFriends('');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction getPendingRequests
 * Récupère les demandes d'amitié en attente reçues par un utilisateur
 * Filtre uniquement les demandes où l'utilisateur est le destinataire
 */
export const getPendingRequests_Test = async (): Promise<number> => {
  try {
    const { getPendingRequests } = await import('../services/friendService');

    // Cas 1: Récupération des demandes en attente avec un ID utilisateur valide
    await getPendingRequests('valid-user-id');

    // Cas 2: Récupération des demandes en attente avec un ID utilisateur vide
    await getPendingRequests('');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction getFriendTimeStats
 * Calcule et retourne les statistiques de temps passé avec chaque ami
 * Agrège les sessions de temps et calcule les totaux par ami
 */
export const getFriendTimeStats_Test = async (): Promise<number> => {
  try {
    const { getFriendTimeStats } = await import('../services/friendService');

    // Cas 1: Récupération des statistiques avec un ID utilisateur valide
    const result1 = await getFriendTimeStats('valid-user-id');
    if (!Array.isArray(result1)) {
      return -1; // Devrait retourner un tableau
    }

    // Cas 2: Récupération des statistiques avec un ID utilisateur vide
    const result2 = await getFriendTimeStats('');
    if (!Array.isArray(result2)) {
      return -2; // Devrait retourner un tableau
    }
  } catch (error) {
    return -3; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction getMonthlyStats
 * Récupère les statistiques mensuelles de temps passé avec un ami spécifique
 * Filtre par utilisateur et ami, trié par mois décroissant
 */
export const getMonthlyStats_Test = async (): Promise<number> => {
  try {
    const { getMonthlyStats } = await import('../services/friendService');

    // Cas 1: Récupération des statistiques mensuelles avec des IDs valides
    await getMonthlyStats('user-id', 'friend-id');

    // Cas 2: Récupération des statistiques mensuelles avec des IDs vides
    await getMonthlyStats('', '');
  } catch (error) {
    console.error('getMonthlyStats error:', error);
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction getStatsForPeriod
 * Calcule les statistiques globales pour une période donnée
 * Agrège le temps total passé et identifie le meilleur ami pour cette période
 */
export const getStatsForPeriod_Test = async (): Promise<number> => {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31');

  try {
    const { getStatsForPeriod } = await import('../services/friendService');

    // Cas 1: Récupération des statistiques pour une période avec un ID utilisateur valide
    await getStatsForPeriod('user-id', startDate, endDate);

    // Cas 2: Récupération des statistiques pour une période avec un ID utilisateur vide
    await getStatsForPeriod('', startDate, endDate);
  } catch (error) {
    console.error('getStatsForPeriod error:', error);
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction getActiveSessions
 * Récupère les sessions actuellement actives pour un utilisateur
 * Retourne uniquement les sessions avec is_active = true
 */
export const getActiveSessions_Test = async (): Promise<number> => {
  try {
    const { getActiveSessions } = await import('../services/friendService');

    // Cas 1: Récupération des sessions actives avec un ID utilisateur valide
    const result1 = await getActiveSessions('valid-user-id');
    if (!Array.isArray(result1)) {
      return -1; // Devrait retourner un tableau
    }

    // Cas 2: Récupération des sessions actives avec un ID utilisateur vide
    const result2 = await getActiveSessions('');
    if (!Array.isArray(result2)) {
      return -2; // Devrait retourner un tableau
    }
  } catch (error) {
    console.error('getActiveSessions error:', error);
    return -3; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

// ========================================
// TESTS POUR authService.ts
// ========================================

/**
 * Test de la fonction signUp
 * Inscrit un nouvel utilisateur avec email, mot de passe et nom d'utilisateur
 * Vérifie l'unicité du nom d'utilisateur et crée le profil automatiquement
 */
export const signUp_Test = async (): Promise<number> => {
  try {
    const { signUp } = await import('../services/authService');

    // Cas 1: Inscription avec des données valides (email, mot de passe, username)
    const result1 = await signUp('test@example.com', 'password123', 'testuser');
    if (typeof result1 !== 'object' || result1 === null) {
      return -1; // Devrait retourner un objet
    }

    // Cas 2: Inscription avec un email au format invalide
    const result2 = await signUp('invalid-email', 'password123', 'testuser');
    if (typeof result2 !== 'object' || result2 === null) {
      return -2; // Devrait retourner un objet
    }

    // Cas 3: Inscription avec un nom d'utilisateur vide
    const result3 = await signUp('test@example.com', 'password123', '');
    if (typeof result3 !== 'object' || result3 === null) {
      return -3; // Devrait retourner un objet
    }

    return 1; // Succès: tous les cas passent
  } catch (error) {
    console.error('Error in signUp_Test:', error);
    return -4; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction signIn
 * Connecte un utilisateur existant avec son email et mot de passe
 * Récupère et configure le profil utilisateur après connexion
 */
export const signIn_Test = async (): Promise<number> => {
  try {
    const { signIn } = await import('../services/authService');

    // Cas 1: Connexion avec des identifiants valides (email et mot de passe)
    await signIn('test@example.com', 'password123');

    // Cas 2: Connexion avec un email vide
    await signIn('', 'password123');

    // Cas 3: Connexion avec un mot de passe vide
    await signIn('test@example.com', '');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction signOut
 * Déconnecte l'utilisateur actuel et arrête le suivi de localisation
 * Nettoie l'état de l'application après déconnexion
 */
export const signOut_Test = async (): Promise<number> => {
  try {
    const { signOut } = await import('../services/authService');

    // Cas 1: Déconnexion normale de l'utilisateur actuel
    await signOut();

    // Cas 2: Déconnexion avec erreur simulée (on ne peut pas facilement simuler d'erreur ici)
    // Le mock retourne toujours succès, donc on teste juste le cas normal
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction getCurrentSession
 * Récupère la session utilisateur actuelle depuis Supabase Auth
 * Configure le service de localisation si un utilisateur est connecté
 */
export const getCurrentSession_Test = async (): Promise<number> => {
  try {
    const { getCurrentSession } = await import('../services/authService');

    // Cas 1: Récupération de la session utilisateur actuelle
    await getCurrentSession();
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction updateProfile
 * Met à jour le profil utilisateur (nom d'utilisateur ou avatar)
 * Modifie uniquement les champs spécifiés dans la base de données
 */
export const updateProfile_Test = async (): Promise<number> => {
  try {
    const { updateProfile } = await import('../services/authService');

    // Cas 1: Mise à jour du profil avec un ID valide et des données correctes
    const result1 = await updateProfile('user-id', { username: 'newusername' });
    if (typeof result1 !== 'object' || result1 === null) {
      return -1; // Devrait retourner un objet
    }

    // Cas 2: Mise à jour du profil avec un ID vide
    const result2 = await updateProfile('', { username: 'newusername' });
    if (typeof result2 !== 'object' || result2 === null) {
      return -2; // Devrait retourner un objet
    }
  } catch (error) {
    return -3; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction resetPassword
 * Envoie un email de réinitialisation de mot de passe à l'utilisateur
 * Utilise Supabase Auth pour gérer la réinitialisation
 */
export const resetPassword_Test = async (): Promise<number> => {
  try {
    const { resetPassword } = await import('../services/authService');

    // Cas 1: Réinitialisation avec un email valide
    await resetPassword('test@example.com');

    // Cas 2: Réinitialisation avec un email au format invalide
    await resetPassword('invalid-email');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

// ========================================
// TESTS POUR locationService.ts
// ========================================

/**
 * Test de la fonction initLocationService
 * Initialise le service de localisation pour un utilisateur spécifique
 * Demande les permissions de localisation et configure le suivi
 */
export const initLocationService_Test = async (): Promise<number> => {
  try {
    const { initLocationService } = await import('../services/locationService');

    // Cas 1: Initialisation du service avec un ID utilisateur valide
    await initLocationService('user-id');

    // Cas 2: Initialisation du service avec un ID utilisateur vide
    await initLocationService('');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction startLocationTracking
 * Démarre le suivi de localisation en arrière-plan
 * Configure le tracking GPS continu
 */
export const startLocationTracking_Test = async (): Promise<number> => {
  try {
    const { startLocationTracking } = await import('../services/locationService');

    // Cas 1: Démarrage du tracking de localisation
    await startLocationTracking();
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction stopLocationTracking
 * Arrête le suivi de localisation en arrière-plan
 * Nettoie les ressources et arrête le nettoyage périodique
 */
export const stopLocationTracking_Test = async (): Promise<number> => {
  try {
    const { stopLocationTracking } = await import('../services/locationService');

    // Cas 1: Arrêt du tracking de localisation
    await stopLocationTracking();
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction getCurrentLocation
 * Obtient la position GPS actuelle de l'appareil
 * Utilise les APIs Expo Location pour récupérer les coordonnées
 */
export const getCurrentLocation_Test = async (): Promise<number> => {
  try {
    const { getCurrentLocation } = await import('../services/locationService');

    // Cas 1: Récupération de la position GPS actuelle
    await getCurrentLocation();
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction updateUserLocation
 * Met à jour la position de l'utilisateur dans la base de données
 * Vérifie la précision GPS avant de sauvegarder
 */
export const updateUserLocation_Test = async (): Promise<number> => {
  try {
    const { updateUserLocation } = await import('../services/locationService');

    // Cas 1: Mise à jour avec des coordonnées GPS valides et précision acceptable
    await updateUserLocation({
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 10,
      timestamp: Date.now()
    });

    // Cas 2: Mise à jour avec des coordonnées valides mais précision insuffisante
    await updateUserLocation({
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 1000, // Précision trop basse
      timestamp: Date.now()
    });
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction checkProximityWithFriends
 * Vérifie la proximité avec les amis et gère les sessions automatiquement
 * Utilise la formule Haversine côté serveur pour calculer les distances
 */
export const checkProximityWithFriends_Test = async (): Promise<number> => {
  try {
    const { checkProximityWithFriends } = await import('../services/locationService');

    // Cas 1: Vérification de proximité avec des coordonnées valides (Paris)
    await checkProximityWithFriends(48.8566, 2.3522);

    // Cas 2: Vérification de proximité avec coordonnées extrêmes
    await checkProximityWithFriends(90, 180); // Pôle Nord, limite longitude
    await checkProximityWithFriends(-90, -180); // Pôle Sud, limite longitude

    // Cas 3: Vérification de proximité avec coordonnées nulles
    await checkProximityWithFriends(0, 0);
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction startTimeSession
 * Démarre une nouvelle session de temps avec un ami spécifique
 * Crée un enregistrement de session active dans la base de données
 */
export const startTimeSession_Test = async (): Promise<number> => {
  try {
    const { startTimeSession } = await import('../services/locationService');

    // Cas 1: Démarrage d'une session avec un ID d'ami valide
    await startTimeSession('friend-id');

    // Cas 2: Démarrage d'une session avec un ID d'ami vide
    await startTimeSession('');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction endTimeSession
 * Termine une session de temps active en calculant la durée écoulée
 * Met à jour l'enregistrement de session avec l'heure de fin et la durée
 * Note: La vérification des positions obsolètes se fait via checkProximityWithFriends
 */
export const endTimeSession_Test = async (): Promise<number> => {
  try {
    const { endTimeSession } = await import('../services/locationService');

    // Cas 1: Fin d'une session avec un ID de session valide
    await endTimeSession('session-id');

    // Cas 2: Fin d'une session avec un ID de session vide
    await endTimeSession('');
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction cleanupStaleSessions
 * Nettoie les sessions avec positions GPS obsolètes
 * Appelle la fonction SQL end_stale_sessions côté serveur
 */
export const cleanupStaleSessions_Test = async (): Promise<number> => {
  try {
    const { cleanupStaleSessions } = await import('../services/locationService');

    // Cas 1: Nettoyage des sessions obsolètes
    const result = await cleanupStaleSessions();
    
    // Devrait retourner un nombre (count de sessions nettoyées)
    if (typeof result !== 'number') {
      return -1;
    }
  } catch (error) {
    return -2; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

/**
 * Test de la fonction isLocationTrackingActive
 * Vérifie si le suivi de localisation est actuellement actif
 * Retourne un booléen indiquant l'état du service de tracking
 */
export const isLocationTrackingActive_Test = async (): Promise<number> => {
  try {
    const { isLocationTrackingActive } = await import('../services/locationService');

    // Cas 1: Vérification du statut du tracking de localisation
    await isLocationTrackingActive();
  } catch (error) {
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};

// ========================================
// TESTS POUR supabase.ts
// ========================================

/**
 * Test de la fonction checkConnection
 * Vérifie la connectivité avec le serveur Supabase
 * Teste la disponibilité du service de base de données
 */
export const checkConnection_Test = async (): Promise<number> => {
  try {
    const { checkConnection } = await import('../services/supabase');

    // Cas 1: Vérification de la connexion à Supabase
    await checkConnection();
  } catch (error) {
    console.error('checkConnection error:', error);
    return -1; // Échec si erreur
  }

  return 1; // Succès: tous les cas passent
};
