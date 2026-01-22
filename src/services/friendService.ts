import { supabase } from './supabase';
import { Friend, User, FriendTimeStats, MonthlyStats } from '../types';

/**
 * Recherche un utilisateur par username
 */
export const searchUserByUsername = async (
  username: string
): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
};

/**
 * Envoie une demande d'amitié
 */
export const sendFriendRequest = async (
  userId: string,
  friendId: string
): Promise<{ success: boolean; error: string | null }> => {
  // Vérifie si une relation existe déjà
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .single();

  if (existing) {
    if (existing.status === 'accepted') {
      return { success: false, error: 'Vous êtes déjà amis' };
    }
    if (existing.status === 'pending') {
      return { success: false, error: 'Une demande est déjà en attente' };
    }
  }

  const { error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
};

/**
 * Accepte une demande d'amitié
 */
export const acceptFriendRequest = async (
  friendshipId: string
): Promise<{ success: boolean; error: string | null }> => {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
};

/**
 * Rejette une demande d'amitié
 */
export const rejectFriendRequest = async (
  friendshipId: string
): Promise<{ success: boolean; error: string | null }> => {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
};

/**
 * Supprime une amitié
 */
export const removeFriend = async (
  friendshipId: string
): Promise<{ success: boolean; error: string | null }> => {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
};

/**
 * Récupère la liste des amis acceptés
 */
export const getFriends = async (userId: string): Promise<Friend[]> => {
  // Récupère les amitiés où l'utilisateur est user_id
  const { data: sentFriendships } = await supabase
    .from('friendships')
    .select(`
      id,
      user_id,
      friend_id,
      status,
      created_at,
      friend:profiles!friendships_friend_id_fkey(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  // Récupère les amitiés où l'utilisateur est friend_id
  const { data: receivedFriendships } = await supabase
    .from('friendships')
    .select(`
      id,
      user_id,
      friend_id,
      status,
      created_at,
      friend:profiles!friendships_user_id_fkey(*)
    `)
    .eq('friend_id', userId)
    .eq('status', 'accepted');

  const friends: Friend[] = [];

  // Normalise les données
  if (sentFriendships) {
    friends.push(...sentFriendships.map(f => ({
      ...f,
      friend: f.friend as unknown as User,
    })));
  }

  if (receivedFriendships) {
    friends.push(...receivedFriendships.map(f => ({
      ...f,
      friend_id: f.user_id, // Inverse pour cohérence
      friend: f.friend as unknown as User,
    })));
  }

  return friends;
};

/**
 * Récupère les demandes d'amitié en attente (reçues)
 */
export const getPendingRequests = async (userId: string): Promise<Friend[]> => {
  const { data } = await supabase
    .from('friendships')
    .select(`
      id,
      user_id,
      friend_id,
      status,
      created_at,
      friend:profiles!friendships_user_id_fkey(*)
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (!data) return [];

  return data.map(f => ({
    ...f,
    friend: f.friend as unknown as User,
  }));
};

/**
 * Récupère les statistiques de temps passé avec chaque ami
 */
export const getFriendTimeStats = async (
  userId: string
): Promise<FriendTimeStats[]> => {
  // Récupère d'abord la liste des amis
  const friends = await getFriends(userId);

  if (friends.length === 0) return [];

  const stats: FriendTimeStats[] = [];

  for (const friend of friends) {
    const friendId = friend.friend?.id || friend.friend_id;

    // Récupère le total des sessions
    const { data: sessions } = await supabase
      .from('time_sessions')
      .select('duration_seconds, started_at')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .eq('is_active', false);

    const totalSeconds = (sessions || []).reduce(
      (sum, s) => sum + (s.duration_seconds || 0),
      0
    );

    // Dernière session
    const lastSession = sessions?.sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )[0];

    stats.push({
      friend_id: friendId,
      friend: friend.friend!,
      total_seconds: totalSeconds,
      total_hours: Math.round((totalSeconds / 3600) * 10) / 10, // 1 décimale
      sessions_count: sessions?.length || 0,
      last_seen: lastSession?.started_at,
    });
  }

  // Trie par temps passé (décroissant)
  return stats.sort((a, b) => b.total_seconds - a.total_seconds);
};

/**
 * Récupère les statistiques mensuelles avec un ami
 */
export const getMonthlyStats = async (
  userId: string,
  friendId: string
): Promise<MonthlyStats[]> => {
  const { data } = await supabase
    .from('monthly_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .order('month', { ascending: false });

  if (!data) return [];

  return data.map(s => ({
    month: s.month,
    friend_id: s.friend_id,
    total_seconds: s.total_seconds,
    total_hours: Math.round((s.total_seconds / 3600) * 10) / 10,
  }));
};

/**
 * Récupère les sessions actives en cours
 */
export const getActiveSessions = async (userId: string) => {
  const { data: sessions, error } = await supabase
    .from('time_sessions')
    .select(`
      id,
      friend_id,
      started_at,
      duration_seconds,
      friend:profiles!time_sessions_friend_id_fkey (
        id,
        username,
        avatar_url
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Erreur récupération sessions actives:', error);
    return [];
  }

  return sessions || [];
};

/**
 * Récupère les statistiques globales pour une période
 */
export const getStatsForPeriod = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ totalHours: number; friendsCount: number; topFriend: User | null }> => {
  const { data: sessions } = await supabase
    .from('time_sessions')
    .select('duration_seconds, friend_id')
    .eq('user_id', userId)
    .eq('is_active', false)
    .gte('started_at', startDate.toISOString())
    .lte('ended_at', endDate.toISOString());

  if (!sessions || sessions.length === 0) {
    return { totalHours: 0, friendsCount: 0, topFriend: null };
  }

  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const friendIds = new Set(sessions.map(s => s.friend_id));

  // Trouve l'ami avec qui on a passé le plus de temps
  const friendTotals: Record<string, number> = {};
  for (const session of sessions) {
    friendTotals[session.friend_id] = (friendTotals[session.friend_id] || 0) + session.duration_seconds;
  }

  const topFriendId = Object.entries(friendTotals).sort((a, b) => b[1] - a[1])[0]?.[0];

  let topFriend: User | null = null;
  if (topFriendId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', topFriendId)
      .single();
    topFriend = data as User;
  }

  return {
    totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
    friendsCount: friendIds.size,
    topFriend,
  };
};
