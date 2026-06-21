import React, { useEffect, useState } from 'react';
import { useFonts, NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } from '@expo-google-fonts/noto-nastaliq-urdu';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
import GarmentSelectScreen from './src/screens/GarmentSelectScreen';
import NewCustomerPromptScreen from './src/screens/NewCustomerPromptScreen';
import Toast from 'react-native-toast-message';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  Revenue: undefined;
  GarmentSelect: undefined;
  NewCustomerPrompt: {
    garmentType: string;
    measurements: Record<string, string>;
    style: { collar: string; pockets: string[] };
    notes: string;
  };
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

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
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#00e482',
        tabBarInactiveTintColor: 'rgba(22, 29, 38, 0.4)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginTop: 4,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#161D26',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.03,
          shadowRadius: 20,
          minHeight: 65 + Math.max(insets.bottom, 12),
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom + 8, 28),
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'storefront' : 'storefront-outline'; // Represents the Dukaan (Shop)
          } else if (route.name === 'Orders') {
            iconName = focused ? 'book' : 'book-outline'; // Represents the Register/Khata
          } else if (route.name === 'Customers') {
            iconName = focused ? 'people' : 'people-outline'; // Represents Gahak (Customers)
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
    NotoNastaliqUrduBold: NotoNastaliqUrdu_700Bold,
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
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AuthScreen />
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
      <NavigationContainer theme={appTheme}>
        <StatusBar style="dark" />
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
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Revenue" component={RevenueScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="CustomerSearch"
            component={CustomerSearchScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Measurement" component={MeasurementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="GarmentSelect" component={GarmentSelectScreen} options={{ headerShown: false }} />
          <Stack.Screen name="NewCustomerPrompt" component={NewCustomerPromptScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
    </QueryClientProvider>
  );
}