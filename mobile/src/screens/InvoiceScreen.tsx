import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InvoiceScreen({ route, navigation }: any) {
  const { customerId, customerName, customerPhone, garmentType, measurements, style, notes } = route.params;

  const [total, setTotal] = useState('');
  const [advance, setAdvance] = useState('');
  const [pickupDate, setPickupDate] = useState(''); // New State for Pickup Date
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const totalNum = parseInt(total || '0', 10);
  const advanceNum = parseInt(advance || '0', 10);
  const balance = totalNum - advanceNum;

  // Auto-generate today's date
  const bookingDate = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleGenerateOrder = async () => {
    if (!total) {
      Alert.alert('Error', 'Please enter the total amount.');
      return;
    }
    if (!pickupDate) {
      Alert.alert('Notice', 'Please enter a pickup date or day.');
      return;
    }
    setIsLoading(true);

    const { error } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        garment_type: garmentType || 'Kameez Shalwar',
        measurements: measurements,
        // Bundle the dates into JSONB so we don't break the database schema
        style_options: { ...style, notes, bookingDate, pickupDate },
        total_amount: totalNum,
        advance_amount: advanceNum,
        status: 'pending'
      });

    setIsLoading(false);

    if (error) {
      Alert.alert('Database Error', 'Could not save the order.');
    } else {
      setIsGenerated(true);
    }
  };

  // ==========================================
  // HTML TEMPLATES
  // ==========================================
  const measurementRows = Object.entries(measurements)
    .map(([key, val]) => `<tr><td style="text-transform: capitalize;">${key}</td><td><b>${val}</b></td></tr>`)
    .join('');

  // 1. Customer Invoice
  const customerHtml = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #161D26; padding: 40px; }
          .header { text-align: center; border-bottom: 3px solid #00E482; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 40px; font-weight: bold; color: #161D26; margin: 0; letter-spacing: 2px; }
          .sub-brand { font-size: 16px; color: #666; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .box { background: #F9F9F9; padding: 15px; border-radius: 8px; border: 1px solid #E8E8E8; width: 45%; }
          .box h4 { margin: 0 0 5px 0; font-size: 12px; color: #999; text-transform: uppercase; }
          .box p { margin: 0; font-size: 16px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #161D26; color: #FFFFFF; text-align: left; padding: 12px; }
          td { border-bottom: 1px solid #E8E8E8; padding: 12px; }
          .finance-section { margin-top: 40px; border-top: 2px solid #E8E8E8; padding-top: 20px; }
          .finance-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 18px; }
          .balance-row { font-size: 24px; font-weight: bold; color: #00E482; background: #161D26; padding: 15px; border-radius: 8px; margin-top: 10px;}
          .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="brand">INCHI</h1>
          <div class="sub-brand">Customer Receipt</div>
        </div>
        <div class="info-row">
          <div class="box">
            <h4>Customer</h4>
            <p>${customerName}</p>
            <p style="font-size: 14px; color: #666; font-weight: normal;">${customerPhone}</p>
          </div>
          <div class="box">
            <h4>Order Details</h4>
            <p>${garmentType || 'Kameez Shalwar'}</p>
            <p style="font-size: 14px; color: #666; font-weight: normal; margin-top: 5px;">Booked: ${bookingDate}</p>
            <p style="font-size: 16px; color: #161D26; font-weight: bold; margin-top: 5px;">Pickup: ${pickupDate}</p>
          </div>
        </div>
        <div class="finance-section">
          <div class="finance-row"><span>Total Amount:</span> <span>Rs. ${totalNum}</span></div>
          <div class="finance-row"><span>Advance Paid:</span> <span>Rs. ${advanceNum}</span></div>
          <div class="finance-row balance-row">
            <span style="color: #FFFFFF;">Balance Due:</span> 
            <span>Rs. ${balance}</span>
          </div>
        </div>
        <div class="footer">Thank you for choosing us! Please bring this receipt when collecting your order.</div>
      </body>
    </html>
  `;

  // 2. Stitcher/Master Copy
  const stitcherHtml = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; padding: 20px; }
          .header { text-align: center; border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 32px; font-weight: bold; margin: 0; text-transform: uppercase; }
          .grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
          .measure-box { width: 45%; border: 2px solid #000; margin-bottom: 15px; padding: 15px; text-align: center; border-radius: 8px; }
          .measure-box span { display: block; font-size: 18px; color: #555; text-transform: capitalize; margin-bottom: 5px; }
          .measure-box strong { font-size: 36px; }
          .styles-box { border: 2px solid #000; padding: 20px; margin-top: 20px; border-radius: 8px; }
          .styles-box h3 { margin-top: 0; font-size: 24px; text-decoration: underline; }
          .styles-box p { font-size: 22px; font-weight: bold; margin: 10px 0; }
          .dates { font-size: 18px; text-align: center; margin-top: 5px; color: #333; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">MASTER COPY</h1>
          <h2>${customerName} - ${garmentType || 'Kameez Shalwar'}</h2>
          <div class="dates">Booked: ${bookingDate} | <strong style="color:#000;">Pickup: ${pickupDate}</strong></div>
        </div>
        <div class="grid">
          ${Object.entries(measurements).map(([key, val]) => `
            <div class="measure-box"><span>${key}</span><strong>${val}</strong></div>
          `).join('')}
        </div>
        <div class="styles-box">
          <h3>Styles & Instructions</h3>
          <p>Collar: ${style.collar}</p>
          <p>Pockets: ${style.pockets.join(', ')}</p>
          ${notes ? `<p>NOTES: ${notes}</p>` : ''}
        </div>
      </body>
    </html>
  `;

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  const shareCustomerPDF = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: customerHtml });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Could not generate PDF.');
    }
  };

  const printStitcherCopy = async () => {
    try {
      await Print.printAsync({ html: stitcherHtml });
    } catch (error) {
      Alert.alert('Error', 'Could not open print preview.');
    }
  };

  const sendDirectWhatsAppText = () => {
    if (!customerPhone) return Alert.alert('Error', 'No phone number provided for this customer.');
    
    let formattedPhone = customerPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '92' + formattedPhone.slice(1);

    const message = `Assalam-o-Alaikum ${customerName},\n\nYour order for ${garmentType || 'Kameez Shalwar'} has been booked.\nPickup Date: *${pickupDate}*\n\nTotal: Rs. ${totalNum}\nAdvance: Rs. ${advanceNum}\n*Balance Due: Rs. ${balance}*\n\nThank you, INCHI Tailors.`;
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp is not installed on this device.'));
  };

  // ==========================================
  // VIEW 1: SUCCESS & ACTIONS VIEW
  // ==========================================
  if (isGenerated) {
    return (
      <View style={[styles.container, { justifyContent: 'center', padding: 20 }]}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={styles.successCircle}>
            <Text style={{ fontSize: 40 }}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Order Created!</Text>
        </View>

        <Text style={styles.sectionLabel}>Customer Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#161D26' }]} onPress={shareCustomerPDF}>
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>📄 Share PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#25D366' }]} onPress={sendDirectWhatsAppText}>
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>💬 Quick WA</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Workshop Actions</Text>
        <TouchableOpacity style={styles.printButton} onPress={printStitcherCopy}>
          <Text style={styles.printButtonText}>🖨️ Preview & Print Stitcher Copy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeButton} onPress={() => navigation.popToTop()}>
          <Text style={styles.homeButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // VIEW 2: ORIGINAL FINANCE ENTRY VIEW
  // ==========================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={styles.headerTitle}>Finance & Dates / بل اور تاریخ</Text>

          <Text style={styles.label}>Pickup Date / واپسی کی تاریخ</Text>
          <TextInput
            style={styles.input}
            value={pickupDate}
            onChangeText={setPickupDate}
            placeholder="e.g., 25 Oct or Next Friday"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Total Amount / کل رقم</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={total}
            onChangeText={setTotal}
            placeholder="Rs. 0"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Advance Paid / ایڈوانس</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={advance}
            onChangeText={setAdvance}
            placeholder="Rs. 0"
            placeholderTextColor="#aaa"
          />

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Balance Due / بقایا</Text>
            <Text style={styles.balanceAmount}>Rs. {balance > 0 ? balance : 0}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleGenerateOrder} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#161d26" />
          ) : (
            <Text style={styles.saveButtonText}>Confirm & Save Order</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFFFFF', padding: 20 },
  formContainer: { flex: 1, marginTop: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#161D26', marginBottom: 20, fontFamily: 'Jameel Noori Nastaleeq Kasheeda' },
  label: { color: '#161D26', fontSize: 16, marginBottom: 8, fontWeight: '600', fontFamily: 'Jameel Noori Nastaleeq Kasheeda' },
  input: { borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 8, padding: 15, fontSize: 18, color: '#161D26', marginBottom: 20, backgroundColor: '#F9F9F9' },
  balanceCard: { backgroundColor: '#161D26', padding: 20, borderRadius: 12, marginTop: 10, marginBottom: 20, alignItems: 'center' },
  balanceLabel: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Jameel Noori Nastaleeq Kasheeda' },
  balanceAmount: { color: '#00E482', fontSize: 36, fontWeight: 'bold', marginTop: 5 },
  saveButton: { backgroundColor: '#00E482', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  saveButtonText: { color: '#161D26', fontSize: 20, fontWeight: 'bold', fontFamily: 'Jameel Noori Nastaleeq Kasheeda' },
  
  // Success View Styles
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00E482', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#161D26' },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 10, marginTop: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionButton: { width: '48%', padding: 18, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { fontSize: 16, fontWeight: 'bold' },
  printButton: { backgroundColor: '#F9F9F9', borderWidth: 2, borderColor: '#161D26', width: '100%', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  printButtonText: { color: '#161D26', fontSize: 16, fontWeight: 'bold' },
  homeButton: { backgroundColor: '#FFFFFF', width: '100%', padding: 18, borderRadius: 12, alignItems: 'center' },
  homeButtonText: { color: '#666', fontSize: 16, fontWeight: '600' }
});