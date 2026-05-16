// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, Pressable, StyleSheet,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface Props { navigation: any; }

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (username.length < 3) {
      Alert.alert('Erreur', "Le nom d'utilisateur doit faire au moins 3 caracteres");
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit faire au moins 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, username.trim());
    setLoading(false);
    if (error) {
      Alert.alert("Erreur d'inscription", error);
    } else {
      Alert.alert('Compte cree !', 'Verifie tes emails pour confirmer ton compte.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
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
          <Text style={s.backText}>Retour</Text>
        </Pressable>

        <Text style={s.title}>Cree ton compte</Text>
        <Text style={s.subtitle}>
          Trois infos, et tu peux commencer a mesurer le temps avec tes amis.
        </Text>

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
            placeholder="Nom d'utilisateur"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Input
            placeholder="Confirme le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <Button variant="primary" size="lg" onPress={handleRegister} loading={loading} fullWidth>
            Creer mon compte
          </Button>
          <Text style={s.fineprint}>
            En t'inscrivant, tu acceptes que ta proximite avec tes amis soit mesuree.{'\n'}
            Ta position exacte n'est jamais partagee.
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
