import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Feedback haptique léger (notification simple)
 * Usage: tap sur bouton, sélection item
 */
export const lightHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silently fail - haptics not critical
    }
  }
};

/**
 * Feedback haptique moyen
 * Usage: actions importantes, confirmation
 */
export const mediumHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Silently fail
    }
  }
};

/**
 * Feedback haptique fort
 * Usage: actions critiques, erreurs
 */
export const heavyHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Silently fail
    }
  }
};

/**
 * Feedback de succès
 * Usage: action réussie, validation
 */
export const successHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Silently fail
    }
  }
};

/**
 * Feedback d'avertissement
 * Usage: action qui nécessite attention
 */
export const warningHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      // Silently fail
    }
  }
};

/**
 * Feedback d'erreur
 * Usage: action échouée, validation ratée
 */
export const errorHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Silently fail
    }
  }
};

/**
 * Feedback de sélection
 * Usage: changement de valeur, sélection dans liste
 */
export const selectionHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Silently fail
    }
  }
};
