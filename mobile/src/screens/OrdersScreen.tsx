import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View, RefreshControl, TextInput, Alert, Platform, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { containsUrdu } from '../utils/textUtils';

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
  background: '#F7F8FA',
  text: '#161d26',
  accent: '#00e482',
};

const URDU_FONT = 'NotoNastaliqUrdu';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

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
      return;
    }

    setOrders((data as OrderRow[]) ?? []);
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
            <Text style={{ fontSize: 14, color: 'rgba(22, 29, 38, 0.5)', fontWeight: '700' }}>
              {item.garment_type}
            </Text>
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, color: 'rgba(22, 29, 38, 0.5)', fontWeight: '600' }}>
                Booked: {createdDate}
              </Text>
              <View style={styles.dateDot} />
              <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '800' }}>
                Due: {pickupDate}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusPill, isDelivered ? styles.statusDelivered : isReady ? styles.statusReady : styles.statusPending]}>
            <Ionicons name={isDelivered ? "checkmark-done" : isReady ? "checkmark-circle" : "cut"} size={14} color={isDelivered ? 'rgba(22, 29, 38, 0.4)' : isReady ? '#00C870' : '#161D26'} style={{ marginRight: 4 }} />
            <Text style={[styles.statusPillText, isDelivered ? styles.statusDeliveredText : isReady ? styles.statusReadyText : styles.statusPendingText]}>
              {isDelivered ? 'Delivered' : isReady ? 'Ready' : 'Stitching'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: 'rgba(22, 29, 38, 0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Balance Due</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>Rs. {item.balance_amount ?? 0}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable style={styles.actionBtnSecondary} onPress={() => handleWhatsAppPickup(item)}>
            <Ionicons name="logo-whatsapp" size={24} color="#00C870" />
          </Pressable>
          
          {!isReady && !isDelivered ? (
            <Pressable style={[styles.actionBtnPrimary, { flex: 1, justifyContent: 'center' }]} onPress={() => handleMarkReady(item.id)}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={[styles.actionBtnPrimaryText, { marginLeft: 6 }]}>Mark Done</Text>
            </Pressable>
          ) : isReady && !isDelivered ? (
            <Pressable style={[styles.actionBtnPrimary, { flex: 1, backgroundColor: '#E8FDF3', justifyContent: 'center' }]} onPress={() => handleDeliverOrder(item)}>
              <Ionicons name="bag-check-outline" size={20} color="#00C870" />
              <Text style={[styles.actionBtnPrimaryText, { color: '#00C870', marginLeft: 6 }]}>Deliver Now</Text>
            </Pressable>
          ) : (
            <View style={[styles.actionBtnPrimary, { flex: 1, backgroundColor: '#F0F0F0', justifyContent: 'center' }]}>
              <Ionicons name="checkmark-done" size={20} color="rgba(22, 29, 38, 0.4)" />
              <Text style={[styles.actionBtnPrimaryText, { color: 'rgba(22, 29, 38, 0.4)', marginLeft: 6 }]}>Delivered</Text>
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
                <Ionicons name="close" size={24} color="#161D26" />
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
                placeholderTextColor="rgba(22, 29, 38, 0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 8 }}>
                <Pressable style={[styles.filterChip, activeFilter === 'stitching' && styles.filterChipActive]} onPress={() => setActiveFilter('stitching')}>
                  <Text style={[styles.filterChipText, activeFilter === 'stitching' && styles.filterChipTextActive]}>Stitching</Text>
                </Pressable>
                <Pressable style={[styles.filterChip, activeFilter === 'ready' && styles.filterChipActive]} onPress={() => setActiveFilter('ready')}>
                  <Text style={[styles.filterChipText, activeFilter === 'ready' && styles.filterChipTextActive]}>Ready</Text>
                </Pressable>
                <Pressable style={[styles.filterChip, activeFilter === 'delivered' && styles.filterChipActive]} onPress={() => setActiveFilter('delivered')}>
                  <Text style={[styles.filterChipText, activeFilter === 'delivered' && styles.filterChipTextActive]}>Delivered</Text>
                </Pressable>
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyOrdersBlock}>
              <Text style={styles.emptyStateTitle}>No bookings yet</Text>
              <Text style={styles.emptyStateSubtitle}>Go to the Dashboard to create a new booking.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
        {renderDetailsModal()}
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
  headerSubtitle: { fontFamily: URDU_FONT, color: 'rgba(22, 29, 38, 0.5)', fontSize: 22, fontWeight: '400', lineHeight: 34, paddingTop: 6 },
  searchInput: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: '#F0F0F0' },
  emptyOrdersBlock: { borderRadius: 24, padding: 24, backgroundColor: '#FFFFFF', alignItems: 'center' },
  emptyStateTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyStateSubtitle: { color: 'rgba(22, 29, 38, 0.72)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  separator: { height: 12 },
  orderCard: { 
    backgroundColor: '#FFFFFF', 
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
  dateText: { color: 'rgba(22, 29, 38, 0.6)', fontSize: 13, fontWeight: '600' },
  dateDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(22, 29, 38, 0.3)' },
  dateTextHighlight: { color: COLORS.accent, fontSize: 13, fontWeight: '900' },
  
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#161D26', borderColor: '#161D26' },
  filterChipText: { fontSize: 13, fontWeight: '700', color: 'rgba(22, 29, 38, 0.6)' },
  filterChipTextActive: { color: '#FFFFFF' },
  statusPending: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#161D26' },
  statusPendingText: { color: '#161D26' },
  statusReady: { backgroundColor: '#E8FDF3' },
  statusReadyText: { color: '#00C870' },
  statusDelivered: { backgroundColor: '#F0F0F0' },
  statusDeliveredText: { color: 'rgba(22, 29, 38, 0.6)' },
  statusPillText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },

  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 10, marginBottom: 12 },
  contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderCustomerMeta: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  whatsappButtonSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8FDF3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  whatsappButtonTextSmall: { color: '#00C870', fontSize: 13, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 12 },

  orderDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceBlock: { gap: 4 },
  balanceLabel: { color: 'rgba(22, 29, 38, 0.5)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  
  actionBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, backgroundColor: '#161D26', paddingVertical: 10, paddingHorizontal: 16 },
  actionBtnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 16, backgroundColor: '#E8FDF3' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(22, 29, 38, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', paddingHorizontal: 24, paddingVertical: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#161D26', marginBottom: 4 },
  modalSubtitle: { fontSize: 16, fontWeight: '600', color: 'rgba(22, 29, 38, 0.6)' },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7F8FA', alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingBottom: 40 },
  sectionBlock: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#161D26', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#F0F0F0', paddingBottom: 8 },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  measureItem: { width: '48%', backgroundColor: '#F7F8FA', padding: 16, borderRadius: 16, alignItems: 'center' },
  measureKey: { fontSize: 12, fontWeight: '700', color: 'rgba(22, 29, 38, 0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  measureVal: { fontSize: 20, fontWeight: '900', color: '#161D26' },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  styleItem: { width: '48%', backgroundColor: '#F7F8FA', padding: 16, borderRadius: 16 },
  notesBlock: { marginTop: 12, backgroundColor: '#FFF4E5', padding: 16, borderRadius: 16 },
  notesVal: { fontSize: 16, fontWeight: '700', color: '#161D26', marginTop: 4 },
});
