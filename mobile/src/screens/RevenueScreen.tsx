import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';


const COLORS = {
  background: colors.white,
  text: colors.text,
  accent: colors.primary,
};

export default function RevenueScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    advanceCollected: 0,
    balancePending: 0,
    totalOrders: 0,
  });

  const fetchRevenueStats = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, advance_amount');

    if (error) {
      console.error('Failed to fetch revenue stats:', error);
    } else if (data) {
      let totalSales = 0;
      let advanceCollected = 0;
      
      data.forEach(order => {
        totalSales += (order.total_amount || 0);
        advanceCollected += (order.advance_amount || 0);
      });

      const balancePending = totalSales - advanceCollected;
      const totalOrders = data.length;

      setStats({ totalSales, advanceCollected, balancePending, totalOrders });
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRevenueStats();
    }, [fetchRevenueStats])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchRevenueStats();
    setIsRefreshing(false);
  }, [fetchRevenueStats]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleMain}>Revenue</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <ScrollView 
          style={styles.screen} 
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.accent]} />}
        >
          <Text style={styles.sectionHeader}>Lifetime Performance</Text>
          
          <View style={styles.mainCard}>
            <View style={styles.mainCardIcon}>
              <Ionicons name="wallet" size={28} color={colors.primary} />
            </View>
            <Text style={styles.mainCardLabel}>Total Sales</Text>
            <Text style={styles.mainCardValue}>Rs. {stats.totalSales.toLocaleString()}</Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridCard}>
              <View style={[styles.gridIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="arrow-down" size={20} color="#00C870" />
              </View>
              <Text style={styles.gridLabel}>Collected</Text>
              <Text style={styles.gridValue}>Rs. {stats.advanceCollected.toLocaleString()}</Text>
            </View>

            <View style={styles.gridCard}>
              <View style={[styles.gridIcon, { backgroundColor: '#FFF4E5' }]}>
                <Ionicons name="time-outline" size={20} color="#FF9500" />
              </View>
              <Text style={styles.gridLabel}>Pending Balance</Text>
              <Text style={styles.gridValue}>Rs. {stats.balancePending.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.ordersCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.ordersIcon}>
                <Ionicons name="documents-outline" size={24} color={colors.text} />
              </View>
              <Text style={styles.ordersLabel}>Total Bookings Processed</Text>
            </View>
            <Text style={styles.ordersValue}>{stats.totalOrders}</Text>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1 },
  container: { padding: 20, paddingBottom: 60, gap: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitleMain: { fontSize: 20, fontWeight: '800', color: colors.text },

  sectionHeader: { fontSize: 14, fontWeight: '800', color: colors.textOpacity(0.4), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },

  mainCard: { 
    backgroundColor: colors.primary, 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  mainCardIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  mainCardLabel: { color: colors.textOpacity(0.7), fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  mainCardValue: { color: colors.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 },

  grid: { flexDirection: 'row', gap: 16 },
  gridCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 20 },
  gridIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridLabel: { color: colors.textOpacity(0.5), fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  gridValue: { color: COLORS.text, fontSize: 22, fontWeight: '900' },

  ordersCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginTop: 8 },
  ordersIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  ordersLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  ordersValue: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
});
