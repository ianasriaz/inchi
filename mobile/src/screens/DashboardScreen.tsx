import React, { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

type OrderRow = {
  id: string;
  garment_type: string;
  balance_amount: number | null;
  status: string | null;
  created_at: string;
  customers: {
    name: string | null;
    phone: string | null;
  } | null;
};

const COLORS = {
  background: '#FFFFFF',
  text: '#161d26',
  accent: '#00e482',
};

const URDU_FONT = 'JameelNooriNastaleeqKasheeda';

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch orders:', error);
      return;
    }

    setOrders((data as OrderRow[]) ?? []);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  const formatPhoneForWhatsApp = (phone: string | null | undefined) => {
    if (!phone) {
      return '';
    }

    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.startsWith('0092')) {
      return digitsOnly.slice(2);
    }

    if (digitsOnly.startsWith('92')) {
      return digitsOnly;
    }

    if (digitsOnly.startsWith('0')) {
      return `92${digitsOnly.slice(1)}`;
    }

    return `92${digitsOnly}`;
  };

  const handleWhatsAppPickup = async (order: OrderRow) => {
    const formattedPhone = formatPhoneForWhatsApp(order.customers?.phone);

    if (!formattedPhone) {
      console.error('Missing customer phone for WhatsApp pickup');
      return;
    }

    const message = `Assalam-o-Alaikum! Your ${order.garment_type} is ready to pickup. Balance due: Rs. ${order.balance_amount ?? 0}.`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
    }
  };

  const renderOrderCard = ({ item }: { item: OrderRow }) => {
    const customerName = item.customers?.name ?? 'Unknown Customer';
    const customerPhone = item.customers?.phone ?? 'No phone';
    const statusLabel = item.status ?? 'Pending';
    const createdDate = new Date(item.created_at).toLocaleDateString();

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderRowTop}>
          <View style={styles.orderTextBlock}>
            <Text style={styles.orderCustomerName}>{customerName}</Text>
            <Text style={styles.orderCustomerMeta}>{customerPhone}</Text>
            <Text style={styles.orderMeta}>
              {item.garment_type} • {createdDate}
            </Text>
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.orderDetailsRow}>
          <View style={styles.balanceBlock}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text style={styles.balanceValue}>Rs. {item.balance_amount ?? 0}</Text>
          </View>
        </View>

        <Pressable style={styles.whatsappButton} onPress={() => handleWhatsAppPickup(item)}>
          <Text style={styles.whatsappButtonText}>WhatsApp Pickup</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.content}>
              <Text style={styles.header}>
                Active Orders / <Text style={styles.urduText}>موجودہ آرڈرز</Text>
              </Text>

              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>Live order feed from Supabase</Text>
                <Text style={styles.emptyStateSubtitle}>Pull to refresh by navigating away and back to this screen.</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyOrdersBlock}>
              <Text style={styles.emptyStateTitle}>No active orders yet</Text>
              <Text style={styles.emptyStateSubtitle}>Start a new booking to add the first order.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable style={styles.newBookingButton} onPress={() => navigation.navigate('CustomerSearch')}>
            <Text style={styles.newBookingButtonText}>
              [ + NEW BOOKING / <Text style={styles.newBookingUrdu}>نیا آرڈر</Text> ]
            </Text>
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
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    flexGrow: 1,
    gap: 12,
  },
  content: {
    gap: 18,
    marginBottom: 6,
  },
  header: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    flexShrink: 1,
  },
  emptyStateCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
    padding: 18,
    backgroundColor: '#F7F8FA',
  },
  emptyOrdersBlock: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
    padding: 18,
    backgroundColor: '#F7F8FA',
  },
  emptyStateTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 14,
    lineHeight: 20,
  },
  separator: {
    height: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.text,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  orderRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderTextBlock: {
    flex: 1,
    gap: 2,
  },
  orderCustomerName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  orderCustomerMeta: {
    color: 'rgba(22, 29, 38, 0.75)',
    fontSize: 14,
    fontWeight: '600',
  },
  orderMeta: {
    color: 'rgba(22, 29, 38, 0.75)',
    fontSize: 13,
    marginTop: 4,
  },
  orderDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  balanceBlock: {
    gap: 4,
  },
  balanceLabel: {
    color: 'rgba(22, 29, 38, 0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  balanceValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3FFF9',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  statusPillText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  whatsappButton: {
    alignSelf: 'flex-end',
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  newBookingButton: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
  },
  newBookingButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  newBookingUrdu: {
    fontFamily: URDU_FONT,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 24,
  },
  urduText: {
    fontFamily: URDU_FONT,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 34,
  },
});