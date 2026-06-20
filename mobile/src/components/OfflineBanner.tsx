import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    let wasOffline = false;

    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      
      if (offline) {
        setIsOffline(true);
        setShowRestored(false);
        wasOffline = true;
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      } else {
        setIsOffline(false);
        if (wasOffline) {
          // Show restored banner briefly
          setShowRestored(true);
          wasOffline = false;
          
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();

          setTimeout(() => {
            Animated.timing(slideAnim, {
              toValue: -100,
              duration: 300,
              useNativeDriver: true,
            }).start(() => setShowRestored(false));
          }, 3000);
        }
      }
    });

    return () => unsubscribe();
  }, [slideAnim]);

  if (!isOffline && !showRestored) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }], paddingTop: insets.top || 40, backgroundColor: isOffline ? '#161D26' : '#00e482' }]}>
      <Ionicons 
        name={isOffline ? "cloud-offline" : "cloud-done"} 
        size={20} 
        color={isOffline ? "#00e482" : "#161D26"} 
      />
      <Text style={[styles.text, { color: isOffline ? '#FFFFFF' : '#161D26' }]}>
        {isOffline ? 'Working Offline - Your data is safe' : 'Synced with Cloud'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    zIndex: 9999,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
  },
});
