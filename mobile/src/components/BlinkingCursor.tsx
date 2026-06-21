import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';

export default function BlinkingCursor() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 530); // Standard cursor blink rate
    return () => clearInterval(interval);
  }, []);

  return <Text style={[styles.cursor, { opacity: visible ? 1 : 0 }]}>|</Text>;
}

const styles = StyleSheet.create({
  cursor: {
    color: colors.primary,
    fontWeight: '300',
    fontSize: 22,
    marginTop: Platform.OS === 'ios' ? -2 : -4,
  }
});
