import React, { useState, useEffect, useCallback } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TailorNumPad from '../components/TailorNumPad';
import { supabase } from '../lib/supabase';
import { containsUrdu } from '../utils/textUtils';
import type { RootStackParamList } from '../../App';
import { colors } from '../theme/colors';


type Props = NativeStackScreenProps<RootStackParamList, 'CustomerProfile'>;

const COLORS = {
  background: colors.white,
  text: colors.text,
  accent: colors.primary,
};

const MEASUREMENT_FIELDS = [
  { id: 'length', label: 'Length', urdu: 'لمبائی', icon: 'arrow-down-outline' },
  { id: 'shoulder', label: 'Shoulder', urdu: 'تیرا', icon: 'git-commit-outline' },
  { id: 'sleeve', label: 'Sleeve', urdu: 'بازو', icon: 'hand-right-outline' },
  { id: 'chest', label: 'Chest', urdu: 'چھاتی', icon: 'shirt-outline' },
  { id: 'waist', label: 'Waist', urdu: 'کمر', icon: 'disc-outline' },
  { id: 'neck', label: 'Neck', urdu: 'گلا', icon: 'person-circle-outline' },
  { id: 'shalwar', label: 'Shalwar', urdu: 'شلوار', icon: 'arrow-down-circle-outline' },
  { id: 'paincha', label: 'Paincha', urdu: 'پانچا', icon: 'footsteps-outline' },
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

  const [activeField, setActiveField] = useState<string | null>(null);
  const [isNumPadVisible, setIsNumPadVisible] = useState(false);

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

      const defaultGarment = customerData.default_garment_type || 'Kameez Shalwar';
      setGarmentType(defaultGarment);

      // If they have default measurements for this garment, use them. Otherwise, see if they have past orders.
      if (customerData.default_measurements && customerData.default_measurements[defaultGarment]) {
        setMeasurements(customerData.default_measurements[defaultGarment]);
      } else {
        const { data: orderData } = await supabase
          .from('orders')
          .select('measurements, garment_type')
          .eq('customer_id', customerId)
          .eq('garment_type', defaultGarment)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (orderData) {
          setMeasurements(orderData.measurements || {});
        }
      }
    } catch (error) {
      console.error('Failed to load customer profile:', error);
      Alert.alert('Error', 'Unable to load customer profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (val: string) => {
    if (!activeField) return;
    
    if (val === '⌫') {
      setMeasurements(prev => ({
        ...prev,
        [activeField]: (prev[activeField] || '').slice(0, -1)
      }));
    } else if (val === 'NEXT') {
      const idx = MEASUREMENT_FIELDS.findIndex(f => f.id === activeField);
      if (idx < MEASUREMENT_FIELDS.length - 1) {
        setActiveField(MEASUREMENT_FIELDS[idx + 1].id);
      } else {
        closeNumPad();
      }
    } else if (/^[\d.]$/.test(val) || ['¼', '½', '¾'].includes(val)) {
      setMeasurements(prev => ({
        ...prev,
        [activeField]: (prev[activeField] || '') + val
      }));
    }
  };

  const openNumPad = (fieldId: string) => {
    setActiveField(fieldId);
    setIsNumPadVisible(true);
  };

  const closeNumPad = () => {
    setActiveField(null);
    setIsNumPadVisible(false);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const { data: existing } = await supabase.from('customers').select('default_measurements').eq('id', customerId).single();
      const existingDefaults = existing?.default_measurements || {};

      const { error } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          default_measurements: {
            ...existingDefaults,
            [garmentType]: measurements
          },
          default_garment_type: garmentType,
        })
        .eq('id', customerId);

      if (error) throw error;
      
      Toast.show({
        type: 'success',
        text1: 'Profile Saved',
        text2: 'Customer profile has been successfully updated.',
      });
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
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.profileCard}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ color: colors.textOpacity(0.4), fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                Customer Profile
              </Text>
              <Text 
                style={[
                  { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
                  containsUrdu(name) && { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 20, lineHeight: 32, paddingTop: 4, textAlign: 'left' }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {name}
              </Text>
              <Text style={{ color: colors.textOpacity(0.6), fontSize: 15, fontWeight: '600', marginTop: containsUrdu(name) ? -4 : 4 }}>
                {phone || 'No phone number'}
              </Text>
            </View>
            <View style={styles.idTag}>
              <Text style={styles.idTagText} numberOfLines={1} adjustsFontSizeToFit>
                #{customerNumber || '?'}
              </Text>
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
                  placeholderTextColor={colors.textOpacity(0.3)}
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
                  placeholderTextColor={colors.textOpacity(0.3)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* DEFAULT MEASUREMENTS */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Default Measurements</Text>
              <Text style={{ fontFamily: 'NotoNastaliqUrdu', color: colors.textOpacity(0.5), fontSize: 16 }}>پیمائش</Text>
            </View>

            <View style={styles.grid}>
              {MEASUREMENT_FIELDS.map((field) => {
                const isActive = activeField === field.id;
                const val = measurements[field.id] || '';
                return (
                  <TouchableOpacity
                    key={field.id}
                    style={[styles.measureInput, isActive ? styles.measureInputActive : null]}
                    onPress={() => openNumPad(field.id)}
                  >
                    <View style={styles.measureLabelRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={field.icon as any} size={16} color={isActive ? colors.primary : colors.textOpacity(0.4)} />
                        <Text style={[styles.measureLabelEng, isActive ? { color: colors.text } : null]}>{field.label}</Text>
                      </View>
                      <Text style={[styles.measureLabelUrdu, isActive ? { color: colors.primary } : null]}>{field.urdu}</Text>
                    </View>
                    <Text style={[styles.measureValue, !val ? styles.measureValueEmpty : null, isActive ? styles.measureValueActive : null]}>
                      {val || '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
        {isNumPadVisible ? (
          <TailorNumPad 
            onKeyPress={handleKeyPress} 
            onClose={closeNumPad}
            activeFieldLabel={MEASUREMENT_FIELDS.find(f => f.id === activeField)?.label || ''}
          />
        ) : (
          <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
            <TouchableOpacity 
              style={[styles.primaryButton, isSaving ? { opacity: 0.7 } : null]} 
              onPress={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Update Profile</Text>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.text} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(22, 29, 38, 0.05)' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'NotoNastaliqUrdu', fontSize: 15, color: colors.textOpacity(0.5), marginTop: -4 },

  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E8ECEF', ...Platform.select({ ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } }) },
  idTag: { backgroundColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.primary, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  idTagText: { color: colors.text, fontSize: 20, fontWeight: '900' },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },

  formGroup: { gap: 8, marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginLeft: 4 },
  inputContainer: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  inputField: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '600', paddingVertical: 0 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  measureInput: { width: '48%', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: 'transparent' },
  measureInputActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  measureLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  measureLabelEng: { fontSize: 12, fontWeight: '700', color: colors.textOpacity(0.4) },
  measureLabelUrdu: { fontFamily: 'NotoNastaliqUrdu', fontSize: 12, color: colors.textOpacity(0.4), marginTop: -4 },
  measureValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  measureValueEmpty: { color: colors.textOpacity(0.2) },
  measureValueActive: { color: colors.primary },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, backgroundColor: colors.white, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(22, 29, 38, 0.05)' },
  secondaryButton: { flex: 1, flexDirection: 'row', backgroundColor: colors.surface, height: 60, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  primaryButton: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.accent, height: 60, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
});
