// src/components/Input.tsx
import React, { useState } from 'react';
import { TextInput, StyleSheet, TextInputProps, View, Text } from 'react-native';
import { THEME } from '../theme';

interface InputProps extends TextInputProps {
  error?: string;
}

export const Input: React.FC<InputProps> = ({ error, style, ...props }) => {
  const [focus, setFocus] = useState(false);

  return (
    <View>
      <TextInput
        placeholderTextColor={THEME.color.sand}
        {...props}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        style={[
          s.input,
          focus && s.focused,
          error && s.error,
          style,
        ]}
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
};

const s = StyleSheet.create({
  input: {
    backgroundColor: THEME.color.paper,
    borderWidth: 1,
    borderColor: THEME.color.sandSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: THEME.font.body,
    color: THEME.color.ink,
  },
  focused: {
    borderColor: THEME.color.ember,
    backgroundColor: '#FFFDFB',
  },
  error: {
    borderColor: THEME.color.tomato,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: THEME.color.tomato,
    fontFamily: THEME.font.body,
  },
});
