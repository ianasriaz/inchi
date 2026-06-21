import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/colors';


// Top 20 Cities in Pakistan for B2C Directory optimization
const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot', 
  'Hyderabad', 'Abbottabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 
  'Larkana', 'Nawabshah', 'Mirpur', 'Gujrat', 'Jhang', 'Other'
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(PAKISTAN_CITIES[0]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchShopDetails();
  }, []);

  const fetchShopDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to fetch shop details:', error);
    } else if (data) {
      setShopName(data.name || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
      if (data.city && PAKISTAN_CITIES.includes(data.city)) {
        setCity(data.city);
      }
      setLogoUrl(data.logo_url || null);
    }
    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('shops')
      .update({
        name: shopName,
        phone: phone,
        address: address,
        city: city,
      })
      .eq('id', userId);

    setIsSaving(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update profile.' });
    } else {
      Toast.show({ type: 'success', text1: 'Success', text2: 'Shop profile updated successfully!' });
    }
  };

  const handlePickLogo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'You need to allow camera roll permissions to upload a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for logos
      quality: 0.5, // Compress to save bandwidth
    });

    if (!result.canceled && result.assets[0].uri) {
      uploadLogo(result.assets[0].uri);
    }
  };

  const uploadLogo = async (uri: string) => {
    if (!userId) return;
    setIsUploading(true);
    try {
      // Create a unique file name
      const fileExt = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // Convert URI to base64 then to ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const arrayBuffer = decode(base64);

      // Upload to Supabase Storage Bucket named 'logos'
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      const publicURL = publicUrlData.publicUrl;

      // Update Shops table with new Logo URL
      const { error: updateError } = await supabase
        .from('shops')
        .update({ logo_url: publicURL })
        .eq('id', userId);

      if (updateError) throw updateError;

      setLogoUrl(publicURL);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Logo uploaded successfully!' });
    } catch (error) {
      console.error('Upload Error: ', error);
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: 'There was an issue uploading your logo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
      <View style={[styles.header, { paddingTop: 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Shop Profile</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoContainer} onPress={handlePickLogo} disabled={isUploading}>
            {isUploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                <Text style={styles.logoPlaceholderText}>Upload Logo</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.hintText}>Tap to change logo</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Shop Name</Text>
          <TextInput
            style={styles.input}
            value={shopName}
            onChangeText={setShopName}
            placeholder="e.g. Al-Madina Tailors"
          />

          <Text style={styles.label}>Business Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 0300 1234567"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Shop Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. Shop 12, Main Bazaar..."
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>City</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={city}
              onValueChange={(itemValue) => setCity(itemValue)}
              style={styles.picker}
              mode="dropdown"
            >
              {PAKISTAN_CITIES.map((c) => (
                <Picker.Item key={c} label={c} value={c} color={colors.text} />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save Profile</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.text} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
          <Ionicons name="log-out-outline" size={20} color="#E53935" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { paddingHorizontal: 20, paddingTop: 20, backgroundColor: colors.white, flexGrow: 1, paddingBottom: 40 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(22, 29, 38, 0.05)' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'NotoNastaliqUrdu', color: colors.textOpacity(0.5), fontSize: 15, marginTop: -4 },
  
  logoSection: { alignItems: 'center', marginBottom: 30 },
  logoContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  logoImage: { width: 120, height: 120, borderRadius: 60, resizeMode: 'cover' },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  logoPlaceholderText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  hintText: { marginTop: 12, fontSize: 13, color: colors.textOpacity(0.6), fontWeight: '600' },

  formGroup: { gap: 12, marginBottom: 56 },
  label: { fontSize: 15, fontWeight: '800', color: colors.text, marginLeft: 4, marginTop: 8 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 16, paddingHorizontal: 16, height: 56,
    fontSize: 16, color: colors.text,
    fontWeight: '600',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 16, paddingBottom: 16 },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16, overflow: 'hidden', height: 56, justifyContent: 'center'
  },
  picker: { width: '100%', height: 56 },

  saveButton: {
    backgroundColor: colors.primary,
    height: 60, borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 30,
  },
  saveButtonText: { color: colors.text, fontSize: 16, fontWeight: '800' },

  divider: { height: 1, backgroundColor: 'rgba(22, 29, 38, 0.05)', marginBottom: 30 },

  logoutButton: {
    backgroundColor: '#FFF5F5',
    height: 60, borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  logoutButtonText: { color: '#E53935', fontSize: 15, fontWeight: '800' },
});
