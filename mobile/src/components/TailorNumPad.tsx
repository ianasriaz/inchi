import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Pressable, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type TailorNumPadKey =
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | '.'
  | '½' | '⌫' | 'NEXT';

type TailorNumPadProps = {
  onKeyPress: (key: TailorNumPadKey) => void;
  onClose?: () => void;
  activeFieldLabel?: string;
  hideBottomInset?: boolean;
};

const KEYS: TailorNumPadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
  ['½', 'NEXT'],
];

export default function TailorNumPad({ onKeyPress, onClose, activeFieldLabel, hideBottomInset }: TailorNumPadProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: hideBottomInset ? 0 : insets.bottom }]}>
      {onClose && (
        <View style={styles.toolbar}>
          <View style={styles.toolbarHandle} />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="chevron-down" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.grid}>
        {KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => {
              const isActionKey = key === '⌫' || key === 'NEXT' || key === '½';

              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`Key ${key}`}
                  style={({ pressed }) => [
                    styles.key, 
                    isActionKey && styles.actionKey,
                    pressed && { backgroundColor: 'rgba(22, 29, 38, 0.1)', transform: [{ scale: 0.96 }] }
                  ]}
                  onPress={() => onKeyPress(key)}
                >
                  <Text style={[styles.keyText, isActionKey && styles.actionKeyText]}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  toolbar: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  toolbarHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  grid: {
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  key: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionKey: {
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  keyText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  actionKeyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
});