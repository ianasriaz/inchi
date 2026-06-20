import React, { useCallback, useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl, Linking, Pressable, Platform, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { containsUrdu } from '../utils/textUtils';

type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  customer_number: number;
};

const COLORS = {
  background: '#F7F8FA',
  text: '#161d26',
  accent: '#00e482',
};

const URDU_FONT = 'NotoNastaliqUrdu';

export default function CustomersScreen() {
  const navigation = useNavigation<any>();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCustomers = useCallback(async (query: string = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let q = supabase
      .from('customers')
      .select('*')
      .eq('shop_id', user.id)
      .order('created_at', { ascending: false });

    if (query.trim()) {
      const isNumeric = /^\d+$/.test(query.trim());
      if (isNumeric) {
        q = q.or(`phone.ilike.%${query.trim()}%,customer_number.eq.${Number(query.trim())}`);
      } else {
        q = q.ilike('name', `%${query.trim()}%`);
      }
    }

    const { data, error } = await q;

    if (error) {
      console.error('Failed to fetch customers:', error);
      return;
    }

    setCustomers(data || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCustomers(searchQuery);
    }, [fetchCustomers]),
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchCustomers]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCustomers(searchQuery);
    setIsRefreshing(false);
  }, [fetchCustomers, searchQuery]);

  const handleWhatsApp = async (phone: string | null) => {
    if (!phone) {
      Alert.alert('Error', 'No phone number provided for this customer.');
      return;
    }
    const digitsOnly = phone.replace(/\D/g, '');
    let formattedPhone = digitsOnly;
    if (formattedPhone.startsWith('0')) formattedPhone = '92' + formattedPhone.slice(1);
    
    const url = `whatsapp://send?phone=${formattedPhone}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp is not installed.'));
  };

  const handleCustomerPress = (item: CustomerRow) => {
    navigation.navigate('CustomerProfile', { customerId: item.id });
  };

  const renderCustomerCard = ({ item }: { item: CustomerRow }) => {
    const createdDate = new Date(item.created_at).toLocaleDateString();

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleCustomerPress(item)} activeOpacity={0.7}>
        <View style={styles.cardRowTop}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#161D26" />
          </View>
          <View style={styles.textBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text 
                style={[
                  styles.customerName, 
                  containsUrdu(item.name) && { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 22, lineHeight: 45, paddingVertical: 10, overflow: 'visible' }
                ]}
              >
                {item.name}
              </Text>
              <Text style={styles.customerId}>#{item.customer_number}</Text>
            </View>
            <Text style={styles.customerMeta}>Added: {createdDate}</Text>
          </View>
        </View>

        <View style={styles.contactRow}>
          <View style={styles.contactInfo}>
            <Ionicons name="call-outline" size={16} color="rgba(22, 29, 38, 0.5)" />
            <Text style={styles.customerPhone}>{item.phone || 'No phone'}</Text>
          </View>
          <Pressable style={styles.whatsappButtonSmall} onPress={() => handleWhatsApp(item.phone)}>
            <Ionicons name="logo-whatsapp" size={18} color="#00C870" />
            <Text style={styles.whatsappButtonTextSmall}>Message</Text>
          </Pressable>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
      <View style={styles.screen}>
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCustomerCard}
          contentContainerStyle={[styles.container, { paddingTop: 20, paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.accent]} tintColor={COLORS.accent} />}
          ListHeaderComponent={
            <View style={styles.content}>
              <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Customers</Text>
              </View>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="rgba(22, 29, 38, 0.5)" />
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.searchInput,
                      containsUrdu(searchQuery) && { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 18, includeFontPadding: false }
                    ]}
                    placeholder="Search name, phone, or #..."
                    placeholderTextColor="rgba(22, 29, 38, 0.4)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                  />
                </View>
                {searchQuery.length > 0 ? (
                  <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color="rgba(22, 29, 38, 0.3)" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyStateTitle}>No customers yet</Text>
              <Text style={styles.emptyStateSubtitle}>Customers will appear here once you create bookings.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FA' },
  screen: { flex: 1, backgroundColor: '#F7F8FA' },
  container: { backgroundColor: '#F7F8FA', paddingHorizontal: 16, flexGrow: 1, gap: 12 },
  content: { gap: 18, marginBottom: 6 },
  headerContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  headerTitle: { color: COLORS.text, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.05)',
  },
  inputContainer: { flex: 1, height: '100%', justifyContent: 'center' },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    paddingVertical: 0,
  },

  emptyBlock: { borderRadius: 24, padding: 24, backgroundColor: '#FFFFFF', alignItems: 'center', marginTop: 24 },
  emptyStateTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyStateSubtitle: { color: 'rgba(22, 29, 38, 0.72)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  separator: { height: 12 },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardRowTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.accent, borderColor: '#161D26', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  textBlock: { flex: 1, gap: 2 },
  customerName: { color: COLORS.text, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  customerId: { color: COLORS.accent, fontSize: 14, fontWeight: '900' },
  customerMeta: { color: 'rgba(22, 29, 38, 0.5)', fontSize: 13, marginTop: 2 },
  
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 10 },
  contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerPhone: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  whatsappButtonSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8FDF3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  whatsappButtonTextSmall: { color: '#00C870', fontSize: 13, fontWeight: '800' },
});
