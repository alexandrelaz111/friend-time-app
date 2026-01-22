// Setup file pour les tests
import { vi } from 'vitest';

// Mock complet de React Native pour éviter les erreurs de parsing Flow
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (obj: any) => obj.ios || obj.default,
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Alert: {
    alert: vi.fn(),
  },
  ActivityIndicator: 'ActivityIndicator',
  Switch: 'Switch',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  RefreshControl: 'RefreshControl',
  Modal: 'Modal',
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 812 })),
  },
}));

// Mock React Native Safe Area Context
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
