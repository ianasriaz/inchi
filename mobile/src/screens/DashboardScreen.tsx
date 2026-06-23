import React, { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View, RefreshControl, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: shopName = 'انچی', isRefetching: isShopRefetching } = useQuery({
    queryKey: ['shopName', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('shops').select('name').eq('id', user!.id).single();
      return data?.name || 'انچی';
    },
  });

  const { data: stats = { stitchingOrders: 0, readyOrders: 0, deliveredOrders: 0 }, isRefetching: isStatsRefetching, isLoading: isStatsLoading } = useQuery({
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

  // Helper to render stat number with loading state
  const renderStatNumber = (value: number, size: 'large' | 'small', color: string = colors.primary) => {
    if (isStatsLoading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={color} />
        </View>
      );
    }
    return (
      <Text style={[size === 'large' ? styles.bigNumber : styles.bigNumberSmall, { color }]}>
        {value}
      </Text>
    );
  };

  // Empty state for zero orders
  const renderEmptyState = () => {
    if (!isStatsLoading && stats.stitchingOrders === 0 && stats.readyOrders === 0 && stats.deliveredOrders === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="cube-outline" size={48} color={colors.textOpacity(0.2)} />
          <Text style={styles.emptyStateTextUrdu}>آج کا کوئی آرڈر نہیں</Text>
          <Text style={styles.emptyStateSubText}>نیا آرڈر شروع کریں</Text>
        </View>
      );
    }
    return null;
  };

  // Navigate to orders with filter
  const navigateToOrders = (filter: 'all' | 'stitching' | 'ready' | 'delivered') => {
    navigation.navigate('Orders', { filter });
  };

  return (
    <View style={styles.container}>
      {/* CLEAN MINIMAL HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.headerTitle}>
              Dashboard
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.settingsButtonPressed
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* SCROLL VIEW */}
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
        {renderEmptyState()}

        <View style={styles.cardsContainer}>
          {/* SHOP NAME CARD */}
          <View style={styles.shopNameCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="storefront-outline" size={28} color={colors.text} />
              <AppText style={styles.shopNameText}>{shopName}</AppText>
            </View>
          </View>

          {/* STATS CARDS LAYOUT */}
          <View style={styles.statsLayoutRow}>
            {/* LEFT COLUMN: PRIMARY CARD */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryCard,
                pressed && styles.primaryCardPressed,
              ]}
              onPress={() => navigateToOrders('stitching')}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: false }}
            >
              <View>
                <Text style={styles.primaryCardLabel}>سلائی جاری ہے</Text>
                {renderStatNumber(stats.stitchingOrders, 'large', colors.white)}
              </View>
              <View style={styles.primaryCardBottomRow}>
                <Ionicons name="cut-outline" size={32} color={colors.white} />
                <Ionicons name="arrow-forward" size={24} color={colors.white} />
              </View>
            </Pressable>

            {/* RIGHT COLUMN: SECONDARY CARDS */}
            <View style={styles.secondaryCardsColumn}>
              {/* Completed Card (Top) */}
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryCard,
                  styles.completedCard,
                  pressed && styles.secondaryCardPressed
                ]}
                onPress={() => navigateToOrders('ready')}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: false }}
              >
                <View style={styles.secondaryCardTopRow}>
                  <Ionicons name="arrow-down-outline" size={24} color={colors.white} />
                  {renderStatNumber(stats.readyOrders, 'small', colors.white)}
                </View>
                <Text style={styles.secondaryCardLabel}>سلائی مکمل</Text>
              </Pressable>

              {/* Delivered Card (Bottom) */}
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryCard,
                  styles.deliveredCard,
                  pressed && styles.secondaryCardPressed
                ]}
                onPress={() => navigateToOrders('delivered')}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: false }}
              >
                <View style={styles.secondaryCardTopRowDelivered}>
                  {renderStatNumber(stats.deliveredOrders, 'small', colors.white)}
                  <Ionicons name="arrow-up-outline" size={24} color={colors.white} style={{ transform: [{ rotate: '45deg' }] }} />
                </View>
                <Text style={styles.secondaryCardLabel}>وصول کر لیے</Text>
              </Pressable>
            </View>
          </View>

          {/* CTA BUTTON - Booking Karain */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed
            ]}
            onPress={() => navigation.navigate('GarmentSelect')}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
          >
            <Text style={styles.ctaButtonTextUrdu}>بکنگ کریں</Text>
            <View style={styles.ctaButtonIcon}>
              <Ionicons name="arrow-forward" size={22} color={colors.white} />
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
    backgroundColor: '#F8FAFA',
  },

  // ===== CLEAN MINIMAL HEADER =====
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    transform: [{ scale: 0.95 }],
  },

  // ===== SCROLL VIEW =====
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // ===== EMPTY STATE =====
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 8,
  },
  emptyStateTextUrdu: {
    fontFamily: URDU_FONT_BOLD,
    fontSize: 18,
    color: colors.textOpacity(0.4),
    marginTop: 12,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: colors.textOpacity(0.3),
    marginTop: 4,
  },

  // ===== CARDS =====
  cardsContainer: {
    gap: 16,
  },
  loaderContainer: {
    height: 56,
    justifyContent: 'center',
  },

  // ===== SHOP NAME CARD =====
  shopNameCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    height: 70,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  shopNameText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // ===== STATS CARDS LAYOUT =====
  statsLayoutRow: {
    flexDirection: 'row',
    gap: 14,
  },
  primaryCard: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 220,
  },
  primaryCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryCardLabel: {
    fontFamily: URDU_FONT_BOLD,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  primaryCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  bigNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 64,
    letterSpacing: -1.5,
  },
  secondaryCardsColumn: {
    flex: 1,
    gap: 14,
  },
  secondaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  completedCard: {
    backgroundColor: '#008A4E', // Distinctly darker green
  },
  deliveredCard: {
    backgroundColor: '#004D2C', // Very dark forest green
  },
  secondaryCardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  secondaryCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  secondaryCardTopRowDelivered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  secondaryCardLabel: {
    fontFamily: URDU_FONT_BOLD,
    fontSize: 15,
    color: colors.white,
    marginTop: 'auto',
  },
  bigNumberSmall: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 38,
    letterSpacing: -0.5,
  },

  // ===== CTA BUTTON =====
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 4,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ctaButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  ctaButtonTextUrdu: {
    color: colors.white,
    fontSize: 20,
    fontFamily: URDU_FONT_BOLD,
    includeFontPadding: false,
    paddingVertical: 2,
    letterSpacing: 0.5,
  },
  ctaButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});