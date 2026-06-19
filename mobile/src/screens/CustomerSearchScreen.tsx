import React, { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerSearch'>;

const COLORS = {
  background: '#FFFFFF',
  text: '#161d26',
  accent: '#00e482',
};

const URDU_FONT = 'JameelNooriNastaleeqKasheeda';

export default function CustomerSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'regular' | 'new'>('regular');
  const [customerNumber, setCustomerNumber] = useState('');
  const [newCustomerNumber, setNewCustomerNumber] = useState(1);
  const [recentCustomers, setRecentCustomers] = useState<
    Array<{ id: number; customer_number: number; name: string | null; phone: string | null }>
  >([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);

  const parsedCustomerNumber = Number.parseInt(customerNumber.trim(), 10);

  const fetchRecentCustomers = useCallback(async () => {
    setIsCustomersLoading(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_number, name, phone')
        .order('customer_number', { ascending: false })
        .limit(12);

      if (error) {
        throw error;
      }

      setRecentCustomers((data ?? []) as Array<{
        id: number;
        customer_number: number;
        name: string | null;
        phone: string | null;
      }>);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setIsCustomersLoading(false);
    }
  }, []);

  const fetchNewCustomerNumber = useCallback(async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('customer_number')
      .order('customer_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to fetch next customer number:', error);
      return;
    }

    const highestCustomerNumber = data?.[0]?.customer_number ?? 0;
    setNewCustomerNumber((highestCustomerNumber ?? 0) + 1);
  }, []);

  useEffect(() => {
    if (activeTab === 'regular') {
      fetchRecentCustomers();
    }

    if (activeTab === 'new') {
      fetchNewCustomerNumber();
    }
  }, [activeTab, fetchNewCustomerNumber, fetchRecentCustomers]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'regular') {
        fetchRecentCustomers();
      }

      if (activeTab === 'new') {
        fetchNewCustomerNumber();
      }
    }, [activeTab, fetchNewCustomerNumber, fetchRecentCustomers]),
  );

  const handleQuickSelectCustomer = (customerId: number, customerNumberValue: number) => {
    navigation.navigate('Measurement', { customerId, customerNumber: customerNumberValue });
  };

  const handleRegularSearch = async () => {
    if (!customerNumber.trim() || Number.isNaN(parsedCustomerNumber)) {
      Alert.alert('Enter Customer Number', 'Please enter a valid customer number to continue.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('customer_number', parsedCustomerNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          Alert.alert('Customer not found', 'Customer not found');
          return;
        }

        throw error;
      }

      navigation.navigate('Measurement', { customerId: data.id, customerNumber: parsedCustomerNumber });
    } catch (error) {
      console.error('Customer search failed:', error);
      Alert.alert('Search Failed', error instanceof Error ? error.message : 'Unable to search for the customer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!name.trim()) {
      Alert.alert('Customer Name Required', 'Please enter the customer name to continue.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          customer_number: newCustomerNumber,
          name: name.trim(),
          phone: phone.trim() || null,
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      navigation.navigate('Measurement', { customerId: data.id, customerNumber: newCustomerNumber });
    } catch (error) {
      console.error('Customer create failed:', error);
      Alert.alert('Create Failed', error instanceof Error ? error.message : 'Unable to create customer.');
    } finally {
      setIsLoading(false);
    }
  };

  const isRegularTab = activeTab === 'regular';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toggleBar}>
          <Pressable
            accessibilityRole="button"
            style={[styles.toggleButton, isRegularTab && styles.toggleButtonActive]}
            onPress={() => setActiveTab('regular')}
          >
            <Text style={styles.toggleButtonText}>Regular Customer</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={[styles.toggleButton, !isRegularTab && styles.toggleButtonActive]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={styles.toggleButtonText}>New Customer</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {isRegularTab ? (
            <View style={styles.regularBlock}>
              <View style={styles.quickPickHeader}>
                <Text style={styles.quickPickTitle}>Quick Select Customers</Text>
                <Text style={styles.quickPickSubtitle}>Tap a customer below or search by number.</Text>
              </View>

              <View style={styles.quickPickBlock}>
                {isCustomersLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={COLORS.text} />
                    <Text style={styles.loadingText}>Loading customers...</Text>
                  </View>
                ) : null}

                {!isCustomersLoading && recentCustomers.length === 0 ? (
                  <Text style={styles.emptyListText}>No saved customers yet.</Text>
                ) : null}

                <View style={styles.quickPickList}>
                  {recentCustomers.map((customer) => (
                    <Pressable
                      key={customer.id}
                      style={styles.quickPickCard}
                      onPress={() => handleQuickSelectCustomer(customer.id, customer.customer_number)}
                    >
                      <View style={styles.quickPickCardTop}>
                        <Text style={styles.quickPickName}>{customer.name ?? 'Unnamed Customer'}</Text>
                        <View style={styles.quickPickBadge}>
                          <Text style={styles.quickPickBadgeText}>#{customer.customer_number}</Text>
                        </View>
                      </View>
                      <Text style={styles.quickPickMeta}>{customer.phone ?? 'No phone'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Customer Number</Text>
                <TextInput
                  value={customerNumber}
                  onChangeText={setCustomerNumber}
                  placeholder="Customer Number"
                  placeholderTextColor="rgba(22, 29, 38, 0.35)"
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            </View>
          ) : (
            <View style={styles.newCustomerBlock}>
              <Text style={styles.autoIdText}>
                New Customer ID: <Text style={styles.autoIdValue}>{newCustomerNumber}</Text>
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Name / <Text style={styles.urduInline}>نام</Text>
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  placeholderTextColor="rgba(22, 29, 38, 0.35)"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Phone / <Text style={styles.urduInline}>فون</Text>
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone"
                  placeholderTextColor="rgba(22, 29, 38, 0.35)"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          style={({ pressed }) => [styles.primaryButton, pressed && !isLoading && styles.primaryButtonPressed]}
          onPress={isRegularTab ? handleRegularSearch : handleCreateCustomer}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.primaryButtonText}>{isRegularTab ? 'Search & Continue' : 'Create & Continue'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 24,
  },
  toggleBar: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.text,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  toggleButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  content: {
    gap: 18,
  },
  regularBlock: {
    gap: 18,
  },
  quickPickHeader: {
    gap: 4,
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
  newCustomerBlock: {
    gap: 16,
  },
  quickPickBlock: {
    gap: 12,
  },
  quickPickTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  quickPickSubtitle: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: 'rgba(22, 29, 38, 0.75)',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyListText: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 14,
    fontWeight: '600',
  },
  quickPickList: {
    gap: 10,
  },
  quickPickCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 6,
  },
  quickPickCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickPickName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  quickPickBadge: {
    borderRadius: 999,
    backgroundColor: '#F3FFF9',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quickPickBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  quickPickMeta: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  autoIdText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  autoIdValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
  },
  urduInline: {
    fontFamily: URDU_FONT,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
});