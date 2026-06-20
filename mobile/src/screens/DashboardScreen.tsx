import React, { useCallback, useState } from 'react';
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

const COLORS = {
  background: '#FFFFFF',
  text: '#161d26',
  accent: '#00e482',
};

const URDU_FONT = 'NotoNastaliqUrdu';

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    stitchingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
  });

  const fetchStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
        contentContainerStyle={[styles.container, { paddingTop: 20, paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.accent]} tintColor={COLORS.accent} />}
      >
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginLeft: 'auto' }}>
              <Pressable onPress={() => navigation.navigate('Revenue')} style={styles.settingsButton}>
                <Ionicons name="wallet-outline" size={24} color={COLORS.text} />
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
                <Ionicons name="settings-outline" size={24} color={COLORS.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, styles.statBoxFull]}>
              <View style={styles.statBoxTop}>
                <View style={styles.iconCircle}>
                  <Ionicons name="cut-outline" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.statValueBig}>{stats.stitchingOrders}</Text>
              </View>
              <Text style={[styles.statLabel, { fontFamily: URDU_FONT, lineHeight: 28, paddingTop: 4 }]}>Stitching / سلائی</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statBoxTop}>
                <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.accent} />
                <Text style={[styles.statValue, { color: COLORS.accent }]}>{stats.readyOrders}</Text>
              </View>
              <Text style={[styles.statLabel, { fontFamily: URDU_FONT, lineHeight: 28, paddingTop: 4 }]}>Ready / مکمل</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statBoxTop}>
                <Ionicons name="bag-check-outline" size={24} color="#161D26" />
                <Text style={[styles.statValue, { color: '#161D26' }]}>{stats.deliveredOrders}</Text>
              </View>
              <Text style={[styles.statLabel, { fontFamily: URDU_FONT, lineHeight: 28, paddingTop: 4 }]}>Delivered / ڈلیورڈ</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button for New Booking */}
      <View style={[styles.footer, { paddingBottom: 20 }]}>
        <Pressable style={styles.newBookingButton} onPress={() => navigation.navigate('CustomerSearch')}>
          <Ionicons name="add-circle" size={24} color={COLORS.text} style={{ marginRight: 6 }} />
          <Text style={[styles.newBookingButtonText, { fontSize: 18, fontWeight: '900' }]}>
            New Booking
          </Text>
        </Pressable>
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
  },
  content: {
    gap: 24,
    marginBottom: 6,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontFamily: URDU_FONT,
    color: 'rgba(22, 29, 38, 0.5)',
    fontSize: 22,
    fontWeight: '400',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statBox: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16 },
      android: { elevation: 3 },
    }),
  },
  statBoxFull: {
    width: '100%',
    backgroundColor: '#00e482',
    ...Platform.select({
      ios: { shadowColor: '#00e482', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  statBoxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: 'rgba(22, 29, 38, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
  },
  statValueBig: {
    color: COLORS.text,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'transparent', // Allow background to show
  },
  newBookingButton: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#00e482', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  newBookingButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});