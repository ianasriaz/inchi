import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TailorNumPad, { TailorNumPadKey } from '../components/TailorNumPad';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Measurement'>;

type MeasurementFieldKey =
  | 'length'
  | 'chest'
  | 'waist'
  | 'shoulder'
  | 'sleeve'
  | 'neck'
  | 'shalwar'
  | 'paincha';

type ToggleOption = {
  id: string;
  label: string;
  sublabel: string;
};

const COLORS = {
  background: '#FFFFFF',
  text: '#161d26',
  accent: '#00e482',
  border: '#D5DAE1',
};

const URDU_FONT = 'JameelNooriNastaleeqKasheeda';

const MEASUREMENT_FIELDS: Array<{
  key: MeasurementFieldKey;
  label: string;
  urdu: string;
}> = [
  { key: 'length', label: 'Length', urdu: 'لمبائی' },
  { key: 'chest', label: 'Chest', urdu: 'چھاتی' },
  { key: 'waist', label: 'Waist', urdu: 'کمر' },
  { key: 'shoulder', label: 'Shoulder', urdu: 'تیرا' },
  { key: 'sleeve', label: 'Sleeve', urdu: 'بازو' },
  { key: 'neck', label: 'Neck', urdu: 'گلا' },
  { key: 'shalwar', label: 'Shalwar', urdu: 'شلوار لمبائی' },
  { key: 'paincha', label: 'Paincha', urdu: 'پانچا' },
];

const COLLAR_OPTIONS: ToggleOption[] = [
  { id: 'ban', label: 'Ban', sublabel: 'بین' },
  { id: 'round', label: 'Round', sublabel: 'گول' },
];

const POCKET_OPTIONS: ToggleOption[] = [
  { id: 'front', label: 'Front', sublabel: 'سامنے' },
  { id: '2-side', label: '2 Side', sublabel: 'سائیڈ' },
];

const initialMeasurements = MEASUREMENT_FIELDS.reduce<Record<MeasurementFieldKey, string>>(
  (accumulator, field) => {
    accumulator[field.key] = '';
    return accumulator;
  },
  {
    length: '',
    chest: '',
    waist: '',
    shoulder: '',
    sleeve: '',
    neck: '',
    shalwar: '',
    paincha: '',
  },
);

export default function MeasurementScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const customerId = route.params?.customerId;
  const customerNumber = route.params?.customerNumber;
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [activeField, setActiveField] = useState<MeasurementFieldKey>('length');
  const [selectedCollar, setSelectedCollar] = useState('ban');
  const [selectedPocket, setSelectedPocket] = useState('front');

  const activeFieldIndex = useMemo(
    () => MEASUREMENT_FIELDS.findIndex((field) => field.key === activeField),
    [activeField],
  );

  const updateActiveValue = (updater: (currentValue: string) => string) => {
    setMeasurements((current) => ({
      ...current,
      [activeField]: updater(current[activeField]),
    }));
  };

  const handleKeyPress = (key: TailorNumPadKey) => {
    if (key === 'NEXT') {
      const nextField = MEASUREMENT_FIELDS[activeFieldIndex + 1]?.key ?? MEASUREMENT_FIELDS[0].key;
      setActiveField(nextField);
      return;
    }

    if (key === '⌫') {
      updateActiveValue((currentValue) => currentValue.slice(0, -1));
      return;
    }

    updateActiveValue((currentValue) => `${currentValue}${key}`);
  };
  const handleGoToInvoice = () => {
    navigation.navigate('Invoice', {
      customerId: customerId ?? 0,
      garmentType: 'Kameez Shalwar',
      measurements,
      styles: {
        collar: selectedCollar,
        pockets: selectedPocket,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerCard}>
            <Text style={styles.kicker}>Inchi Tailor Desk</Text>
            <Text style={styles.title}>Measurement Entry</Text>
            <Text style={styles.subtitle}>
              Customer Number: <Text style={styles.urduInline}>{customerNumber}</Text>
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Measurements</Text>
              <Text style={styles.sectionHint}>Tap a field, then use the docked keypad.</Text>
            </View>

            <View style={styles.measurementGrid}>
              {MEASUREMENT_FIELDS.map((field) => {
                const isActive = field.key === activeField;

                return (
                  <Pressable
                    key={field.key}
                    accessibilityRole="button"
                    style={[styles.measurementCard, isActive && styles.measurementCardActive]}
                    onPress={() => setActiveField(field.key)}
                  >
                    <View style={styles.measurementLabelRow}>
                      <Text style={styles.measurementLabel}>{field.label}</Text>
                      <Text style={styles.measurementUrdu}>{field.urdu}</Text>
                    </View>
                    <Text style={[styles.measurementValue, !measurements[field.key] && styles.measurementPlaceholder]}>
                      {measurements[field.key] || '—'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style Chips</Text>

            <View style={styles.chipBlock}>
              <Text style={styles.chipBlockLabel}>Collar: Ban / بین | Round / گول</Text>
              <View style={styles.chipRow}>
                {COLLAR_OPTIONS.map((option) => {
                  const isSelected = selectedCollar === option.id;

                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setSelectedCollar(option.id)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
                      <Text style={[styles.chipSubText, isSelected && styles.chipTextSelected]}>{option.sublabel}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.chipBlock}>
              <Text style={styles.chipBlockLabel}>Pockets: Front / سامنے | 2 Side / سائیڈ</Text>
              <View style={styles.chipRow}>
                {POCKET_OPTIONS.map((option) => {
                  const isSelected = selectedPocket === option.id;

                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setSelectedPocket(option.id)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
                      <Text style={[styles.chipSubText, isSelected && styles.chipTextSelected]}>{option.sublabel}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable accessibilityRole="button" style={styles.saveButton} onPress={handleGoToInvoice}>
              <Text style={styles.saveButtonText}>Next: Invoice / بل</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.numpadDock}>
          <TailorNumPad onKeyPress={handleKeyPress} />
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
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  headerCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.12)',
  },
  kicker: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    flexShrink: 1,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionHint: {
    color: 'rgba(22, 29, 38, 0.65)',
    fontSize: 13,
  },
  measurementGrid: {
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  measurementCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '48%',
    flexGrow: 1,
  },
  measurementCardActive: {
    borderColor: COLORS.accent,
    borderWidth: 3,
    backgroundColor: '#F3FFF9',
  },
  measurementLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  measurementLabel: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  measurementUrdu: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: URDU_FONT,
    lineHeight: 26,
  },
  measurementValue: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  measurementPlaceholder: {
    color: 'rgba(22, 29, 38, 0.28)',
  },
  chipBlock: {
    gap: 10,
  },
  chipBlockLabel: {
    color: 'rgba(22, 29, 38, 0.78)',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: URDU_FONT,
    lineHeight: 24,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: {
    flexGrow: 1,
    minWidth: 140,
    flexBasis: '48%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  chipSubText: {
    color: 'rgba(22, 29, 38, 0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: COLORS.text,
  },
  saveButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  saveButtonText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  urduInline: {
    fontFamily: URDU_FONT,
    fontSize: 18,
    fontWeight: '400',
  },
  numpadDock: {
    paddingBottom: 6,
    backgroundColor: COLORS.background,
  },
});