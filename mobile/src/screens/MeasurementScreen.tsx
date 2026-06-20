import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import TailorNumPad from '../components/TailorNumPad';

const MEASUREMENTS = [
  { id: 'length', label: 'Length / لمبائی' },
  { id: 'shoulder', label: 'Shoulder / تیرا' },
  { id: 'sleeve', label: 'Sleeve / بازو' },
  { id: 'chest', label: 'Chest / چھاتی' },
  { id: 'waist', label: 'Waist / کمر' },
  { id: 'neck', label: 'Neck / گلا' },
  { id: 'shalwar', label: 'Shalwar / شلوار' },
  { id: 'paincha', label: 'Paincha / پانچا' },
];

export default function MeasurementScreen({ route, navigation }: any) {
  const { customerId, customerName, customerPhone } = route.params;

  // State to ensure customer info is always visible even if missing from route params
  const [name, setName] = useState(customerName || 'Loading...');
  const [phone, setPhone] = useState(customerPhone || '');

  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string>('length');
  const [collar, setCollar] = useState('Ban');
  const [pockets, setPockets] = useState<string[]>(['Front']);
  const [notes, setNotes] = useState('');

  const requiredFilled = Object.values(measurements).filter(v => v).length;
  const totalRequired = 5; // length, shoulder, sleeve, chest, waist

  // Fetch customer from Supabase if name wasn't passed from the previous screen
  useEffect(() => {
    if (!customerName) {
      const fetchCustomer = async () => {
        const { data } = await supabase.from('customers').select('name, phone').eq('id', customerId).single();
        if (data) {
          setName(data.name);
          setPhone(data.phone);
        } else {
          setName('Unknown Customer');
        }
      };
      fetchCustomer();
    }
  }, [customerId, customerName]);

  const handleKeyPress = (val: string) => {
    if (val === '⌫') {
      setMeasurements(prev => ({
        ...prev,
        [activeField]: (prev[activeField] || '').slice(0, -1)
      }));
    } else if (val === 'NEXT') {
      const idx = MEASUREMENTS.findIndex(f => f.id === activeField);
      if (idx < MEASUREMENTS.length - 1) {
        setActiveField(MEASUREMENTS[idx + 1].id);
      }
    } else if (/^[\d.]$/.test(val)) {
      setMeasurements(prev => ({
        ...prev,
        [activeField]: (prev[activeField] || '') + val
      }));
    }
  };

  const togglePocket = (pocket: string) => {
    setPockets(p => p.includes(pocket) ? p.filter(x => x !== pocket) : [...p, pocket]);
  };

  const handleConfirm = () => {
    if (requiredFilled < totalRequired) {
      Alert.alert('Incomplete', 'Fill at least 5 main measurements');
      return;
    }
    navigation.navigate('Invoice', {
      customerId,
      customerName: name,
      customerPhone: phone,
      measurements,
      style: { collar, pockets },
      notes,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Customer Info Card */}
      <View style={styles.customerCard}>
        <View>
          <Text style={styles.customerLabel}>Customer</Text>
          <Text style={styles.customerName}>{name}</Text>
          <Text style={styles.customerPhone}>{phone}</Text>
        </View>
        <View style={styles.progressDot}>
          <Text style={styles.progressText}>{requiredFilled}/{totalRequired}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Measurements Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Measurements / پیمائش</Text>
          <View style={styles.grid}>
            {MEASUREMENTS.map(field => {
              const isActive = activeField === field.id;
              const val = measurements[field.id] || '';
              return (
                <TouchableOpacity
                  key={field.id}
                  style={[styles.measureBox, isActive && styles.measureBoxActive, val && styles.measureBoxFilled]}
                  onPress={() => setActiveField(field.id)}
                >
                  <Text style={styles.measureLabel}>{field.label}</Text>
                  <Text style={[styles.measureValue, isActive && styles.measureValueActive]}>
                    {val || '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Style Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Style / ڈیزائن</Text>
          
          <View style={styles.styleSection}>
            <Text style={styles.styleLabel}>Collar</Text>
            <View style={styles.styleRow}>
              {['Ban', 'Round'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.styleChip, collar === opt && styles.styleChipActive]}
                  onPress={() => setCollar(opt)}
                >
                  <Text style={[styles.styleChipText, collar === opt && styles.styleChipTextActive]}>
                    {opt === 'Ban' ? 'Ban / بین' : 'Round / گول'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.styleSection}>
            <Text style={styles.styleLabel}>Pockets</Text>
            <View style={styles.styleRow}>
              {['Front', '2 Side'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.styleChip, pockets.includes(opt) && styles.styleChipActive]}
                  onPress={() => togglePocket(opt)}
                >
                  <Text style={[styles.styleChipText, pockets.includes(opt) && styles.styleChipTextActive]}>
                    {opt === 'Front' ? 'Front / سامنے' : '2 Side / دونوں'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Notes Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes / ہدایات</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Special requests (optional)"
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            onFocus={() => setActiveField('')}
          />
        </View>

      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm & Invoice</Text>
        </TouchableOpacity>
      </View>

      {/* Keypad */}
      <TailorNumPad onKeyPress={handleKeyPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161D26',
  },
  customerPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  progressDot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00E482',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161D26', // Updated to Black
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161D26',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measureBox: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  measureBoxActive: {
    borderColor: '#00E482',
    backgroundColor: '#F0FFF8',
    borderWidth: 2,
  },
  measureBoxFilled: {
    borderColor: '#D0F0E8',
    backgroundColor: '#F9FFFD',
  },
  measureLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  measureValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#161D26',
  },
  measureValueActive: {
    color: '#00E482',
  },
  styleSection: {
    marginBottom: 16,
  },
  styleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161D26',
    marginBottom: 8,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  styleChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  styleChipActive: {
    borderColor: '#00E482',
    backgroundColor: '#00E482',
  },
  styleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  styleChipTextActive: {
    color: '#161D26', // Updated to Black
  },
  notesInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#161D26',
    textAlignVertical: 'top',
  },
  bottomBar: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  confirmButton: {
    backgroundColor: '#00E482',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161D26', // Updated to Black
  },
});