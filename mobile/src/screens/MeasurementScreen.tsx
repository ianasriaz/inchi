import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Platform, KeyboardAvoidingView, ActivityIndicator, Keyboard, Pressable, BackHandler } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TailorNumPad from '../components/TailorNumPad';
import BlinkingCursor from '../components/BlinkingCursor';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import AppText from '../components/AppText';


const MEASUREMENTS = [
  { id: 'length', label: 'Length / لمبائی', icon: 'arrow-down-outline' },
  { id: 'shoulder', label: 'Shoulder / تیرا', icon: 'git-commit-outline' },
  { id: 'sleeve', label: 'Sleeve / بازو', icon: 'hand-right-outline' },
  { id: 'chest', label: 'Chest / چھاتی', icon: 'shirt-outline' },
  { id: 'waist', label: 'Waist / کمر', icon: 'disc-outline' },
  { id: 'neck', label: 'Neck / گلا', icon: 'person-circle-outline' },
  { id: 'shalwar', label: 'Shalwar / شلوار', icon: 'arrow-down-circle-outline' },
  { id: 'paincha', label: 'Paincha / پانچا', icon: 'footsteps-outline' },
];

type CustomerData = {
  id: number;
  customer_number: number;
  name: string | null;
  phone: string | null;
};

export default function MeasurementScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const initialGarmentType = route.params?.initialGarmentType || 'Kameez Shalwar';

  const [garmentType, setGarmentType] = useState(initialGarmentType);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isNumPadVisible, setIsNumPadVisible] = useState(false);
  const [collar, setCollar] = useState('Ban');
  const [pockets, setPockets] = useState<string[]>(['آگے']);
  const [notes, setNotes] = useState('');

  // Customer Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const fieldLayouts = useRef<{ [key: string]: number }>({});
  const [gridY, setGridY] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (isNumPadVisible) {
        setIsNumPadVisible(false);
        setActiveField(null);
        return true; // prevent default back navigation
      }
      return false; // let default behavior happen
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isNumPadVisible]);

  useEffect(() => {
    if (activeField && isNumPadVisible) {
      const fieldY = fieldLayouts.current[activeField];
      if (fieldY !== undefined) {
        // Scroll to the active field. gridY is the section's top offset.
        // We subtract 60 to keep it nicely centered and not hugging the top.
        const targetY = Math.max(0, gridY + fieldY - 60);
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      }
    }
  }, [activeField, isNumPadVisible, gridY]);

  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let q = supabase
        .from('customers')
        .select('id, customer_number, name, phone')
        .eq('shop_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      q = q.or(`phone.eq.${query.trim()},customer_number.eq.${Number(query.trim())}`);

      const { data, error } = await q;
      if (error) throw error;
      setSearchResults((data ?? []) as CustomerData[]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchCustomers]);

  const handleSelectCustomer = async (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setSearchQuery('');
    setSearchResults([]);
    
    // Auto-fill old measurements
    try {
      const { data } = await supabase
        .from('orders')
        .select('measurements, garment_type, style_options')
        .eq('customer_id', customer.id)
        .eq('garment_type', garmentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (data) {
        if (data.measurements) setMeasurements(data.measurements);
        if (data.style_options) {
          if (data.style_options.collar) setCollar(data.style_options.collar);
          if (data.style_options.pockets) setPockets(data.style_options.pockets);
        }
      }
    } catch (e) {
      console.log('No previous order found for auto-fill');
    }
  };

  const handleKeyPress = (val: string) => {
    if (!activeField) return;
    
    if (activeField === 'search') {
      if (val === '⌫') {
        setSearchQuery(prev => prev.slice(0, -1));
      } else if (val === 'NEXT') {
        closeNumPad();
      } else if (/^[\d.½]$/.test(val)) {
        setSearchQuery(prev => prev + val);
      }
      return;
    }

    if (val === '⌫') {
      setMeasurements(prev => ({
        ...prev,
        [activeField]: (prev[activeField] || '').slice(0, -1)
      }));
    } else if (val === 'NEXT') {
      const idx = MEASUREMENTS.findIndex(f => f.id === activeField);
      if (idx < MEASUREMENTS.length - 1) {
        setActiveField(MEASUREMENTS[idx + 1].id);
      } else {
        closeNumPad();
      }
    } else if (/^[\d.½]$/.test(val)) {
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
    const requiredFilled = Object.values(measurements).filter(v => v).length;
    if (requiredFilled < 5) {
      Alert.alert('Incomplete', 'Please fill at least 5 measurements to continue.');
      return;
    }

    if (selectedCustomer) {
      navigation.navigate('Invoice', {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        garmentType,
        measurements,
        style: { collar, pockets },
        notes,
      });
    } else {
      navigation.navigate('NewCustomerPrompt', {
        garmentType,
        measurements,
        style: { collar, pockets },
        notes,
      });
    }
  };

  const openNumPad = (fieldId: string) => {
    Keyboard.dismiss();
    setActiveField(fieldId);
    setIsNumPadVisible(true);
  };

  const closeNumPad = () => {
    setActiveField(null);
    setIsNumPadVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scroll} 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top || 20 }]} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Measurement Form</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          {/* Smart Customer Search */}
          <View style={styles.searchSection}>
            {selectedCustomer ? (
              <View style={styles.selectedCustomerCard}>
                <View style={{flex: 1, gap: 0}}>
                  <Text style={styles.selectedCustomerLabel}>Selected Customer</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <AppText style={[styles.selectedCustomerName, { overflow: 'visible' }]} numberOfLines={1}>
                        {selectedCustomer.name || 'Unnamed'}
                      </AppText>
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 }}>
                      #{selectedCustomer.customer_number}
                    </Text>
                  </View>
                  <Text style={styles.selectedCustomerPhone}>{selectedCustomer.phone || 'No phone'}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedCustomer(null); setMeasurements({}); }} style={styles.clearCustomerBtn}>
                  <Ionicons name="close-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <Pressable 
                style={[styles.searchContainer, activeField === 'search' && { borderColor: colors.primary, borderWidth: 1 }]} 
                onPress={() => openNumPad('search')}
              >
                <Ionicons name="search" size={20} color={colors.textOpacity(0.4)} style={styles.searchIcon} />
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.searchInput, !searchQuery && { color: colors.textOpacity(0.4) }, { flex: 0 }]}>
                    {searchQuery}
                    {!searchQuery && activeField !== 'search' && " Search old customer to auto-fill..."}
                  </Text>
                  {activeField === 'search' && <BlinkingCursor />}
                </View>
                {isSearching && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 16 }} />}
              </Pressable>
            )}

            {!selectedCustomer && searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map(c => (
                  <TouchableOpacity key={c.id} style={styles.searchResultItem} onPress={() => handleSelectCustomer(c)}>
                    <View style={styles.searchResultAvatar}>
                      <Ionicons name="person" size={20} color={colors.text} />
                    </View>
                    <View style={{ flex: 1, gap: 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <AppText style={[styles.searchResultName, { overflow: 'visible' }]}>
                            {c.name || 'Unnamed'}
                          </AppText>
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 }}>
                          #{c.customer_number}
                        </Text>
                      </View>
                      <Text style={styles.searchResultPhone}>{c.phone || 'No phone'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Measurements Grid */}
          <View style={styles.section} onLayout={(e) => setGridY(e.nativeEvent.layout.y)}>
            <Text style={[styles.sectionTitle, { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 22, includeFontPadding: false, marginTop: -4 }]}>
              {garmentType === 'Kameez Shalwar' ? 'قمیض شلوار کی پیمائش درج کریں' : `${garmentType} Measurements`}
            </Text>
            <View style={styles.grid}>
              {MEASUREMENTS.map(field => {
                const isActive = activeField === field.id;
                const val = measurements[field.id] || '';
                return (
                  <TouchableOpacity
                    key={field.id}
                    style={[styles.measureInput, isActive ? styles.measureInputActive : null]}
                    onPress={() => openNumPad(field.id)}
                    onLayout={(e) => {
                      fieldLayouts.current[field.id] = e.nativeEvent.layout.y;
                    }}
                  >
                    <View style={styles.measureLabelRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={field.icon as any} size={16} color={isActive ? colors.primary : colors.textOpacity(0.4)} />
                        <Text style={[styles.measureLabelEng, isActive ? { color: colors.text } : null]}>{field.label.split(' / ')[0]}</Text>
                      </View>
                      <Text style={[styles.measureLabelUrdu, isActive ? { color: colors.primary } : null]}>{field.label.split(' / ')[1]}</Text>
                    </View>
                    <Text style={[styles.measureValue, !val ? styles.measureValueEmpty : null, isActive ? styles.measureValueActive : null]}>
                      {val || '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Style Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 22, includeFontPadding: false, marginTop: -4 }]}>اسٹائل</Text>
            <Text style={styles.styleLabel}>Collar Design</Text>
            <View style={styles.row}>
              {[
                { id: 'Ban', icon: 'remove-outline' },
                { id: 'Round', icon: 'ellipse-outline' }
              ].map(opt => {
                const isActive = collar === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.stylePill, isActive ? styles.stylePillActive : null]}
                    onPress={() => setCollar(opt.id)}
                  >
                    <Ionicons name={opt.icon as any} size={18} color={isActive ? colors.primary : colors.text} />
                    <Text style={[styles.stylePillText, isActive ? styles.stylePillTextActive : null]}>{opt.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.styleLabel}>Pockets</Text>
            <View style={styles.row}>
              {[
                { id: 'آگے', icon: 'square-outline' },
                { id: 'ایک سائیڈ', icon: 'document-outline' },
                { id: 'دونوں سائیڈ', icon: 'copy-outline' },
                { id: 'شلوار', icon: 'wallet-outline' }
              ].map(opt => {
                const isActive = pockets.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.stylePill, isActive ? styles.stylePillActive : null]}
                    onPress={() => togglePocket(opt.id)}
                  >
                    <Ionicons name={opt.icon as any} size={18} color={isActive ? colors.primary : colors.text} />
                    <Text style={[styles.stylePillText, isActive ? styles.stylePillTextActive : null, { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 18, marginTop: -4 }]}>{opt.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.section, { paddingBottom: 40 }]}>
            <Text style={[styles.sectionTitle, { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 22, includeFontPadding: false, marginTop: -4 }]}>مزید ہدایات</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Collar thora dheela rakhein..."
              placeholderTextColor={colors.textOpacity(0.3)}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
          </View>
        </ScrollView>

        {isNumPadVisible ? (
          <TailorNumPad 
            onKeyPress={handleKeyPress} 
            onClose={closeNumPad}
            activeFieldLabel={MEASUREMENTS.find(f => f.id === activeField)?.label.split(' / ')[0] || ''}
          />
        ) : !isKeyboardVisible ? (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.nextButton} onPress={handleConfirm}>
              <Text style={styles.nextButtonText}>Save</Text>
              <Ionicons name="save-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

  searchSection: { marginBottom: 24, zIndex: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, height: 56 },
  searchIcon: { marginLeft: 16, marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '500' },
  searchResults: { backgroundColor: colors.white, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 4 } }) },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchResultAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, borderColor: colors.text, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  searchResultName: { fontSize: 16, fontWeight: '800', color: colors.text, lineHeight: 20 },
  searchResultPhone: { fontSize: 13, color: colors.textOpacity(0.6), marginTop: 2, fontWeight: '600' },
  
  selectedCustomerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.primary },
  selectedCustomerLabel: { fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  selectedCustomerName: { fontSize: 18, fontWeight: '800', color: colors.text },
  selectedCustomerPhone: { fontSize: 14, color: colors.textOpacity(0.6), marginTop: 2 },
  clearCustomerBtn: { padding: 8 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  measureInput: { width: '31%', backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 6, borderWidth: 2, borderColor: 'transparent' },
  measureInputActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  measureLabelRow: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 8, gap: 4 },
  measureLabelEng: { fontSize: 11, fontWeight: '700', color: colors.textOpacity(0.4) },
  measureLabelUrdu: { fontFamily: 'NotoNastaliqUrdu', fontSize: 11, color: colors.textOpacity(0.4) },
  measureValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  measureValueEmpty: { color: colors.textOpacity(0.2) },
  measureValueActive: { color: colors.primary },

  styleLabel: { fontSize: 13, fontWeight: '700', color: colors.textOpacity(0.4), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  stylePill: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 6 },
  stylePillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  stylePillText: { fontSize: 15, fontWeight: '700', color: colors.text },
  stylePillTextActive: { color: colors.primary },

  notesInput: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, height: 100, fontSize: 15, color: colors.text },

  bottomBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  nextButton: { backgroundColor: colors.primary, flexDirection: 'row', height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextButtonText: { color: colors.text, fontSize: 17, fontWeight: '800' },
});