import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TailorNumPadKey =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '0'
  | '.'
  | '¼'
  | '½'
  | '¾'
  | '⌫'
  | 'NEXT';

type TailorNumPadProps = {
  onKeyPress: (key: TailorNumPadKey) => void;
};

const KEYS: TailorNumPadKey[][] = [
  ['1', '2', '3', '¼'],
  ['4', '5', '6', '½'],
  ['7', '8', '9', '¾'],
  ['.', '0', '⌫', 'NEXT'],
];

export default function TailorNumPad({ onKeyPress }: TailorNumPadProps) {
  return (
    <View style={styles.container}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isActionKey = key === '⌫' || key === 'NEXT' || key === '¼' || key === '½' || key === '¾';

            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`Key ${key}`}
                activeOpacity={0.8}
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
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(22, 29, 38, 0.12)',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(22, 29, 38, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionKey: {
    backgroundColor: '#00e482',
    borderColor: '#00e482',
  },
  keyText: {
    color: '#161d26',
    fontSize: 19,
    fontWeight: '700',
  },
  actionKeyText: {
    color: '#1E1E1E',
  },
});