import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function PrivacyPolicyScreen() {
  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.lastUpdated}>Last updated: June 2026</Text>
        {[
          { heading: '1. Information We Collect', body: 'We collect the information you provide when creating an account (display name, email address). We also store messages you send through the app and metadata such as timestamps.' },
          { heading: '2. How We Use Your Information', body: 'Your information is used solely to provide the Niggletsify messaging service. We do not sell, rent, or share your personal information with third parties for marketing purposes.' },
          { heading: '3. Message Encryption', body: 'All messages are encrypted using AES-256 encryption. Messages are stored in encrypted form on Firebase servers. While we implement strong encryption, we recommend users exercise caution with sensitive information.' },
          { heading: '4. Data Storage', body: 'Your data is stored on Google Firebase servers. Firebase follows industry-standard security practices. Please refer to Google\'s Privacy Policy for details on their data handling practices.' },
          { heading: '5. Data Retention', body: 'Your messages and account data are retained as long as your account is active. You may delete your account and associated data at any time by contacting us.' },
          { heading: '6. Third-Party Services', body: 'Niggletsify uses Google Firebase for authentication and data storage. Google\'s use of your data is governed by Google\'s Privacy Policy (policies.google.com).' },
          { heading: '7. Children\'s Privacy', body: 'Niggletsify is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.' },
          { heading: '8. Security', body: 'We implement technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure.' },
          { heading: '9. Your Rights', body: 'You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at inshalali809@gmail.com.' },
          { heading: '10. Contact Us', body: 'If you have questions about this Privacy Policy, please contact us at: inshalali809@gmail.com' },
        ].map((item, i) => (
          <View key={i} style={s.section}>
            <Text style={s.heading}>{item.heading}</Text>
            <Text style={s.body}>{item.body}</Text>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  scroll: { flex: 1, padding: 20 },
  lastUpdated: { fontSize: 12, color: '#4A5568', marginBottom: 20 },
  section: { marginBottom: 20 },
  heading: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  body: { fontSize: 14, color: '#718096', lineHeight: 22 },
});
