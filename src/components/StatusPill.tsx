// src/components/StatusPill.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../theme';

type Tone = 'on' | 'off' | 'pending' | 'near' | 'neutral';

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
}

const tones: Record<Tone, { bg: string; fg: string; dot: string }> = {
  on:      { bg: THEME.color.sageSoft,   fg: THEME.color.sageDeep,   dot: THEME.color.sage },
  off:     { bg: THEME.color.tomatoSoft, fg: '#8B2918',              dot: THEME.color.tomato },
  pending: { bg: THEME.color.honeySoft,  fg: THEME.color.honeyDeep,  dot: THEME.color.honeyDeep },
  near:    { bg: THEME.color.emberSoft,  fg: THEME.color.emberDeep,  dot: THEME.color.ember },
  neutral: { bg: THEME.color.shell,      fg: THEME.color.fg2,        dot: THEME.color.fg2 },
};

export const StatusPill: React.FC<StatusPillProps> = ({ tone = 'neutral', children, dot = true }) => {
  const t = tones[tone];
  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      {dot ? <View style={[s.dot, { backgroundColor: t.dot }]} /> : null}
      <Text style={[s.label, { color: t.fg }]}>{children}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 999 },
  label: {
    fontSize: 12,
    fontFamily: THEME.font.bodySemibold,
    fontWeight: '600',
  },
});
