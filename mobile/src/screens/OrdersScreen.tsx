import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View, RefreshControl, TextInput, Alert, Platform, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { containsUrdu } from '../utils/textUtils';
import Toast from 'react-native-toast-message';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateCustomerHtml } from '../utils/invoiceGenerator';
import { colors } from '../theme/colors';


type OrderRow = {
  id: string;
  garment_type: string;
  balance_amount: number | null;
  status: string | null;
  created_at: string;
  order_number: number;
  total_amount?: number | null;
  advance_amount?: number | null;
  customers: {
    name: string | null;
    phone: string | null;
  } | null;
  measurements: any;
  style_options: any;
};

const COLORS = {
  background: colors.surface,
  text: colors.text,
  accent: colors.primary,
};

const URDU_FONT = 'NotoNastaliqUrdu';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<'stitching' | 'ready' | 'delivered'>('stitching');

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (activeFilter === 'stitching') result = result.filter(o => o.status === 'pending');
    else if (activeFilter === 'ready') result = result.filter(o => o.status === 'ready');
    else if (activeFilter === 'delivered') result = result.filter(o => o.status === 'delivered');

    if (!searchQuery) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(order => {
      const orderNum = order.order_number?.toString() || '';
      const customerName = order.customers?.name?.toLowerCase() || '';
      return orderNum.includes(lowerQuery) || customerName.includes(lowerQuery);
    });
  }, [orders, searchQuery, activeFilter]);

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('shop_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch orders:', error);
      setIsInitialLoading(false);
      return;
    }

    setOrders((data as OrderRow[]) ?? []);
    setIsInitialLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  }, [fetchOrders]);

  const formatPhoneForWhatsApp = (phone: string | null | undefined) => {
    if (!phone) return '';
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.startsWith('0092')) return digitsOnly.slice(2);
    if (digitsOnly.startsWith('92')) return digitsOnly;
    if (digitsOnly.startsWith('0')) return `92${digitsOnly.slice(1)}`;
    return `92${digitsOnly}`;
  };

  const handleWhatsAppPickup = async (order: OrderRow) => {
    const formattedPhone = formatPhoneForWhatsApp(order.customers?.phone);
    if (!formattedPhone) return;
    const message = `Assalam-o-Alaikum! Your ${order.garment_type} is ready to pickup. Balance due: Rs. ${order.balance_amount ?? 0}.`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
    }
  };

  const handleShareInvoice = async (order: OrderRow) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shopData } = await supabase.from('shops').select('name, phone, address, logo_url').eq('id', user.id).single();
      const bookingDate = new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
      const pickupDate = order.style_options?.pickupDate || 'Not specified';
      const html = generateCustomerHtml(
        shopData,
        order.order_number,
        order.customers?.name || 'Unknown Customer',
        order.customers?.phone || '',
        bookingDate,
        pickupDate,
        order.garment_type,
        order.measurements || {},
        order.style_options || {},
        order.style_options?.notes || '',
        order.total_amount || 0,
        order.advance_amount || 0,
        order.balance_amount || 0
      );
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate invoice.');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', orderId);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'ready' } : o));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeliverOrder = (order: OrderRow) => {
    Alert.alert(
      'Confirm Pickup',
      `Collect Balance: Rs. ${order.balance_amount ?? 0}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deliver', 
          style: 'default',
          onPress: async () => {
            const { error } = await supabase
              .from('orders')
              .update({ 
                status: 'delivered', 
                advance_amount: order.total_amount 
              })
              .eq('id', order.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'delivered', balance_amount: 0, advance_amount: order.total_amount } : o));
              Toast.show({
                type: 'success',
                text1: 'Order Delivered',
                text2: 'Balance collected successfully.',
              });
            }
          }
        }
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: OrderRow }) => {
    const customerName = item.customers?.name ?? 'Unknown Customer';
    const createdDate = new Date(item.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
    const pickupDate = item.style_options?.pickupDate || 'Not specified';

    const isReady = item.status === 'ready';
    const isDelivered = item.status === 'delivered';

    return (
      <Pressable style={styles.orderCard} onPress={() => setSelectedOrder(item)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.accent, letterSpacing: -1, marginBottom: 4 }}>
              #{item.order_number}
            </Text>
            <Text 
              style={[
                styles.orderCustomerName,
                { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
                containsUrdu(customerName) && { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 20, lineHeight: 45, paddingVertical: 10, overflow: 'visible', marginBottom: 0 }
              ]}
            >
              {customerName}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textOpacity(0.5), fontWeight: '700' }}>
              {item.garment_type}
            </Text>
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textOpacity(0.5), fontWeight: '600' }}>
                Booked: {createdDate}
              </Text>
              <View style={styles.dateDot} />
              <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '800' }}>
                Due: {pickupDate}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusPill, isDelivered ? styles.statusDelivered : isReady ? styles.statusReady : styles.statusPending]}>
            <Ionicons name={isDelivered ? "checkmark-done" : isReady ? "checkmark-circle" : "cut"} size={14} color={isDelivered ? colors.textOpacity(0.4) : isReady ? '#00C870' : colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.statusPillText, isDelivered ? styles.statusDeliveredText : isReady ? styles.statusReadyText : styles.statusPendingText]}>
              {isDelivered ? 'وصول کر لیے' : isReady ? 'سلائی مکمل ہے' : 'سلائی جاری ہے'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: colors.textOpacity(0.5), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Balance Due</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>Rs. {item.balance_amount ?? 0}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable style={styles.actionBtnSecondary} onPress={() => handleWhatsAppPickup(item)}>
            <Ionicons name="logo-whatsapp" size={24} color="#00C870" />
          </Pressable>

          <Pressable style={styles.actionBtnSecondary} onPress={() => handleShareInvoice(item)}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.text} />
          </Pressable>
          
          {!isReady && !isDelivered ? (
            <Pressable style={[styles.actionBtnPrimary, { flex: 1, justifyContent: 'center' }]} onPress={() => handleMarkReady(item.id)}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
              <Text style={[styles.actionBtnPrimaryText, { fontSize: 12, marginLeft: 8, fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', includeFontPadding: false, lineHeight: 28, marginTop: Platform.OS === 'ios' ? -4 : -6 }]}>سلائی مکمل</Text>
            </Pressable>
          ) : isReady && !isDelivered ? (
            <Pressable style={[styles.actionBtnPrimary, { flex: 1, backgroundColor: colors.primary, justifyContent: 'center' }]} onPress={() => handleDeliverOrder(item)}>
              <Ionicons name="bag-check-outline" size={20} color={colors.text} />
              <Text style={[styles.actionBtnPrimaryText, { fontSize: 12, marginLeft: 8, color: colors.text, fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', includeFontPadding: false, lineHeight: 28, marginTop: Platform.OS === 'ios' ? -4 : -6 }]}>وصول کر لیا گیا</Text>
            </Pressable>
          ) : (
            <View style={[styles.actionBtnPrimary, { flex: 1, backgroundColor: colors.border, justifyContent: 'center' }]}>
              <Ionicons name="checkmark-done" size={20} color={colors.textOpacity(0.4)} />
              <Text style={[styles.actionBtnPrimaryText, { color: colors.textOpacity(0.4), marginLeft: 6 }]}>Delivered</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedOrder) return null;
    
    const measurements = selectedOrder.measurements || {};
    const style = selectedOrder.style_options || {};

    return (
      <Modal visible={!!selectedOrder} transparent={true} animationType="fade" onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order #{selectedOrder.order_number}</Text>
                <Text style={styles.modalSubtitle}>{selectedOrder.customers?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Measurements</Text>
                <View style={styles.measureGrid}>
                  {Object.entries(measurements).map(([key, val]) => (
                    <View key={key} style={styles.measureItem}>
                      <Text style={styles.measureKey}>{key}</Text>
                      <Text style={styles.measureVal}>{String(val)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Style & Options</Text>
                <View style={styles.styleGrid}>
                  <View style={styles.styleItem}>
                    <Text style={styles.measureKey}>Collar</Text>
                    <Text style={styles.measureVal}>{style.collar || 'N/A'}</Text>
                  </View>
                  <View style={styles.styleItem}>
                    <Text style={styles.measureKey}>Pockets</Text>
                    <Text style={styles.measureVal}>{(style.pockets || []).join(', ') || 'N/A'}</Text>
                  </View>
                </View>
                {style.notes ? (
                  <View style={styles.notesBlock}>
                    <Text style={styles.measureKey}>Notes</Text>
                    <Text style={styles.notesVal}>{style.notes}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => {
    if (isInitialLoading) {
      return (
        <View style={{ gap: 16, marginTop: 24, paddingHorizontal: 4 }}>
          <Skeleton style={{ height: 180, borderRadius: 24 }} />
          <Skeleton style={{ height: 180, borderRadius: 24 }} />
          <Skeleton style={{ height: 180, borderRadius: 24 }} />
        </View>
      );
    }
    
    let title = "No Orders";
    let subtitle = "You don't have any orders here right now.";
    if (activeFilter === 'stitching') {
      title = "No Active Orders";
      subtitle = "All caught up! Time to take some new bookings.";
    } else if (activeFilter === 'ready') {
      title = "No Ready Orders";
      subtitle = "No completed orders waiting for pickup.";
    } else if (activeFilter === 'delivered') {
      title = "No Deliveries";
      subtitle = "You haven't delivered any orders yet.";
    }

    return (
      <EmptyState
        icon="shirt-outline"
        title={title}
        subtitle={searchQuery ? "Try adjusting your search terms." : subtitle}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
      <View style={styles.screen}>
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={[styles.container, { paddingTop: 20, paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.accent]} tintColor={COLORS.accent} />}
          ListHeaderComponent={
            <View style={styles.content}>
              <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Bookings</Text>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Order # or Customer Name..."
                placeholderTextColor={colors.textOpacity(0.5)}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
                <Pressable style={[styles.filterChip, activeFilter === 'stitching' && styles.filterChipActive]} onPress={() => setActiveFilter('stitching')}>
                  <Text style={[styles.filterChipText, activeFilter === 'stitching' && styles.filterChipTextActive]} numberOfLines={1} adjustsFontSizeToFit>سلائی جاری ہے</Text>
                </Pressable>
                <Pressable style={[styles.filterChip, activeFilter === 'ready' && styles.filterChipActive]} onPress={() => setActiveFilter('ready')}>
                  <Text style={[styles.filterChipText, activeFilter === 'ready' && styles.filterChipTextActive]} numberOfLines={1} adjustsFontSizeToFit>سلائی مکمل ہے</Text>
                </Pressable>
                <Pressable style={[styles.filterChip, activeFilter === 'delivered' && styles.filterChipActive]} onPress={() => setActiveFilter('delivered')}>
                  <Text style={[styles.filterChipText, activeFilter === 'delivered' && styles.filterChipTextActive]} numberOfLines={1} adjustsFontSizeToFit>وصول کر لیے</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={renderEmptyState}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
        {renderDetailsModal()}
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
  headerSubtitle: { fontFamily: URDU_FONT, color: colors.textOpacity(0.5), fontSize: 22, fontWeight: '400', lineHeight: 34, paddingTop: 6 },
  searchInput: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: colors.border },
  emptyOrdersBlock: { borderRadius: 24, padding: 24, backgroundColor: colors.white, alignItems: 'center' },
  emptyStateTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyStateSubtitle: { color: 'rgba(22, 29, 38, 0.72)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  separator: { height: 12 },
  orderCard: { 
    backgroundColor: colors.white, 
    borderRadius: 20, 
    padding: 16, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  orderRowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  orderTextBlock: { flex: 1, paddingRight: 12 },
  orderCustomerName: { color: COLORS.text, fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 4 },
  orderMeta: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  datesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  dateText: { color: colors.textOpacity(0.6), fontSize: 13, fontWeight: '600' },
  dateDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textOpacity(0.3) },
  dateTextHighlight: { color: COLORS.accent, fontSize: 13, fontWeight: '900' },
  
  statusPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, height: 32, borderRadius: 16 },
  filterChip: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 4 },
  filterChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterChipText: { fontSize: 10, fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', color: colors.textOpacity(0.6), includeFontPadding: false, lineHeight: 28, marginTop: Platform.OS === 'ios' ? -4 : -6 },
  filterChipTextActive: { color: colors.white },
  statusPending: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.text },
  statusPendingText: { color: colors.text },
  statusReady: { backgroundColor: colors.primaryLight },
  statusReadyText: { color: '#00C870' },
  statusDelivered: { backgroundColor: colors.border },
  statusDeliveredText: { color: colors.textOpacity(0.6) },
  statusPillText: { fontSize: 11, fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', includeFontPadding: false, lineHeight: 24, marginTop: Platform.OS === 'ios' ? -3 : -5 },

  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 12, padding: 10, marginBottom: 12 },
  contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderCustomerMeta: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  whatsappButtonSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  whatsappButtonTextSmall: { color: '#00C870', fontSize: 13, fontWeight: '800' },

  divider: { height: 1, backgroundColor: colors.border, marginBottom: 12 },

  orderDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceBlock: { gap: 4 },
  balanceLabel: { color: colors.textOpacity(0.5), fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  
  actionBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, backgroundColor: colors.text, paddingVertical: 10, paddingHorizontal: 16 },
  actionBtnPrimaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 16, backgroundColor: colors.primaryLight },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: colors.textOpacity(0.6), justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', paddingHorizontal: 24, paddingVertical: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 16, fontWeight: '600', color: colors.textOpacity(0.6) },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingBottom: 40 },
  sectionBlock: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, borderBottomWidth: 2, borderBottomColor: colors.border, paddingBottom: 8 },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  measureItem: { width: '48%', backgroundColor: colors.surface, padding: 16, borderRadius: 16, alignItems: 'center' },
  measureKey: { fontSize: 12, fontWeight: '700', color: colors.textOpacity(0.5), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  measureVal: { fontSize: 20, fontWeight: '900', color: colors.text },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  styleItem: { width: '48%', backgroundColor: colors.surface, padding: 16, borderRadius: 16 },
  notesBlock: { marginTop: 12, backgroundColor: '#FFF4E5', padding: 16, borderRadius: 16 },
  notesVal: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
});
