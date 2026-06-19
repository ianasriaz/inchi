import { useFonts } from 'expo-font';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomerSearchScreen from './src/screens/CustomerSearchScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import InvoiceScreen from './src/screens/InvoiceScreen';
import MeasurementScreen from './src/screens/MeasurementScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  CustomerSearch: undefined;
  Measurement: { customerId: number; customerNumber?: number } | undefined;
  Invoice:
    | {
        customerId: number;
        garmentType: string;
        measurements: Record<string, string>;
        styles: Record<string, string>;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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

export default function App() {
  const [fontsLoaded] = useFonts({
    JameelNooriNastaleeqKasheeda: require('./assets/fonts/Jameel Noori Nastaleeq Kasheeda.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={appTheme}>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Dashboard"
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTitleStyle: { color: '#161d26', fontWeight: '800' },
            headerTintColor: '#161d26',
            headerShadowVisible: false,
            contentStyle: { backgroundColor: '#FFFFFF' },
          }}
        >
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
          <Stack.Screen
            name="CustomerSearch"
            component={CustomerSearchScreen}
            options={{ title: 'Customer Search' }}
          />
          <Stack.Screen name="Measurement" component={MeasurementScreen} options={{ title: 'Measurement' }} />
          <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}