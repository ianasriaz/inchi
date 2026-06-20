import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TailorNumPadKey =
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | '.'
  | '¼' | '½' | '¾' | '⌫' | 'NEXT';

type TailorNumPadProps = {
  onKeyPress: (key: TailorNumPadKey) => void;
  onClose?: () => void;
};

const KEYS: TailorNumPadKey[][] = [
  ['1', '2', '3', '¼'],
  ['4', '5', '6', '½'],
  ['7', '8', '9', '¾'],
  ['.', '0', '⌫', 'NEXT'],
];

export default function TailorNumPad({ onKeyPress, onClose }: TailorNumPadProps) {
  return (
    <View style={styles.container}>
      {onClose && (
        <View style={styles.toolbar}>
          <View style={styles.toolbarHandle} />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="chevron-down" size={24} color="#161d26" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.grid}>
        {KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => {
              const isActionKey = key === '⌫' || key === 'NEXT' || key === '¼' || key === '½' || key === '¾';

              return (
                <TouchableOpacity
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`Key ${key}`}
                  activeOpacity={0.7}
                  style={[styles.key, isActionKey && styles.actionKey]}
                  onPress={() => onKeyPress(key)}
                >
                  <Text style={[styles.keyText, isActionKey && styles.actionKeyText]}>{key}</Text>
                </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F0F0F0',
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32, // Extra padding for bottom safe area
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionKey: {
    backgroundColor: '#00e482',
    ...Platform.select({
      ios: { shadowColor: '#00e482', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  keyText: {
    color: '#161d26',
    fontSize: 22,
    fontWeight: '800',
  },
  actionKeyText: {
    color: '#161d26',
    fontSize: 20,
    fontWeight: '900',
  },
});