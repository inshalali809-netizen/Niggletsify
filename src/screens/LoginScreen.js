import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { authService } from '../services/authService';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert('Error', 'Please enter email and password.'); return; }
    if (mode === 'register' && !name.trim()) { Alert.alert('Error', 'Please enter your name.'); return; }
    setLoading(true);
    try {
      let userData;
      if (mode === 'login') {
        userData = await authService.login(email.trim(), password);
      } else {
        userData = await authService.register(email.trim(), password, name.trim());
      }
      onLogin(userData);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>Niggletsify</Text>
        <Text style={s.sub}>Chat with the squad 🔥</Text>
        {mode === 'register' && <TextInput style={s.input} placeholder="Your name" placeholderTextColor="#555" value={name} onChangeText={setName} autoCapitalize="words" />}
        <TextInput style={s.input} placeholder="Email" placeholderTextColor="#555" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor="#555" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode(m => m === 'login' ? 'register' : 'login')}>
          <Text style={s.toggle}>{mode === 'login' ? "No account? Register" : "Have account? Sign In"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logo: { fontSize: 40, fontWeight: 'bold', color: '#00c853', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btn: { backgroundColor: '#00c853', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  toggle: { color: '#00c853', textAlign: 'center', marginTop: 24, fontSize: 14 },
});
