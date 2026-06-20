import React, { useState, useEffect, useCallback } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { containsUrdu } from '../utils/textUtils';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerProfile'>;

const COLORS = {
  background: '#FFFFFF',
  text: '#161d26',
  accent: '#00e482',
};

const MEASUREMENT_FIELDS = [
  { id: 'length', label: 'Length', urdu: 'لمبائی', icon: 'resize' },
  { id: 'chest', label: 'Chest', urdu: 'چھاتی', icon: 'shirt-outline' },
  { id: 'waist', label: 'Waist', urdu: 'کمر', icon: 'body-outline' },
  { id: 'hips', label: 'Hips', urdu: 'ہپس', icon: 'expand-outline' },
  { id: 'shoulder', label: 'Shoulder', urdu: 'تیرا', icon: 'git-commit-outline' },
  { id: 'sleeve', label: 'Sleeve', urdu: 'بازو', icon: 'hand-right-outline' },
  { id: 'collar', label: 'Collar', urdu: 'کالر', icon: 'ribbon-outline' },
  { id: 'shalwarLength', label: 'Shalwar', urdu: 'شلوار لمبائی', icon: 'arrow-down-outline' },
  { id: 'pancha', label: 'Pancha', urdu: 'پانچہ', icon: 'code-outline' },
];

export default function CustomerProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { customerId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [customerNumber, setCustomerNumber] = useState<number>(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [garmentType, setGarmentType] = useState('Kameez Shalwar');

  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      // Fetch base customer details + defaults
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      setName(customerData.name || '');
      setPhone(customerData.phone || '');
      setCustomerNumber(customerData.customer_number);

      // If they have default measurements, use them. Otherwise, see if they have past orders.
      if (customerData.default_measurements && Object.keys(customerData.default_measurements).length > 0) {
        setMeasurements(customerData.default_measurements);
        setGarmentType(customerData.default_garment_type || 'Kameez Shalwar');
      } else {
        const { data: orderData } = await supabase
          .from('orders')
          .select('measurements, garment_type')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (orderData) {
          setMeasurements(orderData.measurements || {});
          setGarmentType(orderData.garment_type || 'Kameez Shalwar');
        }
      }
    } catch (error) {
      console.error('Failed to load customer profile:', error);
      Alert.alert('Error', 'Unable to load customer profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeasurementChange = (id: string, value: string) => {
    setMeasurements((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          default_measurements: measurements,
          default_garment_type: garmentType,
        })
        .eq('id', customerId);

      if (error) throw error;
      
      Alert.alert('Success', 'Profile saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Ensure you have added the default_measurements columns to your database first.');
    } finally {
      setIsSaving(false);
    }
  };

  const startNewBooking = () => {
    navigation.navigate('Measurement', {
      customerId,
      customerNumber,
      customerName: name,
      customerPhone: phone,
      initialMeasurements: measurements,
      initialGarmentType: garmentType,
      initialStyle: null
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top', 'bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Customer Profile</Text>
            <Text style={styles.headerSubtitle}>گاہک کی تفصیلات</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* PROFILE CARD */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#161D26" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileId}>#{customerNumber}</Text>
            </View>
          </View>

          {/* PERSONAL DETAILS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Name - <Text style={{ fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 16 }}>نام</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.inputField,
                    containsUrdu(name) && { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 20 }
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Ali Khan"
                  placeholderTextColor="rgba(22, 29, 38, 0.3)"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Phone Number - <Text style={{ fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 16 }}>فون نمبر</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputField}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 0300 1234567"
                  placeholderTextColor="rgba(22, 29, 38, 0.3)"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* DEFAULT MEASUREMENTS */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Default Measurements</Text>
              <Text style={{ fontFamily: 'NotoNastaliqUrdu', color: 'rgba(22, 29, 38, 0.5)', fontSize: 16 }}>پیمائش</Text>
            </View>

            <View style={styles.grid}>
              {MEASUREMENT_FIELDS.map((field) => (
                <View key={field.id} style={styles.gridItem}>
                  <View style={styles.gridHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name={field.icon as any} size={16} color="rgba(22, 29, 38, 0.5)" />
                      <Text style={styles.gridLabelEnglish}>{field.label}</Text>
                    </View>
                    <Text style={styles.gridLabelUrdu}>{field.urdu}</Text>
                  </View>
                  <View style={styles.gridInputContainer}>
                    <TextInput
                      style={styles.gridInput}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="rgba(22, 29, 38, 0.2)"
                      value={measurements[field.id] || ''}
                      onChangeText={(val) => handleMeasurementChange(field.id, val)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
          <TouchableOpacity style={styles.secondaryButton} onPress={startNewBooking}>
            <Ionicons name="add-circle" size={20} color="#161D26" style={{ marginRight: 8 }} />
            <Text style={styles.secondaryButtonText}>New Booking</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.primaryButton, isSaving ? { opacity: 0.7 } : null]} 
            onPress={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Save Profile</Text>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.text} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(22, 29, 38, 0.05)' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F7F8FA', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'NotoNastaliqUrdu', fontSize: 15, color: 'rgba(22, 29, 38, 0.5)', marginTop: -4 },

  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 24, padding: 16, marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accent, borderColor: '#161D26', borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  profileId: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },

  formGroup: { gap: 8, marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginLeft: 4 },
  inputContainer: { backgroundColor: '#F7F8FA', borderRadius: 16, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  inputField: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '600', paddingVertical: 0 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', backgroundColor: '#F7F8FA', borderRadius: 20, padding: 16, marginBottom: 16 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gridLabelEnglish: { fontSize: 13, fontWeight: '800', color: 'rgba(22, 29, 38, 0.6)' },
  gridLabelUrdu: { fontFamily: 'NotoNastaliqUrdu', fontSize: 14, color: 'rgba(22, 29, 38, 0.6)' },
  gridInputContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 48, justifyContent: 'center', paddingHorizontal: 12 },
  gridInput: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center', paddingVertical: 0 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#FFFFFF', gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(22, 29, 38, 0.05)' },
  secondaryButton: { flex: 1, flexDirection: 'row', backgroundColor: '#F7F8FA', height: 60, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  primaryButton: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.accent, height: 60, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
});
