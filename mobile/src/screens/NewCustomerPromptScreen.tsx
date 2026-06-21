import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../../App';
import { colors } from '../theme/colors';


type Props = NativeStackScreenProps<RootStackParamList, 'NewCustomerPrompt'>;

const COLORS = {
  background: colors.white,
  text: colors.text,
  accent: colors.primary,
  inputBg: colors.surface,
};

export default function NewCustomerPromptScreen({ route, navigation }: Props) {
  const { garmentType, measurements, style, notes } = route.params;
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateAndProceed = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter the customer name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter the customer phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required.');

      const { data, error } = await supabase
        .from('customers')
        .insert({
          shop_id: user.id,
          name: name.trim(),
          phone: phone.trim() || null,
        })
        .select('id, name, phone, customer_number')
        .single();

      if (error) throw error;

      navigation.navigate('Invoice', {
        customerId: data.id,
        customerName: data.name || 'Unknown',
        customerPhone: data.phone || '',
        garmentType,
        measurements,
        style,
        notes,
      });
    } catch (error) {
      console.error('Customer create failed:', error);
      Alert.alert('Error', 'Unable to create customer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={40} color={COLORS.text} />
          </View>
          <Text style={[styles.title, { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 24, includeFontPadding: false, marginTop: -4, marginBottom: 28 }]}>
            گاہک کی تفصیل
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Customer Name *</Text>
                <Text style={styles.labelUrdu}>(نام)</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ahmed Khan"
                placeholderTextColor={colors.textOpacity(0.3)}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Phone Number *</Text>
                <Text style={styles.labelUrdu}>(فون)</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="03XX XXXXXXX"
                placeholderTextColor={colors.textOpacity(0.3)}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
            onPress={handleCreateAndProceed}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Create & Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.text} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginLeft: -8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    borderColor: COLORS.text,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOpacity(0.6),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelUrdu: {
    fontFamily: 'NotoNastaliqUrdu',
    fontSize: 14,
    color: colors.textOpacity(0.6),
    marginTop: -4,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
});
