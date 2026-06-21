import React, { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View, RefreshControl, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabParamList } from '../../App';
import { colors } from '../theme/colors';
import AppText from '../components/AppText';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

const URDU_FONT = 'NotoNastaliqUrdu';
const URDU_FONT_BOLD = 'NotoNastaliqUrduBold';

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: shopName = 'ڈیش بورڈ', isRefetching: isShopRefetching } = useQuery({
    queryKey: ['shopName', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('shops').select('name').eq('id', user!.id).single();
      return data?.name || 'ڈیش بورڈ';
    },
  });

  const { data: stats = { stitchingOrders: 0, readyOrders: 0, deliveredOrders: 0 }, isRefetching: isStatsRefetching } = useQuery({
    queryKey: ['dashboardStats', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('status').eq('shop_id', user!.id);
      if (error) throw error;
      const stitchingOrders = data?.filter(o => o.status === 'pending').length || 0;
      const readyOrders = data?.filter(o => o.status === 'ready').length || 0;
      const deliveredOrders = data?.filter(o => o.status === 'delivered').length || 0;
      return { stitchingOrders, readyOrders, deliveredOrders };
    },
  });

  const isRefreshing = isShopRefetching || isStatsRefetching;

  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shopName'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    ]);
  }, [queryClient]);

  const formattedDate = currentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="checkmark-circle" size={24} color={colors.white} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText style={styles.logoTextUrdu} numberOfLines={1}>{shopName}</AppText>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.headerIconCircle}>
            <Ionicons name="settings-outline" size={20} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.headerTitles}>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.cardsContainer}>
          {/* In Progress Card */}
          <View style={styles.inProgressCard}>
            <View style={styles.inProgressTopRow}>
              <View style={styles.inProgressHeader}>
                <View style={styles.smallIconCircle}>
                  <Ionicons name="cut-outline" size={16} color={colors.primary} />
                </View>
              </View>
            </View>
            <View style={styles.inProgressBody}>
              <View style={styles.inProgressLeft}>
                <Text style={styles.bigNumber}>{stats.stitchingOrders}</Text>
                <Text style={styles.urduLabel}>سلائی جاری ہے</Text>
              </View>
              <View style={styles.largeIconBox}>
                <Ionicons name="cut-outline" size={36} color={colors.primary} />
              </View>
            </View>
          </View>

          {/* Row Cards */}
          <View style={styles.rowCards}>
            {/* Completed Card */}
            <View style={styles.halfCardCompleted}>
              <View style={styles.smallIconCircleCompleted}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.bigNumberSmall}>{stats.readyOrders}</Text>
              <View style={styles.halfCardBottom}>
                <Text style={styles.urduLabelRight}>سلائی مکمل</Text>
              </View>
            </View>

            {/* To Collect Card */}
            <View style={styles.halfCardToCollect}>
              <View style={styles.smallIconCircleToCollect}>
                <Ionicons name="bag-handle-outline" size={16} color={colors.warning} />
              </View>
              <Text style={styles.bigNumberSmall}>{stats.deliveredOrders}</Text>
              <View style={styles.halfCardBottom}>
                <Text style={styles.urduLabelRightToCollect}>وصول کر لیے</Text>
              </View>
            </View>
          </View>

          {/* New Booking Button */}
          <Pressable style={styles.newBookingBtn} onPress={() => navigation.navigate('GarmentSelect')}>
            <Text style={styles.newBookingTextUrdu}>بکنگ کریں</Text>
            <View style={styles.newBookingIconCircle}>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  logoTextUrdu: {
    fontWeight: '900',
    fontSize: 22,
    color: colors.white,
    marginTop: Platform.OS === 'ios' ? -4 : -6,
    paddingVertical: 4,
  },
  logoTextSub: {
    fontFamily: URDU_FONT,
    fontSize: 10,
    color: colors.white,
    opacity: 0.8,
    lineHeight: 14,
  },
  headerTitles: {
    gap: 4,
  },
  dateText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  cardsContainer: {
    gap: 16,
  },
  // In Progress Card
  inProgressCard: {
    backgroundColor: colors.inProgressBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(33, 160, 80, 0.15)',
  },
  inProgressTopRow: {
    marginBottom: 16,
  },
  inProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.inProgressIconBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inProgressTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  inProgressBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  inProgressLeft: {
    justifyContent: 'flex-end',
  },
  bigNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 64,
    marginBottom: -4,
  },
  urduLabel: {
    fontFamily: URDU_FONT_BOLD,
    fontSize: 18,
    color: colors.textOpacity(0.8),
    includeFontPadding: false,
    paddingVertical: 2,
  },
  largeIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.inProgressIconBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Row Cards
  rowCards: {
    flexDirection: 'row',
    gap: 16,
  },
  halfCardCompleted: {
    flex: 1,
    backgroundColor: colors.completedBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  halfCardToCollect: {
    flex: 1,
    backgroundColor: colors.warningBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 166, 27, 0.2)',
  },
  smallIconCircleCompleted: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.completedIconBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  smallIconCircleToCollect: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bigNumberSmall: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 48,
  },
  halfCardBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  englishLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOpacity(0.4),
    textTransform: 'uppercase',
  },
  englishLabelToCollect: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    textTransform: 'uppercase',
  },
  urduLabelRight: {
    fontFamily: URDU_FONT_BOLD,
    fontSize: 16,
    color: colors.textOpacity(0.5),
    includeFontPadding: false,
    paddingVertical: 2,
  },
  urduLabelRightToCollect: {
    fontFamily: URDU_FONT_BOLD,
    fontSize: 16,
    color: colors.warning,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  // New Booking Button
  newBookingBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  newBookingIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBookingTextEng: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  newBookingTextUrdu: {
    color: colors.white,
    fontSize: 18,
    fontFamily: URDU_FONT_BOLD,
    includeFontPadding: false,
    paddingVertical: 4,
  },
});