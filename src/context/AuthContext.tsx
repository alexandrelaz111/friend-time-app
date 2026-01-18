import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { getCurrentSession, onAuthStateChange, signIn, signOut, signUp } from '../services/authService';
import { initLocationService, startLocationTracking, stopLocationTracking } from '../services/locationService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLocationEnabled: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enableLocation: () => Promise<boolean>;
  disableLocation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  useEffect(() => {
    // Vérifie la session au démarrage
    const checkSession = async () => {
      const currentUser = await getCurrentSession();
      setUser(currentUser);
      setLoading(false);

      // Si connecté, initialise la localisation
      if (currentUser) {
        const enabled = await initLocationService(currentUser.id);
        if (enabled) {
          await startLocationTracking();
          setIsLocationEnabled(true);
        }
      }
    };

    checkSession();

    // Écoute les changements d'auth
    const { data: { subscription } } = onAuthStateChange((newUser) => {
      setUser(newUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    const { user: newUser, error } = await signIn(email, password);

    if (newUser) {
      setUser(newUser);
      // Active la localisation après connexion
      const enabled = await initLocationService(newUser.id);
      if (enabled) {
        await startLocationTracking();
        setIsLocationEnabled(true);
      }
    }

    return { error };
  };

  const handleSignUp = async (email: string, password: string, username: string) => {
    const { user: newUser, error } = await signUp(email, password, username);

    if (newUser) {
      setUser(newUser);
    }

    return { error };
  };

  const handleSignOut = async () => {
    await stopLocationTracking();
    setIsLocationEnabled(false);
    await signOut();
    setUser(null);
  };

  const enableLocation = async () => {
    if (!user) return false;

    const enabled = await initLocationService(user.id);
    if (enabled) {
      await startLocationTracking();
      setIsLocationEnabled(true);
      return true;
    }
    return false;
  };

  const disableLocation = async () => {
    await stopLocationTracking();
    setIsLocationEnabled(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLocationEnabled,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        enableLocation,
        disableLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
