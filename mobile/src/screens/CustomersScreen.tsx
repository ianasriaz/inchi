import React, { useCallback, useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl, Linking, Pressable, Platform, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { containsUrdu } from '../utils/textUtils';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import AppText from '../components/AppText';
import TailorNumPad from '../components/TailorNumPad';
import BlinkingCursor from '../components/BlinkingCursor';
import { colors } from '../theme/colors';


type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  customer_number: number;
};

const COLORS = {
  background: colors.surface,
  text: colors.text,
  accent: colors.primary,
};

const URDU_FONT = 'NotoNastaliqUrdu';

export default function CustomersScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNumPad, setShowNumPad] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: customers = [], isLoading: isInitialLoading, isRefetching: isRefreshing } = useQuery({
    queryKey: ['customers', user?.id, searchQuery],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('customers')
        .select('*')
        .eq('shop_id', user!.id)
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        q = q.or(`phone.eq.${searchQuery.trim()},customer_number.eq.${Number(searchQuery.trim())}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as CustomerRow[]) ?? [];
    },
  });

  const handleKeyPress = (key: string) => {
    if (key === '⌫') {
      setSearchQuery(prev => prev.slice(0, -1));
    } else if (key === 'NEXT') {
      setShowNumPad(false);
    } else if (/^[\d.½]$/.test(key)) {
      setSearchQuery(prev => prev + key);
    }
  };

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
  }, [queryClient]);

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
            <Ionicons name="person" size={24} color={colors.text} />
          </View>
          <View style={styles.textBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <AppText style={[styles.customerName, { overflow: 'visible', paddingVertical: 4 }]}>
                  {item.name}
                </AppText>
              </View>
              <Text style={styles.customerId}>#{item.customer_number}</Text>
            </View>
            <Text style={styles.customerMeta}>Customer Since: {createdDate}</Text>
          </View>
        </View>

        <View style={styles.contactRow}>
          <View style={styles.contactInfo}>
            <Ionicons name="call-outline" size={16} color={colors.textOpacity(0.5)} />
            <Text style={styles.customerPhone}>{item.phone || 'No phone'}</Text>
          </View>
          <Pressable style={styles.contactInfo} onPress={() => handleWhatsApp(item.phone)}>
            <Ionicons name="logo-whatsapp" size={16} color={colors.textOpacity(0.5)} />
            <Text style={styles.customerPhone}>WhatsApp</Text>
          </Pressable>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isInitialLoading) {
      return (
        <View style={{ gap: 12, marginTop: 24 }}>
          <Skeleton style={{ height: 100, borderRadius: 24 }} />
          <Skeleton style={{ height: 100, borderRadius: 24 }} />
          <Skeleton style={{ height: 100, borderRadius: 24 }} />
        </View>
      );
    }
    return (
      <EmptyState
        icon="people-outline"
        title="No customers found"
        subtitle={searchQuery ? "Try adjusting your search." : "Start booking orders to build your customer list!"}
      />
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
                  <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color={colors.textOpacity(0.3)} />
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
        {showNumPad && (
          <TailorNumPad 
            onKeyPress={handleKeyPress}
            onClose={() => setShowNumPad(false)}
            hideBottomInset={true}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  container: { backgroundColor: colors.surface, paddingHorizontal: 16, flexGrow: 1, gap: 12 },
  content: { gap: 18, marginBottom: 6 },
  headerContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  headerTitle: { color: COLORS.text, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.05)',
  },
  inputContainer: { flex: 1, height: '100%', justifyContent: 'center' },
  searchInput: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },

  emptyBlock: { borderRadius: 24, padding: 24, backgroundColor: colors.white, alignItems: 'center', marginTop: 24 },
  emptyStateTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyStateSubtitle: { color: 'rgba(22, 29, 38, 0.72)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  separator: { height: 12 },
  card: { 
    backgroundColor: colors.white, 
    borderRadius: 20, 
    padding: 16, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardRowTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.accent, borderColor: colors.text, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  textBlock: { flex: 1, gap: 2 },
  customerName: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  customerId: { color: COLORS.accent, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  customerMeta: { color: colors.textOpacity(0.5), fontSize: 13, marginTop: 2 },
  
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 12, padding: 10 },
  contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerPhone: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  whatsappButtonSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  whatsappButtonTextSmall: { color: colors.text, fontSize: 13, fontWeight: '800' },
});
