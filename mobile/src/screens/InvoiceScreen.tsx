import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ViewShot from 'react-native-view-shot';
import { colors } from '../theme/colors';


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
  const [shopProfile, setShopProfile] = useState<{ name: string, phone: string, address: string, logoUrl: string | null } | null>(null);
  const viewShotRef = React.useRef<any>(null);

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
  const urduLabels: Record<string, string> = {
    length: 'لمبائی',
    chest: 'چھاتی',
    waist: 'کمر',
    hips: 'ہپس',
    shoulder: 'تیرا',
    sleeve: 'بازو',
    collar: 'کالر',
    shalwarLength: 'شلوار',
    pancha: 'پانچہ',
  };

  const getUrduLabel = (key: string) => urduLabels[key] || '';

  const customerHtml = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
          
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; padding: 20px; max-width: 800px; margin: 0 auto; border: 1px solid #ccc; }
          
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .shop-name-urdu { font-family: 'Noto Nastaliq Urdu', serif; font-size: 36px; font-weight: bold; margin: 0; line-height: 1.5; }
          .shop-name-eng { font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 5px 0; letter-spacing: 2px; }
          .shop-contact { font-size: 14px; margin: 5px 0; color: #333; }
          
          .invoice-title { text-align: center; font-size: 20px; font-weight: bold; margin: -10px auto 20px auto; background: #000; color: #fff; padding: 5px 15px; border-radius: 4px; display: inline-block; position: relative; top: -10px; border: 2px solid #fff; outline: 1px solid #000; }
          
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 15px; }
          .meta-col { width: 48%; }
          .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding: 6px 0; }
          .urdu-label { font-family: 'Noto Nastaliq Urdu', serif; font-size: 14px; }
          
          .measurements-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #000; }
          .measurements-table th, .measurements-table td { border: 1px solid #000; padding: 10px; text-align: center; }
          .measurements-table th { background: #f0f0f0; font-size: 14px; text-transform: uppercase; }
          .measure-val { font-size: 18px; font-weight: bold; }
          .measure-title { font-size: 12px; color: #555; text-transform: uppercase; }
          
          .style-box { border: 1px solid #000; padding: 15px; margin-bottom: 20px; font-size: 15px; }
          
          .finance-box { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; width: 60%; float: right; background: #fafafa; border-radius: 4px; }
          .finance-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 16px; }
          .finance-row.total { font-weight: bold; font-size: 18px; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 5px; }
          .finance-row.balance { font-size: 22px; font-weight: bold; color: #000; background: #e8e8e8; padding: 10px; border: 1px solid #ccc; margin-top: 10px; border-radius: 4px; }
          
          .footer-policy { clear: both; text-align: center; margin-top: 40px; padding-top: 10px; border-top: 1px solid #000; font-family: 'Noto Nastaliq Urdu', serif; font-size: 16px; line-height: 1.8; }
          .footer-policy-eng { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; margin-top: 5px; color: #555; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name-urdu">${shopProfile?.name || 'انچی ٹیلرز'}</h1>
          <h2 class="shop-name-eng">${shopProfile?.name || 'INCHI TAILORS'}</h2>
          ${shopProfile?.address ? `<p class="shop-contact">${shopProfile.address.replace(/\n/g, ', ')}</p>` : ''}
          ${shopProfile?.phone ? `<p class="shop-contact">Ph: ${shopProfile.phone}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 24px; font-weight: bold; background: #000; color: #fff; padding: 5px 15px; border-radius: 4px; display: inline-block;">Order No. #${orderNumber}</div>
        </div>

        <div style="border: 1px solid #ccc; margin-bottom: 20px; border-radius: 4px;">
          <div style="background: #f8f8f8; padding: 10px 15px; border-bottom: 1px solid #ccc; font-size: 20px; font-weight: bold; text-transform: uppercase;">
            <span style="color: #555; font-size: 14px; text-transform: none; font-weight: normal; margin-right: 5px;">Customer Name <span class="urdu-label">(نام)</span>:</span> ${customerName}
          </div>
          <div style="display: flex; flex-wrap: wrap; padding: 10px 15px; font-size: 15px;">
            <div style="width: 50%; margin-bottom: 8px;"><strong>Booking <span class="urdu-label" style="font-size: 14px; font-weight: normal;">(تاریخ)</span>:</strong> ${bookingDate}</div>
            <div style="width: 50%; margin-bottom: 8px;"><strong>Delivery <span class="urdu-label" style="font-size: 14px; font-weight: normal;">(واپسی)</span>:</strong> ${pickupDate}</div>
            <div style="width: 50%;"><strong>Garment <span class="urdu-label" style="font-size: 14px; font-weight: normal;">(سوٹ)</span>:</strong> ${garmentType || 'Kameez Shalwar'}</div>
            <div style="width: 50%;"><strong>Phone <span class="urdu-label" style="font-size: 14px; font-weight: normal;">(فون)</span>:</strong> ${customerPhone || '-'}</div>
          </div>
        </div>
        
        <table class="measurements-table">
          <tr>
            <th colspan="3" style="font-size: 16px;">Measurements <span class="urdu-label" style="font-size: 18px; margin-left: 10px;">(ناپ)</span></th>
          </tr>
          ${Object.entries(measurements).reduce((acc: any[], [key, val], index) => {
    if (index % 3 === 0) acc.push([]);
    acc[acc.length - 1].push({ key, val });
    return acc;
  }, []).map((row: any[]) => `
              <tr>
                ${row.map(item => `
                  <td>
                    <div class="measure-title">${item.key} <span class="urdu-label">(${getUrduLabel(item.key)})</span></div>
                    <div class="measure-val">${item.val}</div>
                  </td>
                `).join('')}
                ${Array(3 - row.length).fill('<td></td>').join('')}
              </tr>
            `).join('')
    }
        </table>
        
        <div class="style-box">
          <strong>Collar <span class="urdu-label">(کالر)</span>:</strong> ${style.collar} &nbsp;&nbsp;|&nbsp;&nbsp; 
          <strong>Pockets <span class="urdu-label">(جیب)</span>:</strong> ${style.pockets.join(', ')}
          ${notes ? `<br/><br/><strong>Notes <span class="urdu-label">(ہدایات)</span>:</strong> ${notes}` : ''}
        </div>
        
        <div class="finance-box">
          <div class="finance-row"><span>Subtotal <span class="urdu-label">(کل رقم)</span></span> <span>Rs. ${totalNum}</span></div>
          <div class="finance-row"><span>Advance Paid <span class="urdu-label">(پیشگی)</span></span> <span>Rs. ${advanceNum}</span></div>
          <div class="finance-row balance"><span>Balance Due <span class="urdu-label">(بقایا)</span></span> <span>Rs. ${balance}</span></div>
        </div>
        
        <div class="footer-policy">
          کپڑے وصول کرتے وقت رسید ہمراہ لائیں۔ بغیر رسید کپڑے نہیں ملیں گے۔<br/>
          سلائی کی شکایت 7 دن کے اندر دور کی جائے گی۔
          <div class="footer-policy-eng">Please bring this slip at the time of pickup. Any stitching complaints must be reported within 7 days.</div>
        </div>
      </body>
    </html>
  `;

  const stitcherHtml = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; padding: 20px; }
          .header { text-align: center; border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 32px; font-weight: bold; margin: 0; text-transform: uppercase; }
          .meta-text { font-size: 24px; font-weight: bold; margin: 10px 0; text-align: center; }
          .urdu-label { font-family: 'Noto Nastaliq Urdu', serif; }
          .measurements-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 3px solid #000; }
          .measurements-table th, .measurements-table td { border: 2px solid #000; padding: 15px; text-align: center; }
          .measure-val { font-size: 42px; font-weight: bold; }
          .measure-title { font-size: 20px; color: #333; text-transform: uppercase; font-weight: bold; }
          .styles-box { border: 3px solid #000; padding: 20px; margin-top: 20px; border-radius: 8px; font-size: 24px; font-weight: bold; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">MASTER COPY &nbsp;|&nbsp; <span class="urdu-label">ماسٹر کاپی</span></h1>
          <div class="meta-text">Order #${orderNumber} &nbsp;&nbsp;|&nbsp;&nbsp; Customer: ${customerName}</div>
        </div>
        
        <table class="measurements-table">
          ${Object.entries(measurements).reduce((acc: any[], [key, val], index) => {
    if (index % 2 === 0) acc.push([]);
    acc[acc.length - 1].push({ key, val });
    return acc;
  }, []).map((row: any[]) => `
              <tr>
                ${row.map(item => `
                  <td>
                    <div class="measure-title">${item.key} <span class="urdu-label">(${getUrduLabel(item.key)})</span></div>
                    <div class="measure-val">${item.val}</div>
                  </td>
                `).join('')}
                ${Array(2 - row.length).fill('<td></td>').join('')}
              </tr>
            `).join('')
    }
        </table>
        
        <div class="styles-box">
          Collar <span class="urdu-label">(کالر)</span>: ${style.collar}<br/>
          Pockets <span class="urdu-label">(جیب)</span>: ${style.pockets.join(', ')}
          ${notes ? `<br/><br/>Notes <span class="urdu-label">(ہدایات)</span>: <span class="urdu-label">${notes}</span>` : ''}
        </div>
      </body>
    </html>
  `;

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  const shareCustomerImage = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, { UTI: 'public.jpeg', mimeType: 'image/jpeg' });
      } else {
        Alert.alert('Error', 'Image view not ready');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not generate image.');
    }
  };

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
              <Ionicons name="checkmark" size={40} color={colors.white} />
            </View>
            <Text style={styles.successTitleText}>Booking Saved!</Text>
          </View>

          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={styles.nativeRaseedContainer}>
            <View style={styles.raseedHeader}>
              <Text style={styles.raseedShopNameUrdu}>{shopProfile?.name || 'انچی ٹیلرز'}</Text>
              {shopProfile?.address && <Text style={styles.raseedContact}>{shopProfile.address.replace(/\n/g, ', ')}</Text>}
              {shopProfile?.phone && <Text style={styles.raseedContact}>Ph: {shopProfile.phone}</Text>}
            </View>

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Order No. #{orderNumber}</Text>
              </View>
            </View>

            <View style={{ borderWidth: 1, borderColor: '#ccc', marginBottom: 16, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#f8f8f8', padding: 12, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#555', marginRight: 6 }}>Customer Name <Text style={styles.urduFont}>(نام)</Text>:</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' }}>{customerName}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12 }}>
                <View style={{ width: '50%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Booking <Text style={styles.urduFont}>(تاریخ)</Text></Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{bookingDate}</Text>
                </View>
                <View style={{ width: '50%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Delivery <Text style={styles.urduFont}>(واپسی)</Text></Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{pickupDate}</Text>
                </View>
                <View style={{ width: '50%' }}>
                  <Text style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Garment <Text style={styles.urduFont}>(سوٹ)</Text></Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{garmentType || 'Kameez Shalwar'}</Text>
                </View>
                <View style={{ width: '50%' }}>
                  <Text style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Phone <Text style={styles.urduFont}>(فون)</Text></Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{customerPhone || '-'}</Text>
                </View>
              </View>
            </View>


            <View style={styles.raseedFinanceBox}>
              <View style={styles.raseedFinanceRow}><Text style={styles.raseedFinanceLabel}>Subtotal <Text style={styles.urduFont}>(کل رقم)</Text></Text><Text style={styles.raseedFinanceValue}>Rs. {totalNum}</Text></View>
              <View style={styles.raseedFinanceRow}><Text style={styles.raseedFinanceLabel}>Advance <Text style={styles.urduFont}>(پیشگی)</Text></Text><Text style={styles.raseedFinanceValue}>Rs. {advanceNum}</Text></View>
              <View style={[styles.raseedFinanceRow, styles.raseedFinanceBalanceRow]}><Text style={[styles.raseedFinanceLabel, { fontWeight: 'bold', color: '#000' }]}>Balance <Text style={styles.urduFont}>(بقایا)</Text></Text><Text style={styles.raseedFinanceBalanceValue}>Rs. {balance}</Text></View>
            </View>

            <View style={styles.raseedFooter}>
              <Text style={styles.raseedFooterUrdu}>کپڑے وصول کرتے وقت رسید ہمراہ لائیں۔ بغیر رسید کپڑے نہیں ملیں گے۔</Text>
              <Text style={styles.raseedFooterUrdu}>سلائی کی شکایت 7 دن کے اندر دور کی جائے گی۔</Text>
            </View>
          </ViewShot>

          <Text style={styles.actionsLabel}>Share & Print</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionGridItem} onPress={shareCustomerImage}>
              <View style={[styles.actionIconBox, { backgroundColor: '#F0F4FF' }]}>
                <Ionicons name="image" size={24} color="#4A90E2" />
              </View>
              <Text style={styles.actionGridText}>Share Image</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionGridItem} onPress={sendDirectWhatsAppText}>
              <View style={[styles.actionIconBox, { backgroundColor: colors.primaryLight }]}>
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
            <Ionicons name="arrow-back" size={28} color={colors.text} />
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
              <Ionicons name="calendar-outline" size={20} color={pickupDate ? colors.text : colors.textOpacity(0.4)} style={{ marginRight: 10 }} />
              <Text style={[styles.datePickerText, !pickupDate ? { color: colors.textOpacity(0.4) } : null]}>
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
                placeholderTextColor={colors.textOpacity(0.3)}
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
                placeholderTextColor={colors.textOpacity(0.3)}
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
              <ActivityIndicator color={colors.text} />
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
  safeArea: { flex: 1, backgroundColor: colors.white },
  keyboardAvoid: { flex: 1, paddingHorizontal: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitleMain: { fontSize: 20, fontWeight: '800', color: colors.text },

  formContainer: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  labelEng: { color: colors.text, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  labelUrdu: { color: colors.textOpacity(0.5), fontSize: 14, fontFamily: 'NotoNastaliqUrdu' },

  datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border },
  datePickerText: { fontSize: 18, color: colors.text, fontWeight: '700' },

  currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.border },
  currencySymbol: { fontSize: 18, fontWeight: '800', color: colors.text, marginRight: 8 },
  currencyInput: { flex: 1, paddingVertical: 18, fontSize: 24, color: colors.text, fontWeight: '800' },

  balanceCard: { backgroundColor: colors.primaryLight, padding: 24, borderRadius: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  balanceLabel: { color: colors.primary, fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { color: colors.text, fontSize: 32, fontWeight: '900' },

  saveButton: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginBottom: 10, ...Platform.select({ ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }, android: { elevation: 6 } }) },
  saveButtonText: { color: colors.text, fontSize: 18, fontWeight: '900' },

  // Success View Styles
  successScroll: { flex: 1, backgroundColor: colors.surface },
  successScrollContent: { padding: 20, paddingBottom: 60, alignItems: 'center' },
  successHeader: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...Platform.select({ ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 }, android: { elevation: 8 } }) },
  successTitleText: { fontSize: 24, fontWeight: '900', color: colors.text },

  receiptCard: { width: '100%', backgroundColor: colors.white, borderRadius: 24, padding: 24, marginBottom: 32, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 }, android: { elevation: 4 } }) },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  receiptHeaderLeft: { flex: 1 },
  receiptShopName: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 4 },
  receiptOrderDate: { fontSize: 13, fontWeight: '600', color: colors.textOpacity(0.4) },
  receiptHeaderRight: { alignItems: 'flex-end' },
  receiptOrderLabel: { fontSize: 11, fontWeight: '800', color: colors.textOpacity(0.4), letterSpacing: 1 },
  receiptOrderNumber: { fontSize: 18, fontWeight: '900', color: colors.primary },

  receiptDivider: { height: 2, backgroundColor: colors.border, borderStyle: 'dashed', marginVertical: 20 },

  receiptCustomerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptCol: { flex: 1 },
  receiptColRight: { flex: 1, alignItems: 'flex-end' },
  receiptLabel: { fontSize: 12, fontWeight: '700', color: colors.textOpacity(0.4), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  receiptValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
  receiptSubValue: { fontSize: 14, fontWeight: '600', color: colors.textOpacity(0.6) },
  receiptValueHighlight: { fontSize: 16, fontWeight: '900', color: colors.primary },

  receiptTotalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptTotalLabel: { fontSize: 15, fontWeight: '600', color: colors.textOpacity(0.6) },
  receiptTotalValue: { fontSize: 16, fontWeight: '800', color: colors.text },

  receiptBalanceBox: { marginTop: 12, backgroundColor: colors.primaryLight, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptBalanceLabel: { fontSize: 14, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  receiptBalanceAmount: { fontSize: 24, fontWeight: '900', color: colors.text },

  actionsLabel: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '800', color: colors.textOpacity(0.4), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  actionGridItem: { alignItems: 'center', width: '30%' },
  actionIconBox: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionGridText: { fontSize: 13, fontWeight: '800', color: colors.text },

  finishButton: { width: '100%', backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 24, alignItems: 'center' },
  finishButtonText: { color: colors.text, fontSize: 16, fontWeight: '900' },

  // Native Raseed Styles
  nativeRaseedContainer: { width: '100%', backgroundColor: colors.white, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#ccc', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 }, android: { elevation: 4 } }) },
  urduFont: { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal' },
  raseedHeader: { alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#000', paddingBottom: 25, marginBottom: 15 },
  raseedShopNameUrdu: { fontFamily: 'NotoNastaliqUrdu', fontSize: 28, color: '#000', textAlign: 'center' },
  raseedShopNameEng: { fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, color: '#000', marginTop: 0, textAlign: 'center' },
  raseedContact: { fontSize: 12, color: '#333', marginTop: 4, textAlign: 'center' },

  raseedTitleBox: { alignSelf: 'center', backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 4, marginTop: -28, marginBottom: 20, borderWidth: 2, borderColor: '#fff' },
  raseedTitleText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  raseedMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  raseedMetaBox: { width: '48%', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 4 },
  raseedMetaLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', marginBottom: 4 },
  raseedMetaValue: { fontSize: 15, color: '#000', fontWeight: 'bold' },

  raseedTable: { width: '100%', borderWidth: 2, borderColor: '#000', marginBottom: 20 },
  raseedTableHeader: { backgroundColor: colors.border, borderBottomWidth: 1, borderBottomColor: '#000', paddingVertical: 8, alignItems: 'center' },
  raseedTableHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#000', textTransform: 'uppercase' },
  raseedTableGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  raseedTableCell: { width: '33.33%', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#000', padding: 8, alignItems: 'center' },
  raseedTableKey: { fontSize: 10, color: '#555', textTransform: 'uppercase', textAlign: 'center' },
  raseedTableVal: { fontSize: 16, fontWeight: 'bold', color: '#000', marginTop: 4 },

  raseedStyleBox: { borderWidth: 1, borderColor: '#000', padding: 12, marginBottom: 20 },
  raseedStyleText: { fontSize: 13, color: '#000' },

  raseedFinanceBox: { alignSelf: 'flex-end', width: '70%', borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 20, backgroundColor: '#fafafa', borderRadius: 4 },
  raseedFinanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  raseedFinanceLabel: { fontSize: 13, color: '#000' },
  raseedFinanceValue: { fontSize: 14, color: '#000' },
  raseedFinanceBalanceRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#e8e8e8', paddingHorizontal: 8, paddingBottom: 4, borderRadius: 4 },
  raseedFinanceBalanceValue: { fontSize: 18, fontWeight: 'bold', color: '#000' },

  raseedFooter: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 10 },
  raseedFooterUrdu: { fontFamily: 'NotoNastaliqUrdu', fontSize: 12, color: '#000', textAlign: 'center' },
  raseedFooterEng: { fontSize: 10, color: '#555', marginTop: 4, textAlign: 'center' },
});