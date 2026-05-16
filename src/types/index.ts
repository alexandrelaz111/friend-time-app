// Types principaux de l'application FriendTime

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  // Données jointes de l'ami
  friend?: User;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface UserLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
}

export interface TimeSession {
  id: string;
  user_id: string;
  friend_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  is_active: boolean;
  // Coordonnées GPS (enregistrées au début de la session)
  latitude?: number;
  longitude?: number;
  // Lieu détecté via reverse geocoding
  place_name?: string;
  place_category?: string;
  place_emoji?: string;
  city?: string;
}

export interface FriendTimeStats {
  friend_id: string;
  friend: User;
  total_seconds: number;
  total_hours: number;
  sessions_count: number;
  last_seen?: string;
  // Dernier lieu connu avec cet ami
  last_place_name?: string;
  last_place_emoji?: string;
  last_city?: string;
}

export interface MonthlyStats {
  month: string; // Format: "2025-01"
  friend_id: string;
  total_seconds: number;
  total_hours: number;
}

// Navigation
export type RootStackParamList = {
  MainTabs: undefined;
  FriendDetail: { friendId: string; friendName: string; friendAvatarUrl?: string };
};

// Configuration de la géolocalisation
export interface LocationConfig {
  // Distance en mètres pour considérer deux personnes "ensemble"
  proximityThreshold: number;
  // Intervalle de mise à jour en secondes
  updateInterval: number;
  // Précision minimale acceptable en mètres
  minAccuracy: number;
}

export const DEFAULT_LOCATION_CONFIG: LocationConfig = {
  proximityThreshold: 50, // 50 mètres
  updateInterval: 30, // 30 secondes
  minAccuracy: 100, // 100 mètres de précision max
};
