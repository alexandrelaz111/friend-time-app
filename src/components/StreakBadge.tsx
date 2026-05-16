// src/components/StreakBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { THEME } from '../theme';

interface StreakBadgeProps {
  streak: number;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak }) => {
  if (streak < 2) return null;

  return (
    <View style={s.badge}>
      <Flame size={12} color={THEME.color.honeyDeep} strokeWidth={2} fill={THEME.color.honey} />
      <Text style={s.text}>{streak}j</Text>
    </View>
  );
};

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: THEME.color.honeySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontFamily: THEME.font.bodySemibold,
    fontSize: 11,
    color: THEME.color.honeyDeep,
  },
});
