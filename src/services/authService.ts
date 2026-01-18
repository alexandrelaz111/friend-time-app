import { supabase } from './supabase';
import { User } from '../types';
import { setCurrentUserId, startLocationTracking, stopLocationTracking } from './locationService';

/**
 * Inscription d'un nouvel utilisateur
 */
export const signUp = async (
  email: string,
  password: string,
  username: string
): Promise<{ user: User | null; error: string | null }> => {
  try {
    // Vérifie si le username est déjà pris
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return { user: null, error: 'Ce nom d\'utilisateur est déjà pris' };
    }

    // Crée le compte
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Erreur lors de la création du compte' };
    }

    // Le trigger Supabase crée automatiquement le profil
    // On attend un peu puis on récupère le profil
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      user: profile as User,
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
};

/**
 * Connexion d'un utilisateur existant
 */
export const signIn = async (
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Erreur de connexion' };
    }

    // Récupère le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return { user: null, error: 'Profil non trouvé' };
    }

    // Configure le service de localisation
    setCurrentUserId(profile.id);

    return {
      user: profile as User,
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
};

/**
 * Déconnexion
 */
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    // Arrête le tracking
    await stopLocationTracking();
    setCurrentUserId(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Récupère la session actuelle
 */
export const getCurrentSession = async (): Promise<User | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setCurrentUserId(profile.id);
    }

    return profile as User;
  } catch {
    return null;
  }
};

/**
 * Met à jour le profil utilisateur
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<Pick<User, 'username' | 'avatar_url'>>
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Réinitialisation du mot de passe
 */
export const resetPassword = async (
  email: string
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Écoute les changements d'authentification
 */
export const onAuthStateChange = (
  callback: (user: User | null) => void
) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setCurrentUserId(profile?.id || null);
      callback(profile as User);
    } else {
      setCurrentUserId(null);
      callback(null);
    }
  });
};
