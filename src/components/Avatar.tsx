// src/components/Avatar.tsx
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { THEME, avatarColorFor } from '../theme';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 48 }) => {
  const c = avatarColorFor(name);
  const initial = (name || '?').charAt(0).toUpperCase();
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View
      style={[
        s.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.bg,
        },
      ]}
    >
      <Text
        style={[
          s.letter,
          { color: c.fg, fontSize: size * 0.5, lineHeight: size * 0.5 },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
};

const s = StyleSheet.create({
  root: { justifyContent: 'center', alignItems: 'center' },
  letter: {
    fontFamily: THEME.font.display,
    textAlign: 'center',
  },
});
