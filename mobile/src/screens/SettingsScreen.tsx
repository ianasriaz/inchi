import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// Top 20 Cities in Pakistan for B2C Directory optimization
const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot', 
  'Hyderabad', 'Abbottabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 
  'Larkana', 'Nawabshah', 'Mirpur', 'Gujrat', 'Jhang', 'Other'
];

export default function SettingsScreen() {
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
      Alert.alert('Error', 'Failed to update profile.');
    } else {
      Alert.alert('Success', 'Shop profile updated successfully!');
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
      Alert.alert('Success', 'Logo uploaded successfully!');
    } catch (error) {
      console.error('Upload Error: ', error);
      Alert.alert('Upload Failed', 'There was an issue uploading your logo.');
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
        <ActivityIndicator size="large" color="#00e482" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Shop Profile</Text>
          <Text style={styles.headerSubtitle}>پروفائل</Text>
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoContainer} onPress={handlePickLogo} disabled={isUploading}>
            {isUploading ? (
              <ActivityIndicator color="#00e482" />
            ) : logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#00e482" />
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
            >
              {PAKISTAN_CITIES.map((c) => (
                <Picker.Item key={c} label={c} value={c} color="#161d26" />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color="#161d26" /> : <Text style={styles.saveButtonText}>Save Profile</Text>}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out / Change Key</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { padding: 20, backgroundColor: '#FFFFFF', flexGrow: 1, paddingBottom: 40 },
  headerContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 30 },
  headerTitle: { color: '#161d26', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'NotoNastaliqUrdu', color: 'rgba(22, 29, 38, 0.5)', fontSize: 22, fontWeight: '400', lineHeight: 34, paddingTop: 6 },
  
  logoSection: { alignItems: 'center', marginBottom: 30 },
  logoContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  logoImage: { width: 120, height: 120, borderRadius: 60, resizeMode: 'cover' },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  logoPlaceholderText: { color: '#161d26', fontWeight: '800', fontSize: 13 },
  hintText: { marginTop: 12, fontSize: 13, color: 'rgba(22, 29, 38, 0.6)', fontWeight: '600' },

  formGroup: { gap: 16, marginBottom: 40 },
  label: { fontSize: 15, fontWeight: '800', color: '#161d26', marginLeft: 4 },
  input: {
    backgroundColor: '#F7F8FA',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 16, color: '#161d26',
    fontWeight: '600',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 16 },
  pickerContainer: {
    backgroundColor: '#F7F8FA',
    borderRadius: 16, overflow: 'hidden',
  },
  picker: { width: '100%', height: 55 },

  saveButton: {
    backgroundColor: '#00e482',
    paddingVertical: 18, borderRadius: 24,
    alignItems: 'center', marginBottom: 30,
    ...Platform.select({
      ios: { shadowColor: '#00e482', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  saveButtonText: { color: '#161d26', fontSize: 16, fontWeight: '800' },

  divider: { height: 1, backgroundColor: 'rgba(22, 29, 38, 0.08)', marginBottom: 30 },

  logoutButton: {
    backgroundColor: '#FFF5F5',
    paddingVertical: 16, borderRadius: 20,
    alignItems: 'center',
  },
  logoutButtonText: { color: '#E53935', fontSize: 15, fontWeight: '800' },
});
