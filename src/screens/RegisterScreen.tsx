// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, Pressable, StyleSheet,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface Props { navigation: any; }

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password.trim()) {
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return;
    }
    if (username.length < 3) {
      Alert.alert(t('auth.error'), t('auth.usernameMinLength'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('auth.error'), t('auth.passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('auth.error'), t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, username.trim());
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.signUpError'), error);
    } else {
      Alert.alert(t('auth.accountCreated'), '', [
        { text: t('common.ok'), onPress: () => navigation.navigate('Login') },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.navigate('Login')} style={s.back}>
          <ArrowLeft size={16} color={THEME.color.fg2} strokeWidth={1.75} />
          <Text style={s.backText}>{t('auth.back')}</Text>
        </Pressable>

        <Text style={s.title}>{t('auth.registerTitle')}</Text>
        <Text style={s.subtitle}>
          {t('auth.registerSubtitle')}
        </Text>

        <View style={s.form}>
          <Input
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            placeholder={t('auth.username')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Input
            placeholder={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <Button variant="primary" size="lg" onPress={handleRegister} loading={loading} fullWidth>
            {t('auth.createAccount')}
          </Button>
          <Text style={s.fineprint}>
            {t('auth.privacyNote')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.color.cream },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  backText: { fontSize: 14, fontFamily: THEME.font.bodySemibold, color: THEME.color.fg2 },
  title: {
    fontFamily: THEME.font.display,
    fontSize: 44,
    lineHeight: 46,
    color: THEME.color.ink,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: THEME.font.body,
    color: THEME.color.fg2,
    lineHeight: 22,
    marginBottom: 28,
  },
  form: { gap: 12 },
  fineprint: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: THEME.font.body,
    color: THEME.color.fg3,
    textAlign: 'center',
    lineHeight: 18,
  },
});
