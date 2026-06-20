import React, { useEffect, useState } from 'react';
import { useFonts, NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';

import AuthScreen from './src/screens/AuthScreen';
import CustomerSearchScreen from './src/screens/CustomerSearchScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InvoiceScreen from './src/screens/InvoiceScreen';
import RevenueScreen from './src/screens/RevenueScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import MeasurementScreen from './src/screens/MeasurementScreen';
import OfflineBanner from './src/components/OfflineBanner';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  Revenue: undefined;
  CustomerSearch: undefined;
  CustomerProfile: { customerId: number };
  Measurement: { customerId: number; customerNumber?: number; customerName?: string; customerPhone?: string; initialMeasurements?: any; initialGarmentType?: string; initialStyle?: any } | undefined;
  Invoice:
    | {
        customerId: number;
        customerName: string;
        customerPhone: string;
        garmentType: string;
        measurements: Record<string, string>;
        style: { collar: string; pockets: string[] };
        notes: string;
      }
    | undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Customers: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#161d26',
    border: '#161d26',
    primary: '#00e482',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#00e482',
        tabBarInactiveTintColor: 'rgba(22, 29, 38, 0.4)',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(22, 29, 38, 0.08)',
          paddingTop: 8,
          minHeight: 65,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Customers') {
            iconName = focused ? 'people' : 'people-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Bookings' }} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{ title: 'Customers' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [fontsLoaded] = useFonts({
    NotoNastaliqUrdu: NotoNastaliqUrdu_400Regular,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={appTheme}>
        <StatusBar style="dark" />
        <OfflineBanner />
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTitleStyle: { color: '#161d26', fontWeight: '800' },
            headerTintColor: '#161d26',
            headerShadowVisible: false,
            contentStyle: { backgroundColor: '#FFFFFF' },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="Revenue" component={RevenueScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="CustomerSearch"
            component={CustomerSearchScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Measurement" component={MeasurementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}