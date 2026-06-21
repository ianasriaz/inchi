import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';
import { colors } from '../theme/colors';


type Props = NativeStackScreenProps<RootStackParamList, 'GarmentSelect'>;

const COLORS = {
  background: colors.white,
  text: colors.text,
  accent: colors.primary,
  cardBg: colors.surface,
};

const GARMENTS = [
  { id: 'kameez_shalwar', label: 'Kameez Shalwar', urdu: 'قمیض شلوار', icon: 'shirt-outline' },
  { id: 'kurta', label: 'Kurta / Kurta Shalwar', urdu: 'کرتہ', icon: 'body-outline' },
  { id: 'waistcoat', label: 'Waistcoat', urdu: 'واسکٹ', icon: 'briefcase-outline' },
  { id: 'pant_shirt', label: 'Pant Shirt', urdu: 'پینٹ شرٹ', icon: 'man-outline' },
];

export default function GarmentSelectScreen({ navigation }: Props) {
  const handleSelect = (garmentLabel: string) => {
    // Pass route.params?.customerId if it exists, otherwise default to 0 for standalone testing.
    const customerId = (navigation.getState().routes.find(r => r.name === 'GarmentSelect')?.params as any)?.customerId || 0;
    navigation.navigate('Measurement', { initialGarmentType: garmentLabel, customerId: Number(customerId) });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Garment</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.container}>
        {GARMENTS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleSelect(item.label)}
          >
            <View style={styles.cardIconBox}>
              <Ionicons name={item.icon as any} size={32} color={COLORS.accent} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardUrdu}>{item.urdu}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textOpacity(0.2)} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardUrdu: {
    fontFamily: 'NotoNastaliqUrdu',
    fontSize: 16,
    color: colors.textOpacity(0.6),
  },
});
