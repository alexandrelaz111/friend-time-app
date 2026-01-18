import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Credentials Supabase FriendTime
const SUPABASE_URL = 'https://vofnobqspcxgxjcwwfux.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZm5vYnFzcGN4Z3hqY3d3ZnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTQ0OTEsImV4cCI6MjA4NDI3MDQ5MX0.FraJl6H6TQXds8Zj9bUP7TEBCFYsNBcUx-v0GodTeAg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Fonction utilitaire pour vérifier la connexion
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};
