import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthScreen() {
  const [shopKey, setShopKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!shopKey.trim()) {
      Alert.alert('Error', 'Please enter your Shop Key.');
      return;
    }

    setIsLoading(true);
    const email = `${shopKey.trim()}@inchi.pk`;
    const password = shopKey.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      Alert.alert('Invalid Key', 'The Shop Key you entered is incorrect or your shop has been suspended.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>INCHI</Text>
            <Text style={styles.tagline}>Tailor Management Platform</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Enter your secure Shop Key to continue.</Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. INCHI-XXXX-XXXX"
              placeholderTextColor="rgba(22, 29, 38, 0.4)"
              value={shopKey}
              onChangeText={setShopKey}
              autoCapitalize="characters"
              autoCorrect={false}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#161d26" />
              ) : (
                <Text style={styles.buttonText}>Access Dashboard</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#00e482',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#161d26',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#161d26',
    fontWeight: '600',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#161d26',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(22, 29, 38, 0.6)',
    marginBottom: 30,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.1)',
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    fontWeight: '600',
    color: '#161d26',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#00e482',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#161d26',
    fontSize: 18,
    fontWeight: '800',
  },
});
