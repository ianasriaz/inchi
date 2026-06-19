import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Invoice'>;

const COLORS = {
  background: '#FFFFFF',
  text: '#161d26',
  accent: '#00e482',
};

const URDU_FONT = 'JameelNooriNastaleeqKasheeda';

const toNumericValue = (value: string) => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function InvoiceScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { customerId, garmentType, measurements, styles } = route.params ?? {
    customerId: 0,
    garmentType: 'Kameez Shalwar',
    measurements: {},
    styles: {},
  };

  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [customerName, setCustomerName] = useState('Loading...');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadCustomer = async () => {
      if (!customerId) {
        if (isActive) {
          setCustomerName('Unknown Customer');
        }
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('name, phone')
        .eq('id', customerId)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (error) {
        console.error('Failed to load customer summary:', error);
        setCustomerName('Unknown Customer');
        return;
      }

      setCustomerName(data?.name ?? 'Unknown Customer');
      setCustomerPhone(data?.phone ?? '');
    };

    loadCustomer();

    return () => {
      isActive = false;
    };
  }, [customerId]);

  const totalValue = useMemo(() => toNumericValue(totalAmount), [totalAmount]);
  const advanceValue = useMemo(() => toNumericValue(advanceAmount), [advanceAmount]);
  const balanceDue = Math.max(totalValue - advanceValue, 0);

  const handleGenerateOrder = async () => {
    if (!customerId) {
      Alert.alert('Missing Customer', 'Customer reference is missing. Please go back and select a customer.');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from('orders').insert({
        customer_id: customerId,
        garment_type: garmentType,
        measurements,
        style_options: {
          ...styles,
          pickup_date: pickupDate || null,
        },
        total_amount: totalValue,
        advance_amount: advanceValue,
      });

      if (error) {
        throw error;
      }

      navigation.popToTop();
    } catch (error) {
      console.error('Failed to generate order:', error);
      Alert.alert('Save Failed', error instanceof Error ? error.message : 'Unable to save the order.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerCard}>
            <Text style={styles.kicker}>Inchi Tailor Desk</Text>
            <Text style={styles.title}>Invoice / بل</Text>
            <Text style={styles.subtitle}>Add billing details, pickup date, and save the final invoice.</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Customer</Text>
              <Text style={styles.summaryValue}>{customerName}</Text>
            </View>

            {customerPhone ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phone</Text>
                <Text style={styles.summaryValue}>{customerPhone}</Text>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Garment Type</Text>
              <Text style={styles.summaryValue}>{garmentType}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Styles</Text>
              <Text style={styles.summaryValue}>
                {Object.entries(styles)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(' • ')}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Measurements</Text>
              <Text style={styles.summaryValue}>{Object.keys(measurements).length} fields captured</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing</Text>

            <View style={styles.billingGrid}>
              <View style={styles.billingCard}>
                <View style={styles.billingCardHeader}>
                  <Text style={styles.billingCardTitle}>Total Bill</Text>
                  <Text style={styles.billingCardUrdu}>کل بل</Text>
                </View>
                <TextInput
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder="Enter total bill"
                  placeholderTextColor="rgba(22, 29, 38, 0.35)"
                  keyboardType="numeric"
                  style={styles.cardInput}
                />
                <Text style={styles.billingHint}>This is the final customer bill amount.</Text>
              </View>

              <View style={styles.billingCard}>
                <View style={styles.billingCardHeader}>
                  <Text style={styles.billingCardTitle}>Advance Paid</Text>
                  <Text style={styles.billingCardUrdu}>ایڈوانس</Text>
                </View>
                <TextInput
                  value={advanceAmount}
                  onChangeText={setAdvanceAmount}
                  placeholder="Enter advance"
                  placeholderTextColor="rgba(22, 29, 38, 0.35)"
                  keyboardType="numeric"
                  style={styles.cardInput}
                />
                <Text style={styles.billingHint}>Advance payment received now.</Text>
              </View>
            </View>

            <View style={styles.billingCardWide}>
              <View style={styles.billingCardHeader}>
                <Text style={styles.billingCardTitle}>Pickup Date</Text>
                <Text style={styles.billingCardUrdu}>تاریخِ وصولی</Text>
              </View>
              <TextInput
                value={pickupDate}
                onChangeText={setPickupDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(22, 29, 38, 0.35)"
                style={styles.cardInput}
              />
              <Text style={styles.billingHint}>Use a clear date so the pickup reminder is easy to read.</Text>
            </View>
          </View>

          <View style={styles.invoiceCard}>
            <Text style={styles.invoiceHeading}>Beautiful Invoice Preview</Text>

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Customer</Text>
              <Text style={styles.invoiceValue}>{customerName}</Text>
            </View>

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Garment</Text>
              <Text style={styles.invoiceValue}>{garmentType}</Text>
            </View>

            <View style={styles.invoiceDivider} />

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Total Bill</Text>
              <Text style={styles.invoiceValue}>Rs. {totalValue}</Text>
            </View>

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Advance Paid</Text>
              <Text style={styles.invoiceValue}>Rs. {advanceValue}</Text>
            </View>

            <View style={styles.invoiceRowHighlight}>
              <Text style={styles.invoiceBalanceLabel}>Balance Due</Text>
              <Text style={styles.invoiceBalanceValue}>Rs. {balanceDue}</Text>
            </View>

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Pickup Date</Text>
              <Text style={styles.invoiceValue}>{pickupDate || 'Not selected'}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            style={({ pressed }) => [styles.saveButton, pressed && !isSaving && styles.saveButtonPressed]}
            onPress={handleGenerateOrder}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Generate Order / آرڈر مکمل کریں'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 20,
    flexGrow: 1,
    gap: 18,
  },
  headerCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
  },
  kicker: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
  },
  summaryRow: {
    gap: 4,
  },
  summaryLabel: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  billingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  billingCard: {
    flex: 1,
    minWidth: '48%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
    padding: 16,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  billingCardWide: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
    padding: 16,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  billingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  billingCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },
  billingCardUrdu: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: URDU_FONT,
  },
  cardInput: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.text,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    backgroundColor: '#FFFFFF',
  },
  billingHint: {
    color: 'rgba(22, 29, 38, 0.68)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  invoiceCard: {
    borderRadius: 24,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
    padding: 18,
    gap: 12,
  },
  invoiceHeading: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  invoiceRowHighlight: {
    borderRadius: 18,
    backgroundColor: '#F3FFF9',
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 14,
    gap: 4,
  },
  invoiceLabel: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 13,
    fontWeight: '800',
  },
  invoiceValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: 'rgba(22, 29, 38, 0.12)',
    marginVertical: 4,
  },
  invoiceBalanceLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  invoiceBalanceValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  input: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.text,
    paddingHorizontal: 18,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
  },
  saveButton: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: {
    opacity: 0.88,
  },
  saveButtonText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
  },
});