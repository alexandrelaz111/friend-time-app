// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, Alert, StyleSheet, Pressable, ScrollView,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface Props { navigation: any; }

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Erreur de connexion', error);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <Svg width={64} height={64} viewBox="0 0 64 64">
            <Circle cx="24" cy="32" r="18" fill="#F2B95C" opacity={0.95} />
            <Circle cx="40" cy="32" r="18" fill="#E66A3C" opacity={0.95} />
            <Path d="M24 14a18 18 0 0 1 0 36 18 18 0 0 1 0-36Zm16 36a18 18 0 0 1 0-36 18 18 0 0 0 0 36Z" fill="#C9532A" />
            <Circle cx="32" cy="32" r="2.4" fill="#FFFFFF" />
          </Svg>
          <Text style={s.wordmark}>FriendTime</Text>
          <Text style={s.tagline}>Le temps passe ensemble,{'\n'}compte pour de vrai.</Text>
        </View>

        <View style={s.form}>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button variant="primary" size="lg" onPress={handleLogin} loading={loading} fullWidth>
            Se connecter
          </Button>
          <Pressable onPress={() => navigation.navigate('Register')} style={s.linkRow}>
            <Text style={s.linkText}>
              Pas encore de compte ? <Text style={s.linkBold}>S'inscrire</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.color.cream },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 40 },
  wordmark: {
    fontFamily: THEME.font.display,
    fontSize: 56,
    lineHeight: 60,
    color: THEME.color.ink,
    letterSpacing: -1.2,
    marginTop: 18,
  },
  tagline: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: { gap: 12 },
  linkRow: { alignItems: 'center', marginTop: 14 },
  linkText: { fontSize: 14, fontFamily: THEME.font.body, color: THEME.color.fg2 },
  linkBold: { color: THEME.color.ember, fontFamily: THEME.font.bodyBold, fontWeight: '700' },
});
