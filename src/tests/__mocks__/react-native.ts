// Mock simple de React Native pour éviter les erreurs de parsing
export const Platform = {
  OS: 'ios',
  select: (obj: any) => obj.ios || obj.default,
};

export const StyleSheet = {
  create: (styles: any) => styles,
};

export const View = 'View';
export const Text = 'Text';
export const TextInput = 'TextInput';
export const TouchableOpacity = 'TouchableOpacity';
export const ScrollView = 'ScrollView';
export const FlatList = 'FlatList';
export const Alert = {
  alert: () => {},
};
export const ActivityIndicator = 'ActivityIndicator';
export const Switch = 'Switch';
export const KeyboardAvoidingView = 'KeyboardAvoidingView';
export const RefreshControl = 'RefreshControl';
export const Modal = 'Modal';
export const Dimensions = {
  get: () => ({ width: 375, height: 812 }),
};
