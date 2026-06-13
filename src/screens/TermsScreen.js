import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export default function TermsScreen({ onAccept }) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.logo}><Text style={s.logoTxt}>N</Text></View>
        <Text style={s.title}>Terms of Service</Text>
        <Text style={s.sub}>Please read before using Niggletsify</Text>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {[
          { heading: '1. Acceptance of Terms', body: 'By creating an account and using Niggletsify, you agree to these Terms of Service. If you do not agree, please do not use this application.' },
          { heading: '2. Eligibility', body: 'You must be at least 13 years of age to use Niggletsify. By using this app, you confirm that you meet this requirement.' },
          { heading: '3. User Accounts', body: 'You are responsible for maintaining the security of your account credentials. You agree to notify us immediately of any unauthorized use of your account. You are responsible for all activity under your account.' },
          { heading: '4. Acceptable Use', body: 'You agree not to use Niggletsify to send spam, harass other users, share illegal content, or engage in any activity that violates applicable laws. We reserve the right to terminate accounts that violate these terms.' },
          { heading: '5. Privacy & Encryption', body: 'Messages sent through Niggletsify are encrypted in transit and at rest. While we implement reasonable security measures, no system is 100% secure. Please do not share highly sensitive information.' },
          { heading: '6. Message Content', body: 'You retain ownership of the content you send. By using our service, you grant Niggletsify a limited license to transmit and store your messages solely for the purpose of providing the service.' },
          { heading: '7. Limitation of Liability', body: 'Niggletsify is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the application.' },
          { heading: '8. Changes to Terms', body: 'We may update these Terms at any time. Continued use of the app after changes constitutes acceptance of the new Terms.' },
          { heading: '9. Contact', body: 'For questions about these Terms, contact us at inshalali809@gmail.com' },
        ].map((item, i) => (
          <View key={i} style={s.section}>
            <Text style={s.heading}>{item.heading}</Text>
            <Text style={s.body}>{item.body}</Text>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {onAccept && (
        <View style={s.footer}>
          <Text style={s.footerNote}>By tapping Accept, you also agree to our Privacy Policy.</Text>
          <TouchableOpacity style={s.acceptBtn} onPress={onAccept}>
            <Text style={s.acceptTxt}>I Accept & Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  header: { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#1A1A2E' },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#00C853', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoTxt: { fontSize: 28, fontWeight: '800', color: '#000' },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  sub: { fontSize: 13, color: '#4A5568' },
  scroll: { flex: 1, padding: 20 },
  section: { marginBottom: 20 },
  heading: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  body: { fontSize: 14, color: '#718096', lineHeight: 22 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#1A1A2E' },
  footerNote: { fontSize: 12, color: '#4A5568', textAlign: 'center', marginBottom: 12 },
  acceptBtn: { backgroundColor: '#00C853', borderRadius: 12, padding: 16, alignItems: 'center' },
  acceptTxt: { color: '#000', fontWeight: '700', fontSize: 16 },
});
