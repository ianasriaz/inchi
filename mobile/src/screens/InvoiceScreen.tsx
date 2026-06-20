import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function InvoiceScreen({ route, navigation }: any) {
  const { customerId, customerName, customerPhone, garmentType, measurements, style, notes } = route.params;

  const [total, setTotal] = useState('');
  const [advance, setAdvance] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [shopProfile, setShopProfile] = useState<{name: string, phone: string, address: string, logoUrl: string | null} | null>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('shops').select('name, phone, address, logo_url').eq('id', user.id).single();
        if (data) setShopProfile({ name: data.name, phone: data.phone, address: data.address, logoUrl: data.logo_url });
      }
    };
    fetchProfile();
  }, []);

  const totalNum = parseInt(total || '0', 10) || 0;
  const advanceNum = parseInt(advance || '0', 10) || 0;
  const balance = totalNum - advanceNum;

  const bookingDate = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateObj(selectedDate);
      setPickupDate(selectedDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }));
    }
  };

  const handleGenerateOrder = async () => {
    if (!total) {
      Alert.alert('Error', 'Please enter the total amount.');
      return;
    }
    if (!pickupDate) {
      Alert.alert('Notice', 'Please select a pickup date.');
      return;
    }
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Authentication required.');
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        shop_id: user.id,
        customer_id: customerId,
        garment_type: garmentType || 'Kameez Shalwar',
        measurements: measurements,
        style_options: { ...style, notes, bookingDate, pickupDate },
        total_amount: totalNum,
        advance_amount: advanceNum,
        status: 'pending'
      })
      .select('order_number')
      .single();

    setIsLoading(false);

    if (error) {
      Alert.alert('Database Error', 'Could not save the order.');
    } else {
      setOrderNumber(data.order_number.toString());
      setIsGenerated(true);
    }
  };

  // ==========================================
  // HTML TEMPLATES
  // ==========================================
  const customerHtml = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #161D26; padding: 40px; }
          .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #00E482; padding-bottom: 30px; margin-bottom: 40px; }
          .brand-name { font-size: 32px; font-weight: 900; color: #161D26; margin: 0 0 10px 0; letter-spacing: 1px; text-transform: uppercase; }
          .brand-details { font-size: 14px; color: #666; margin: 5px 0; line-height: 1.5; }
          .invoice-title { font-size: 40px; font-weight: 900; color: #E8E8E8; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px; text-align: right; }
          .order-badge { background: #00E482; color: #161D26; padding: 8px 16px; border-radius: 999px; font-weight: bold; font-size: 18px; display: inline-block; float: right; }
          
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 20px; }
          .box { background: #F9F9F9; padding: 25px; border-radius: 12px; border: 1px solid #E8E8E8; flex: 1; }
          .box h4 { margin: 0 0 10px 0; font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
          .box p { margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #161D26; }
          .box .sub-p { font-size: 15px; color: #666; font-weight: normal; }
          
          .measurements-section { margin-bottom: 40px; }
          .section-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #161D26; padding-bottom: 10px; margin-bottom: 20px; }
          .measure-grid { display: flex; flex-wrap: wrap; gap: 15px; }
          .measure-item { width: calc(33.333% - 15px); background: #fff; border: 1px solid #E8E8E8; padding: 15px; border-radius: 8px; text-align: center; }
          .measure-item span { display: block; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
          .measure-item strong { font-size: 20px; color: #161D26; }
          
          .finance-section { border-top: 2px solid #E8E8E8; padding-top: 30px; width: 50%; float: right; }
          .finance-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; color: #666; }
          .finance-row strong { color: #161D26; font-size: 18px; }
          .balance-row { font-size: 20px; font-weight: bold; color: #00E482; background: #161D26; padding: 20px; border-radius: 12px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
          .balance-row .amount { font-size: 28px; }
          
          .footer { text-align: center; margin-top: 150px; padding-top: 20px; border-top: 1px solid #E8E8E8; font-size: 13px; color: #999; clear: both; }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div>
            <h1 class="brand-name">${shopProfile?.name || 'INCHI Tailors'}</h1>
            ${shopProfile?.address ? `<p class="brand-details">${shopProfile.address.replace(/\n/g, '<br/>')}</p>` : ''}
            ${shopProfile?.phone ? `<p class="brand-details">Phone: ${shopProfile.phone}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <h2 class="invoice-title">Invoice</h2>
            <div class="order-badge">Order #${orderNumber}</div>
            <div style="clear: both; margin-top: 15px; font-size: 15px; color: #666; font-weight: 500;">Date: ${bookingDate}</div>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="box">
            <h4>Customer</h4>
            <p>${customerName}</p>
            <p class="sub-p">${customerPhone}</p>
          </div>
          <div class="box">
            <h4>Order Summary</h4>
            <p>${garmentType || 'Kameez Shalwar'}</p>
            <p class="sub-p" style="margin-top: 10px;">Pickup Expected: <strong style="color: #161D26;">${pickupDate}</strong></p>
          </div>
        </div>

        <div class="measurements-section">
          <div class="section-title">Measurements & Style</div>
          <div class="measure-grid">
            ${Object.entries(measurements).map(([key, val]) => `
              <div class="measure-item"><span>${key}</span><strong>${val}</strong></div>
            `).join('')}
          </div>
          <p style="margin-top: 20px; font-size: 15px; color: #666;"><strong>Collar:</strong> ${style.collar} &nbsp;|&nbsp; <strong>Pockets:</strong> ${style.pockets.join(', ')}</p>
          ${notes ? `<p style="font-size: 15px; color: #666; margin-top: 5px;"><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>

        <div class="finance-section">
          <div class="finance-row"><span>Subtotal</span> <strong>Rs. ${totalNum}</strong></div>
          <div class="finance-row"><span>Advance Paid</span> <strong>Rs. ${advanceNum}</strong></div>
          <div class="balance-row">
            <span style="color: #FFFFFF; font-size: 16px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">Balance Due</span> 
            <span class="amount">Rs. ${balance}</span>
          </div>
        </div>
        
        <div class="footer">Thank you for your business. Please present this invoice at the time of pickup.</div>
      </body>
    </html>
  `;

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
          <h1 class="title">${shopProfile?.name || 'MASTER COPY'}</h1>
          <h2>Order #${orderNumber}</h2>
          <h3>${customerName} - ${garmentType || 'Kameez Shalwar'}</h3>
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
    if (!customerPhone) {
      Alert.alert('Error', 'No phone number provided for this customer.');
      return;
    }
    
    let formattedPhone = customerPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '92' + formattedPhone.slice(1);

    const message = `Assalam-o-Alaikum ${customerName},\n\nYour order for ${garmentType || 'Kameez Shalwar'} has been booked.\nPickup Date: *${pickupDate}*\n\nTotal: Rs. ${totalNum}\nAdvance: Rs. ${advanceNum}\n*Balance Due: Rs. ${balance}*\n\nThank you, INCHI Tailors.`;
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp is not installed on this device.'));
  };

  // ==========================================
  // VIEW 1: SUCCESS & ACTIONS VIEW (NATIVE PREVIEW)
  // ==========================================
  if (isGenerated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView style={styles.successScroll} contentContainerStyle={styles.successScrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.successHeader}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitleText}>Booking Saved!</Text>
          </View>

          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptHeaderLeft}>
                <Text style={styles.receiptShopName}>{shopProfile?.name || 'INCHI Tailors'}</Text>
                <Text style={styles.receiptOrderDate}>{bookingDate}</Text>
              </View>
              <View style={styles.receiptHeaderRight}>
                <Text style={styles.receiptOrderLabel}>ORDER</Text>
                <Text style={styles.receiptOrderNumber}>#{orderNumber}</Text>
              </View>
            </View>
            
            <View style={styles.receiptDivider} />

            <View style={styles.receiptCustomerRow}>
              <View style={styles.receiptCol}>
                <Text style={styles.receiptLabel}>Customer</Text>
                <Text style={styles.receiptValue}>{customerName}</Text>
                <Text style={styles.receiptSubValue}>{customerPhone || 'No Phone'}</Text>
              </View>
              <View style={styles.receiptColRight}>
                <Text style={styles.receiptLabel}>Pickup Date</Text>
                <Text style={styles.receiptValueHighlight}>{pickupDate}</Text>
              </View>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptTotalsRow}>
              <Text style={styles.receiptTotalLabel}>Subtotal</Text>
              <Text style={styles.receiptTotalValue}>Rs. {totalNum}</Text>
            </View>
            <View style={styles.receiptTotalsRow}>
              <Text style={styles.receiptTotalLabel}>Advance</Text>
              <Text style={styles.receiptTotalValue}>Rs. {advanceNum}</Text>
            </View>

            <View style={styles.receiptBalanceBox}>
              <Text style={styles.receiptBalanceLabel}>Balance Due</Text>
              <Text style={styles.receiptBalanceAmount}>Rs. {balance}</Text>
            </View>
          </View>

          <Text style={styles.actionsLabel}>Share & Print</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionGridItem} onPress={shareCustomerPDF}>
              <View style={[styles.actionIconBox, { backgroundColor: '#F0F4FF' }]}>
                <Ionicons name="document-text" size={24} color="#4A90E2" />
              </View>
              <Text style={styles.actionGridText}>Share PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionGridItem} onPress={sendDirectWhatsAppText}>
              <View style={[styles.actionIconBox, { backgroundColor: '#E8FDF3' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              </View>
              <Text style={styles.actionGridText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionGridItem} onPress={printStitcherCopy}>
              <View style={[styles.actionIconBox, { backgroundColor: '#FFF4E5' }]}>
                <Ionicons name="print" size={24} color="#FF9500" />
              </View>
              <Text style={styles.actionGridText}>Print Master</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.finishButton} onPress={() => navigation.popToTop()}>
            <Text style={styles.finishButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // VIEW 2: ORIGINAL FINANCE ENTRY VIEW
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#161D26" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleMain}>Invoice & Dates</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.labelEng}>Pickup Date</Text>
              <Text style={styles.labelUrdu}>واپسی کی تاریخ</Text>
            </View>
            <TouchableOpacity 
              style={styles.datePickerButton} 
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={pickupDate ? "#161D26" : "rgba(22,29,38,0.4)"} style={{ marginRight: 10 }} />
              <Text style={[styles.datePickerText, !pickupDate ? { color: 'rgba(22,29,38,0.4)' } : null]}>
                {pickupDate || 'Select Pickup Date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker ? (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.labelEng}>Total Amount</Text>
              <Text style={styles.labelUrdu}>کل رقم</Text>
            </View>
            <View style={styles.currencyInputWrapper}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.currencyInput}
                keyboardType="numeric"
                value={total}
                onChangeText={setTotal}
                placeholder="0"
                placeholderTextColor="rgba(22, 29, 38, 0.3)"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.labelEng}>Advance Paid</Text>
              <Text style={styles.labelUrdu}>ایڈوانس</Text>
            </View>
            <View style={styles.currencyInputWrapper}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.currencyInput}
                keyboardType="numeric"
                value={advance}
                onChangeText={setAdvance}
                placeholder="0"
                placeholderTextColor="rgba(22, 29, 38, 0.3)"
              />
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text style={styles.balanceAmount}>Rs. {balance > 0 ? balance.toString() : '0'}</Text>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardAvoid: { flex: 1, paddingHorizontal: 20 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitleMain: { fontSize: 20, fontWeight: '800', color: '#161D26' },

  formContainer: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  labelEng: { color: '#161D26', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  labelUrdu: { color: 'rgba(22, 29, 38, 0.5)', fontSize: 14, fontFamily: 'NotoNastaliqUrdu' },
  
  datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#F0F0F0' },
  datePickerText: { fontSize: 18, color: '#161D26', fontWeight: '700' },

  currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: '#F0F0F0' },
  currencySymbol: { fontSize: 18, fontWeight: '800', color: '#161D26', marginRight: 8 },
  currencyInput: { flex: 1, paddingVertical: 18, fontSize: 24, color: '#161D26', fontWeight: '800' },
  
  balanceCard: { backgroundColor: '#E8FDF3', padding: 24, borderRadius: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#00e482' },
  balanceLabel: { color: '#00e482', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { color: '#161D26', fontSize: 32, fontWeight: '900' },
  
  saveButton: { backgroundColor: '#00e482', paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginBottom: 10, ...Platform.select({ ios: { shadowColor: '#00e482', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }, android: { elevation: 6 } }) },
  saveButtonText: { color: '#161D26', fontSize: 18, fontWeight: '900' },

  // Success View Styles
  successScroll: { flex: 1, backgroundColor: '#F7F8FA' },
  successScrollContent: { padding: 20, paddingBottom: 60, alignItems: 'center' },
  successHeader: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00e482', justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#00e482', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 }, android: { elevation: 8 } }) },
  successTitleText: { fontSize: 24, fontWeight: '900', color: '#161D26' },

  receiptCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 32, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 }, android: { elevation: 4 } }) },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  receiptHeaderLeft: { flex: 1 },
  receiptShopName: { fontSize: 20, fontWeight: '900', color: '#161D26', marginBottom: 4 },
  receiptOrderDate: { fontSize: 13, fontWeight: '600', color: 'rgba(22, 29, 38, 0.4)' },
  receiptHeaderRight: { alignItems: 'flex-end' },
  receiptOrderLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(22, 29, 38, 0.4)', letterSpacing: 1 },
  receiptOrderNumber: { fontSize: 18, fontWeight: '900', color: '#00e482' },
  
  receiptDivider: { height: 2, backgroundColor: '#F0F0F0', borderStyle: 'dashed', marginVertical: 20 },
  
  receiptCustomerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptCol: { flex: 1 },
  receiptColRight: { flex: 1, alignItems: 'flex-end' },
  receiptLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(22, 29, 38, 0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  receiptValue: { fontSize: 16, fontWeight: '800', color: '#161D26', marginBottom: 4 },
  receiptSubValue: { fontSize: 14, fontWeight: '600', color: 'rgba(22, 29, 38, 0.6)' },
  receiptValueHighlight: { fontSize: 16, fontWeight: '900', color: '#00e482' },

  receiptTotalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptTotalLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(22, 29, 38, 0.6)' },
  receiptTotalValue: { fontSize: 16, fontWeight: '800', color: '#161D26' },

  receiptBalanceBox: { marginTop: 12, backgroundColor: '#E8FDF3', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptBalanceLabel: { fontSize: 14, fontWeight: '800', color: '#00e482', textTransform: 'uppercase', letterSpacing: 1 },
  receiptBalanceAmount: { fontSize: 24, fontWeight: '900', color: '#161D26' },

  actionsLabel: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '800', color: 'rgba(22, 29, 38, 0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  actionGridItem: { alignItems: 'center', width: '30%' },
  actionIconBox: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionGridText: { fontSize: 13, fontWeight: '800', color: '#161D26' },

  finishButton: { width: '100%', backgroundColor: '#E8FDF3', paddingVertical: 18, borderRadius: 24, alignItems: 'center' },
  finishButtonText: { color: '#00e482', fontSize: 16, fontWeight: '900' },
});