// src/components/Button.tsx
import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { THEME } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: LucideIcon;
  style?: ViewStyle | ViewStyle[];
  fullWidth?: boolean;
}

const sizes: Record<Size, { padY: number; padX: number; font: number; radius: number }> = {
  sm: { padY: 8,  padX: 14, font: 13, radius: 10 },
  md: { padY: 14, padX: 18, font: 15, radius: 14 },
  lg: { padY: 16, padX: 20, font: 16, radius: 16 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onPress,
  disabled,
  loading,
  leadingIcon: LeadingIcon,
  style,
  fullWidth,
}) => {
  const sz = sizes[size];

  const baseStyle: ViewStyle = {
    paddingVertical: sz.padY,
    paddingHorizontal: sz.padX,
    borderRadius: sz.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: disabled ? 0.4 : 1,
    ...(fullWidth ? {} : { alignSelf: 'flex-start' }),
  };

  const variantStyle: ViewStyle = {
    primary: { backgroundColor: THEME.color.ember, ...THEME.shadow.sm, shadowColor: THEME.color.ember, shadowOpacity: 0.30 },
    secondary: { backgroundColor: THEME.color.paper, borderWidth: 1, borderColor: THEME.color.sandSoft },
    ghost: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: THEME.color.tomato, ...THEME.shadow.sm, shadowColor: THEME.color.tomato, shadowOpacity: 0.25 },
  }[variant];

  const fg = {
    primary: '#FFFFFF',
    secondary: THEME.color.ink,
    ghost: THEME.color.ember,
    destructive: '#FFFFFF',
  }[variant];

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        baseStyle,
        variantStyle,
        pressed && !disabled && { transform: [{ scale: 0.97 }], opacity: 0.92 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {LeadingIcon ? <LeadingIcon size={16} color={fg} strokeWidth={1.75} /> : null}
          <Text style={[s.label, { color: fg, fontSize: sz.font }]}>{children}</Text>
        </>
      )}
    </Pressable>
  );
};

const s = StyleSheet.create({
  btn: {},
  label: {
    fontFamily: THEME.font.bodySemibold,
    fontWeight: '600',
  },
});
