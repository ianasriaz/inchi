import React, { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View, RefreshControl, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabParamList } from '../../App';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

import { colors } from '../theme/colors';

const URDU_FONT = 'NotoNastaliqUrdu';
const URDU_FONT_BOLD = 'NotoNastaliqUrduBold';

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    stitchingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
  });
  const [shopName, setShopName] = useState('ڈیش بورڈ');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: shopData } = await supabase.from('shops').select('name').eq('id', user.id).single();
    if (shopData?.name) {
      setShopName(shopData.name);
    }

    const { data, error } = await supabase
      .from('orders')
      .select('status, created_at')
      .eq('shop_id', user.id);

    if (error) {
      console.error('Failed to fetch stats:', error);
      return;
    }

    if (data) {
      const stitchingOrders = data.filter(o => o.status === 'pending').length;
      const readyOrders = data.filter(o => o.status === 'ready').length;
      const deliveredOrders = data.filter(o => o.status === 'delivered').length;
      setStats({ stitchingOrders, readyOrders, deliveredOrders });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  }, [fetchStats]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.content}>

          {/* Header Area */}
          <View style={styles.headerContainer}>
            <View style={styles.shopNameBadge}>
              <Text style={styles.shopNameText} numberOfLines={1}>
                {shopName}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={() => navigation.navigate('Revenue')} style={styles.iconButton}>
                <Ionicons name="wallet-outline" size={22} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
                <Ionicons name="settings-outline" size={22} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Date & Time Area */}
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={16} color={colors.textOpacity(0.6)} />
              <Text style={styles.dateText}>
                {currentDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.timeBadge}>
              <View style={styles.timeIndicator} />
              <Text style={styles.timeText}>
                {currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, styles.statBoxFull]}>
              <View style={styles.statBoxTop}>
                <View style={[styles.iconCircle, { backgroundColor: colors.white }]}>
                  <Ionicons name="cut-outline" size={24} color={colors.text} />
                </View>
                <Text style={[styles.statValueGiant, { color: colors.white }]}>{stats.stitchingOrders}</Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.textOpacity(0.7) }]}>سلائی جاری ہے</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statBoxTop}>
                <View style={styles.iconCircleSmall}>
                  <Ionicons name="checkmark-done" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.readyOrders}</Text>
              </View>
              <Text style={styles.statLabel}>سلائی مکمل ہے</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statBoxTop}>
                <View style={styles.iconCircleSmall}>
                  <Ionicons name="bag-check-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.deliveredOrders}</Text>
              </View>
              <Text style={styles.statLabel}>وصول کر لیے</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Floating Action Button for New Booking */}
      <View style={styles.footer}>
        <Pressable style={styles.fabButton} onPress={() => navigation.navigate('GarmentSelect')}>
          <Ionicons name="shirt-outline" size={24} color={colors.white} style={styles.fabIcon} />
          <Text style={styles.fabText}>New Booking</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface, // Slight off-white to make cards pop
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120, // Extra padding so FAB doesn't cover content
    flexGrow: 1,
  },
  content: {
    gap: 24,
  },

  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  shopNameBadge: {
    flex: 1,
    height: 48,
    backgroundColor: colors.background,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 }
    }),
  },
  shopNameText: {
    fontFamily: URDU_FONT_BOLD,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    includeFontPadding: false,
    marginTop: Platform.OS === 'ios' ? -4 : -6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },

  // Date & Time Styles
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: colors.textOpacity(0.6),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  timeText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Stats Grid Styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '47.5%',
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: colors.black, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  statBoxFull: {
    width: '100%',
    backgroundColor: colors.primary,
    borderColor: colors.text,
    borderWidth: 1,
  },
  statBoxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight, // Light mint tint
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: URDU_FONT_BOLD,
    color: colors.textOpacity(0.6),
    fontSize: 13,
    lineHeight: 36,
    paddingTop: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  statValueGiant: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
  },

  // Footer / FAB Styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: colors.surface, // Solid background prevents text bleed
    borderTopWidth: 1,
    borderColor: colors.textOpacity(0.03),
  },
  fabButton: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 24,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  fabIcon: {
    marginRight: 8,
  },
  fabText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});