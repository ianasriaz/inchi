import React, { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { containsUrdu } from '../utils/textUtils';
import type { RootStackParamList } from '../../App';
import { colors } from '../theme/colors';
import AppText from '../components/AppText';
import TailorNumPad from '../components/TailorNumPad';
import BlinkingCursor from '../components/BlinkingCursor';


type Props = NativeStackScreenProps<RootStackParamList, 'CustomerSearch'>;

const COLORS = {
  background: colors.white,
  text: colors.text,
  accent: colors.primary,
};

type CustomerData = {
  id: number;
  customer_number: number;
  name: string | null;
  phone: string | null;
};

export default function CustomerSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  
  // View State: 'initial' | 'search' | 'create'
  const [viewState, setViewState] = useState<'initial' | 'search' | 'create'>('initial');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showNumPad, setShowNumPad] = useState(false);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);

  const handleSearchKeyPress = (key: string) => {
    if (key === '⌫') {
      setSearchQuery(prev => prev.slice(0, -1));
    } else if (key === 'NEXT') {
      setShowNumPad(false);
    } else if (/^[\d.½]$/.test(key)) {
      setSearchQuery(prev => prev + key);
    }
  };
  
  // Create State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newCustomerNumber, setNewCustomerNumber] = useState<number>(1);

  const searchCustomers = useCallback(async (query: string) => {
    setIsCustomersLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let q = supabase
        .from('customers')
        .select('id, customer_number, name, phone')
        .eq('shop_id', user.id)
        .order('created_at', { ascending: false });

      if (query.trim()) {
        q = q.or(`phone.eq.${query.trim()},customer_number.eq.${Number(query.trim())}`);
      } else {
        q = q.limit(20); // only show recent 20 if no query
      }

      const { data, error } = await q;
      if (error) throw error;
      setCustomers((data ?? []) as CustomerData[]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsCustomersLoading(false);
    }
  }, []);

  const fetchNewCustomerNumber = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('customers')
      .select('customer_number')
      .eq('shop_id', user.id)
      .order('customer_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to fetch next customer number:', error);
      return;
    }
    const highestCustomerNumber = data?.[0]?.customer_number ?? 0;
    setNewCustomerNumber(highestCustomerNumber + 1);
  }, []);

  useEffect(() => {
    if (viewState === 'search') {
      const timeout = setTimeout(() => {
        searchCustomers(searchQuery);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [searchQuery, viewState, searchCustomers]);

  useFocusEffect(
    useCallback(() => {
      if (viewState === 'search') {
        if (!searchQuery) searchCustomers('');
      } else if (viewState === 'create') {
        fetchNewCustomerNumber();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewState, searchCustomers, fetchNewCustomerNumber])
  );

  const fetchAndNavigate = async (customerId: number, customerNumberValue: number, customerName: string | null, customerPhone: string | null) => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('measurements, garment_type, style_options')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      navigation.navigate('Measurement', { 
        customerId, 
        customerNumber: customerNumberValue,
        customerName: customerName || 'Unknown Customer',
        customerPhone: customerPhone || '',
        initialMeasurements: data?.measurements || {},
        initialGarmentType: data?.garment_type || 'Kameez Shalwar',
        initialStyle: data?.style_options || null
      });
    } catch (e) {
      navigation.navigate('Measurement', { 
        customerId, 
        customerNumber: customerNumberValue,
        customerName: customerName || 'Unknown Customer',
        customerPhone: customerPhone || ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter the customer name.');
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

      navigation.navigate('Measurement', { 
        customerId: data.id, 
        customerNumber: data.customer_number,
        customerName: data.name || 'Unknown Customer',
        customerPhone: data.phone || ''
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
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable onPress={() => {
                if (viewState === 'initial') navigation.goBack();
                else setViewState('initial');
              }}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </Pressable>
              <Text style={styles.headerTitle}>
                {viewState === 'initial' ? 'New Booking' : viewState === 'search' ? 'Select Customer' : 'New Customer'}
              </Text>
            </View>
          </View>

          {viewState === 'initial' ? (
            <View style={styles.initialStateContainer}>
              <Text style={styles.promptText}>Who is this booking for?</Text>
              
              <View style={styles.binaryCardsContainer}>
                <TouchableOpacity 
                  style={[styles.bigChoiceCard, { borderColor: COLORS.accent, backgroundColor: colors.primaryLight }]} 
                  onPress={() => setViewState('create')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="person-add" size={40} color={colors.text} />
                  </View>
                  <Text style={styles.bigChoiceTitle}>New Customer</Text>
                  <Text style={styles.bigChoiceUrdu}>نیا گاہک</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.bigChoiceCard, { borderColor: 'transparent', backgroundColor: colors.surface }]} 
                  onPress={() => setViewState('search')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#E0E0E0' }]}>
                    <Ionicons name="search" size={40} color={colors.text} />
                  </View>
                  <Text style={styles.bigChoiceTitle}>Existing Customer</Text>
                  <Text style={styles.bigChoiceUrdu}>پرانا گاہک</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : viewState === 'search' ? (
            <View style={styles.viewContent}>
              <View style={[styles.searchBar, showNumPad && { borderColor: colors.primary, borderWidth: 1 }]}>
                <Ionicons name="search" size={20} color={colors.textOpacity(0.5)} />
                <Pressable 
                  style={[styles.inputContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }]}
                  onPress={() => setShowNumPad(true)}
                >
                  <Text style={[styles.searchInput, !searchQuery && { color: colors.textOpacity(0.4) }]}>
                    {searchQuery}
                    {!searchQuery && !showNumPad && " Search phone or ID..."}
                  </Text>
                  {showNumPad && <BlinkingCursor />}
                </Pressable>
                {searchQuery.length > 0 ? (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textOpacity(0.3)} />
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.sectionTitle}>
                {searchQuery.trim() ? 'Search Results' : 'Recent Customers'}
              </Text>

              {isCustomersLoading ? (
                <ActivityIndicator color={COLORS.accent} style={{ marginTop: 20 }} />
              ) : customers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={colors.textOpacity(0.1)} />
                  <Text style={styles.emptyStateText}>No customers found.</Text>
                </View>
              ) : (
                <View style={styles.customerList}>
                  {customers.map((item) => (
                    <Pressable 
                      key={item.id} 
                      style={styles.customerCard}
                      onPress={() => fetchAndNavigate(item.id, item.customer_number, item.name, item.phone)}
                    >
                      <View style={styles.avatar}>
                        <Ionicons name="person" size={24} color={colors.text} />
                      </View>
                      <View style={styles.customerInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <AppText style={[styles.customerName, { overflow: 'visible', paddingVertical: 4 }]}>
                              {item.name || 'Unnamed'}
                            </AppText>
                          </View>
                          <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.accent, letterSpacing: -0.5 }}>
                            #{item.customer_number}
                          </Text>
                        </View>
                        <Text style={styles.customerPhone}>{item.phone || 'No phone'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textOpacity(0.2)} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.viewContent}>
              <View style={styles.autoIdBanner}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="pricetag" size={24} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textOpacity(0.6), marginBottom: 2 }}>
                    Customer Number
                  </Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.accent, letterSpacing: -1 }}>
                    #{newCustomerNumber}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Name - <Text style={{ fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 16 }}>نام</Text>
                </Text>
                <View style={styles.formInputContainer}>
                  <TextInput
                    style={[
                      styles.inputField,
                      containsUrdu(name) && { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 20, includeFontPadding: false }
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
                <View style={styles.formInputContainer}>
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
          )}
          
          <View style={{ height: 100 }} />
        </ScrollView>

        {viewState === 'create' && (
          <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
            <Pressable 
              style={[styles.primaryButton, isLoading ? { opacity: 0.7 } : null]} 
              onPress={handleCreateCustomer}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <>
                  <Text style={[styles.primaryButtonText, { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 20, includeFontPadding: false, textAlignVertical: 'center', marginTop: Platform.OS === 'ios' ? 6 : 0 }]}>پیمائش لیں</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.text} style={{ marginLeft: 8 }} />
                </>
              )}
            </Pressable>
          </View>
        )}
        
        {viewState === 'search' && showNumPad && (
          <TailorNumPad 
            onKeyPress={handleSearchKeyPress}
            onClose={() => setShowNumPad(false)}
            hideBottomInset={true}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20 },
  
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  // Initial State Styles
  initialStateContainer: { flex: 1, paddingTop: 12 },
  promptText: { fontSize: 18, fontWeight: '700', color: colors.textOpacity(0.6), marginBottom: 24, textAlign: 'center' },
  binaryCardsContainer: { gap: 16 },
  bigChoiceCard: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40, 
    borderRadius: 32, 
    borderWidth: 2,
  },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bigChoiceTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 4 },
  bigChoiceUrdu: { fontFamily: 'NotoNastaliqUrdu', fontSize: 20, color: colors.textOpacity(0.6), lineHeight: 36, paddingTop: 4 },

  viewContent: { flex: 1, gap: 20 },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainer: { flex: 1, height: '100%', justifyContent: 'center' },
  searchInput: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },

  sectionTitle: {
    color: colors.textOpacity(0.5),
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { color: colors.textOpacity(0.4), fontSize: 15, fontWeight: '600' },

  // Customer List
  customerList: { gap: 12 },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent, borderColor: colors.text, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  customerInfo: { flex: 1, gap: 2 },
  customerName: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  customerPhone: { color: colors.textOpacity(0.5), fontSize: 13, fontWeight: '600' },

  // Create Form
  autoIdBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 20, gap: 16, borderWidth: 2, borderColor: colors.border },
  formGroup: { gap: 8 },
  label: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginLeft: 4 },
  formInputContainer: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  inputField: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '600', paddingVertical: 0 },

  // Footer Actions
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'transparent' },
  primaryButton: {
    flexDirection: 'row', width: '100%', borderRadius: 24, backgroundColor: COLORS.accent, height: 60, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }, android: { elevation: 6 } }),
  },
  primaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
});