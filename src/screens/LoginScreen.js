import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { authService } from '../services/authService';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert('Missing Fields', 'Please enter your email and password.'); return; }
    if (mode === 'register' && !name.trim()) { Alert.alert('Missing Name', 'Please enter your display name.'); return; }
    if (password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await authService.login(email.trim().toLowerCase(), password)
        : await authService.register(email.trim().toLowerCase(), password, name.trim());
      onLogin(user);
    } catch (e) { Alert.alert('Error', e.message); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <View style={s.logoWrap}>
          <View style={s.logoCircle}><Text style={s.logoLetter}>N</Text></View>
          <Text style={s.appName}>Niggletsify</Text>
          <Text style={s.tagline}>Private. Encrypted. Fast.</Text>
        </View>

        <View style={s.form}>
          {mode === 'register' && (
            <View style={s.inputWrap}>
              <Text style={s.label}>Display Name</Text>
              <TextInput style={s.input} placeholder="How should friends see you?" placeholderTextColor="#4A5568"
                value={name} onChangeText={setName} autoCapitalize="words" />
            </View>
          )}
          <View style={s.inputWrap}>
            <Text style={s.label}>Email Address</Text>
            <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor="#4A5568"
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={s.inputWrap}>
            <Text style={s.label}>Password</Text>
            <View style={s.passRow}>
              <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="Min. 6 characters" placeholderTextColor="#4A5568"
                value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(p => !p)}>
                <Text style={s.eyeTxt}>{showPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : (
              <Text style={s.btnTxt}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.switchBtn} onPress={() => { setMode(m => m === 'login' ? 'register' : 'login'); setName(''); setPassword(''); }}>
            <Text style={s.switchTxt}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={s.switchLink}>{mode === 'login' ? 'Register' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.legalTxt}>
          By continuing you agree to our{' '}
          <Text style={s.legalLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={s.legalLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  inner: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#00C853', alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 8, shadowColor: '#00C853', shadowOpacity: 0.4, shadowRadius: 12 },
  logoLetter: { fontSize: 40, fontWeight: '800', color: '#000' },
  appName: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#718096', marginTop: 4 },
  form: { marginBottom: 24 },
  inputWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#A0AEC0', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#161622', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2D3748' },
  passRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161622', borderRadius: 12, borderWidth: 1, borderColor: '#2D3748', overflow: 'hidden' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  eyeTxt: { color: '#00C853', fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#00C853', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#000000', fontWeight: '700', fontSize: 16 },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchTxt: { color: '#718096', fontSize: 14 },
  switchLink: { color: '#00C853', fontWeight: '600' },
  legalTxt: { textAlign: 'center', color: '#4A5568', fontSize: 12, lineHeight: 18 },
  legalLink: { color: '#718096', textDecorationLine: 'underline' },
});
