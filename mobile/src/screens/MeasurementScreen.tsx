import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Platform, KeyboardAvoidingView, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TailorNumPad from '../components/TailorNumPad';
import { containsUrdu } from '../utils/textUtils';

const MEASUREMENTS = [
  { id: 'length', label: 'Length / لمبائی', icon: 'arrow-down-outline' },
  { id: 'shoulder', label: 'Shoulder / تیرا', icon: 'git-commit-outline' },
  { id: 'sleeve', label: 'Sleeve / بازو', icon: 'hand-right-outline' },
  { id: 'chest', label: 'Chest / چھاتی', icon: 'shirt-outline' },
  { id: 'waist', label: 'Waist / کمر', icon: 'disc-outline' },
  { id: 'neck', label: 'Neck / گلا', icon: 'person-circle-outline' },
  { id: 'shalwar', label: 'Shalwar / شلوار', icon: 'arrow-down-circle-outline' },
  { id: 'paincha', label: 'Paincha / پانچا', icon: 'footsteps-outline' },
];

export default function MeasurementScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { customerId, customerName, customerPhone, initialMeasurements, initialGarmentType, initialStyle, customerNumber } = route.params;

  const [currentStep, setCurrentStep] = useState(1);
  const [measurements, setMeasurements] = useState<Record<string, string>>(initialMeasurements || {});
  const [garmentType, setGarmentType] = useState(initialGarmentType || 'Kameez Shalwar');
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isNumPadVisible, setIsNumPadVisible] = useState(false);
  const [collar, setCollar] = useState(initialStyle?.collar || 'Ban');
  const [pockets, setPockets] = useState<string[]>(initialStyle?.pockets || ['Front']);
  const [notes, setNotes] = useState('');
  
  // Voice Dictation UI State
  const [isListening, setIsListening] = useState(false);

  const requiredFilled = Object.values(measurements).filter(v => v).length;
  const totalRequired = 5;

  const handleKeyPress = (val: string) => {
    if (!activeField) return;
    
    if (val === '⌫') {
      setMeasurements(prev => ({
        ...prev,
        [activeField]: (prev[activeField] || '').slice(0, -1)
      }));
    } else if (val === 'NEXT') {
      const idx = MEASUREMENTS.findIndex(f => f.id === activeField);
      if (idx < MEASUREMENTS.length - 1) {
        setActiveField(MEASUREMENTS[idx + 1].id);
      } else {
        closeNumPad();
      }
    } else if (/^[\d.]$/.test(val) || ['¼', '½', '¾'].includes(val)) {
      setMeasurements(prev => ({
        ...prev,
        [activeField]: (prev[activeField] || '') + val
      }));
    }
  };

  const togglePocket = (pocket: string) => {
    setPockets(p => p.includes(pocket) ? p.filter(x => x !== pocket) : [...p, pocket]);
  };

  const handleNextStep = () => {
    if (currentStep === 2 && requiredFilled < totalRequired) {
      Alert.alert('Incomplete', 'Please fill at least 5 measurements to continue.');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleConfirm = () => {
    navigation.navigate('Invoice', {
      customerId,
      customerName,
      customerPhone,
      garmentType,
      measurements,
      style: { collar, pockets },
      notes,
    });
  };

  const openNumPad = (fieldId: string) => {
    setActiveField(fieldId);
    setIsNumPadVisible(true);
  };

  const closeNumPad = () => {
    setActiveField(null);
    setIsNumPadVisible(false);
  };

  const toggleVoiceDictation = () => {
    setIsListening(true);
    setTimeout(() => {
      setNotes(prev => prev + (prev ? '\n' : '') + 'کالر تھوڑا ڈھیلا رکھیں');
      setIsListening(false);
    }, 2000);
  };

  const renderProgressBar = () => (
    <View style={styles.progressBar}>
      {[1, 2, 3, 4].map(step => (
        <View key={step} style={[styles.progressSegment, step <= currentStep ? styles.progressSegmentActive : null]} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top || 20 }]} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close" size={28} color="#161D26" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>New Booking</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          {renderProgressBar()}

          <View style={styles.customerBadge}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {customerName ? customerName.substring(0, 2).toUpperCase() : '??'}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text 
                style={[
                  styles.customerName,
                  containsUrdu(customerName) && { fontFamily: 'NotoNastaliqUrdu', fontWeight: 'normal', fontSize: 20, lineHeight: 36, paddingTop: 6 }
                ]}
              >
                <Text style={{ color: '#00e482' }}>#{customerNumber || '?'} </Text>
                {customerName}
              </Text>
              <Text style={styles.customerPhone}>{customerPhone || 'No phone'}</Text>
            </View>
          </View>

          {/* STEP 1: GARMENT SELECTION */}
          {currentStep === 1 && (
            <View style={styles.wizardStep}>
              <Text style={styles.wizardStepTitle}>Step 1: Select Garment</Text>
              <Text style={styles.wizardStepSubtitle}>What are you stitching for this customer?</Text>
              
              <View style={styles.row}>
                {['Kameez Shalwar', 'Kurta'].map(opt => {
                  const isActive = garmentType === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.bigSelectionCard, isActive ? styles.bigSelectionCardActive : null]}
                      onPress={() => setGarmentType(opt)}
                    >
                      <Ionicons name="shirt-outline" size={40} color={isActive ? '#161D26' : 'rgba(22, 29, 38, 0.4)'} />
                      <Text style={[styles.bigSelectionText, isActive ? styles.bigSelectionTextActive : null]}>
                        {opt === 'Kameez Shalwar' ? 'Kameez Shalwar' : 'Kurta'}
                      </Text>
                      <Text style={[styles.bigSelectionUrdu, isActive ? styles.bigSelectionUrduActive : null]}>
                        {opt === 'Kameez Shalwar' ? 'قمیض شلوار' : 'کرتا'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 2: MEASUREMENTS */}
          {currentStep === 2 && (
            <View style={styles.wizardStep}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.wizardStepTitle}>Step 2: Measurements</Text>
                  <Text style={styles.wizardStepSubtitle}>Tap a field to open the number pad.</Text>
                </View>
                <View style={[styles.progressPill, requiredFilled >= totalRequired ? styles.progressPillComplete : null]}>
                  <Ionicons name={requiredFilled >= totalRequired ? "checkmark-circle" : "ellipse-outline"} size={16} color={requiredFilled >= totalRequired ? "#FFFFFF" : "#00e482"} />
                  <Text style={[styles.progressText, requiredFilled >= totalRequired ? { color: '#FFFFFF' } : null]}>
                    {requiredFilled}/{totalRequired}
                  </Text>
                </View>
              </View>

              <View style={styles.grid}>
                {MEASUREMENTS.map(field => {
                  const isActive = activeField === field.id;
                  const val = measurements[field.id] || '';
                  return (
                    <TouchableOpacity
                      key={field.id}
                      style={[styles.measureInput, isActive ? styles.measureInputActive : null]}
                      onPress={() => openNumPad(field.id)}
                    >
                      <View style={styles.measureLabelRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name={field.icon as any} size={16} color={isActive ? '#00e482' : 'rgba(22, 29, 38, 0.4)'} />
                          <Text style={[styles.measureLabelEng, isActive ? { color: '#161D26' } : null]}>{field.label.split(' / ')[0]}</Text>
                        </View>
                        <Text style={[styles.measureLabelUrdu, isActive ? { color: '#00e482' } : null]}>{field.label.split(' / ')[1]}</Text>
                      </View>
                      <Text style={[styles.measureValue, !val ? styles.measureValueEmpty : null, isActive ? styles.measureValueActive : null]}>
                        {val || '—'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 3: STYLE OPTIONS */}
          {currentStep === 3 && (
            <View style={styles.wizardStep}>
              <Text style={styles.wizardStepTitle}>Step 3: Style Options</Text>
              <Text style={styles.wizardStepSubtitle}>Select collar type and pocket configuration.</Text>
              
              <View style={styles.styleGroup}>
                <Text style={styles.styleLabel}>Collar Design</Text>
                <View style={styles.row}>
                  {['Ban', 'Round'].map(opt => {
                    const isActive = collar === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.chip, isActive ? styles.chipActive : null]}
                        onPress={() => setCollar(opt)}
                      >
                        <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{opt}</Text>
                        <Text style={[styles.chipUrduText, isActive ? styles.chipUrduTextActive : null]}>
                          {opt === 'Ban' ? 'بین' : 'گول'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.styleGroup}>
                <Text style={styles.styleLabel}>Pockets Setup</Text>
                <View style={styles.gridRow}>
                  {['Front', '2 Side', '1 Side', 'Shalwar'].map(opt => {
                    const isActive = pockets.includes(opt);
                    
                    // Helper to get Urdu translation
                    let urduText = '';
                    if (opt === 'Front') urduText = 'سامنے';
                    if (opt === '2 Side') urduText = 'دونوں';
                    if (opt === '1 Side') urduText = 'ایک سائیڈ';
                    if (opt === 'Shalwar') urduText = 'شلوار';

                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.gridChip, isActive ? styles.chipActive : null]}
                        onPress={() => togglePocket(opt)}
                      >
                        <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{opt}</Text>
                        <Text style={[styles.chipUrduText, isActive ? styles.chipUrduTextActive : null]}>
                          {urduText}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* STEP 4: NOTES & VOICE DICTATION */}
          {currentStep === 4 && (
            <View style={styles.wizardStep}>
              <Text style={styles.wizardStepTitle}>Step 4: Special Instructions</Text>
              <Text style={styles.wizardStepSubtitle}>Type notes or tap the mic to speak them automatically.</Text>
              
              <View style={styles.notesContainer}>
                <TextInput
                  style={styles.notesInput}
                  placeholder="e.g. Keep sleeves 1 inch loose..."
                  placeholderTextColor="rgba(22, 29, 38, 0.4)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
                
                <TouchableOpacity 
                  style={[styles.voiceButton, isListening ? styles.voiceButtonActive : null]} 
                  onPress={toggleVoiceDictation}
                >
                  <View style={styles.voiceButtonContent}>
                    {isListening ? (
                      <Animated.View style={styles.pulseRing}>
                        <Ionicons name="mic" size={28} color="#FFFFFF" />
                      </Animated.View>
                    ) : (
                      <Ionicons name="mic-outline" size={28} color="#161D26" />
                    )}
                    <View style={styles.voiceButtonTextContainer}>
                      <Text style={[styles.voiceButtonText, isListening ? { color: '#FFFFFF' } : null]}>
                        {isListening ? 'Listening (اردو)...' : 'Tap to Speak'}
                      </Text>
                      {!isListening && (
                        <Text style={styles.voiceButtonSubtext}>Supports Urdu / اردو</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* NAVIGATION BUTTONS */}
          {!isNumPadVisible && (
            <View style={styles.wizardNav}>
              {currentStep > 1 ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={handlePrevStep}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}

              {currentStep < 4 ? (
                <TouchableOpacity style={styles.primaryButtonHalf} onPress={handleNextStep}>
                  <Text style={styles.primaryButtonText}>Next Step</Text>
                  <Ionicons name="arrow-forward" size={20} color="#161D26" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryButtonHalf} onPress={handleConfirm}>
                  <Text style={styles.primaryButtonText}>Save & Invoice</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#161D26" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          <View style={{ height: 60 }} />
        </ScrollView>

        {isNumPadVisible ? (
          <TailorNumPad onKeyPress={handleKeyPress} onClose={closeNumPad} />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#161D26' },

  progressBar: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  progressSegment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F0F0F0' },
  progressSegmentActive: { backgroundColor: '#00e482' },

  customerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 20, padding: 16, marginBottom: 24 },
  customerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8FDF3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  customerAvatarText: { color: '#00e482', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  customerInfo: { flex: 1, gap: 2 },
  customerName: { color: '#161D26', fontSize: 16, fontWeight: '800' },
  customerPhone: { color: 'rgba(22, 29, 38, 0.5)', fontSize: 13, fontWeight: '600' },
  
  progressPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8FDF3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, gap: 4 },
  progressPillComplete: { backgroundColor: '#00e482' },
  progressText: { color: '#00e482', fontSize: 13, fontWeight: '800' },

  wizardStep: { flex: 1 },
  wizardStepTitle: { fontSize: 22, fontWeight: '900', color: '#161D26', marginBottom: 4 },
  wizardStepSubtitle: { fontSize: 15, color: 'rgba(22, 29, 38, 0.6)', fontWeight: '500', marginBottom: 24 },

  row: { flexDirection: 'row', gap: 12 },
  
  bigSelectionCard: { flex: 1, backgroundColor: '#F7F8FA', borderRadius: 24, padding: 24, alignItems: 'center', gap: 12, borderWidth: 2, borderColor: 'transparent' },
  bigSelectionCardActive: { backgroundColor: '#E8FDF3', borderColor: '#00e482' },
  bigSelectionText: { fontSize: 16, fontWeight: '800', color: 'rgba(22, 29, 38, 0.6)' },
  bigSelectionTextActive: { color: '#161D26' },
  bigSelectionUrdu: { fontFamily: 'NotoNastaliqUrdu', fontSize: 16, color: 'rgba(22, 29, 38, 0.5)', lineHeight: 30, paddingTop: 4 },
  bigSelectionUrduActive: { color: '#00e482' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  measureInput: { width: '48%', backgroundColor: '#F7F8FA', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14, borderWidth: 2, borderColor: 'transparent' },
  measureInputActive: { 
    backgroundColor: '#FFFFFF', borderColor: '#00e482',
    ...Platform.select({ ios: { shadowColor: '#00e482', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  measureLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  measureLabelEng: { fontSize: 13, fontWeight: '800', color: 'rgba(22, 29, 38, 0.5)' },
  measureLabelUrdu: { fontFamily: 'NotoNastaliqUrdu', fontSize: 13, color: 'rgba(22, 29, 38, 0.5)', lineHeight: 26, paddingTop: 4 },
  measureValue: { fontSize: 28, fontWeight: '900', color: '#161D26' },
  measureValueEmpty: { color: 'rgba(22, 29, 38, 0.2)' },
  measureValueActive: { color: '#00e482' },

  styleGroup: { marginBottom: 24 },
  styleLabel: { fontSize: 16, fontWeight: '800', color: '#161D26', marginBottom: 12 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { flex: 1, backgroundColor: '#F7F8FA', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  gridChip: { width: '48%', backgroundColor: '#F7F8FA', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#E8FDF3', borderColor: '#00e482' },
  chipText: { fontSize: 15, fontWeight: '800', color: 'rgba(22, 29, 38, 0.6)', marginBottom: 2 },
  chipTextActive: { color: '#161D26' },
  chipUrduText: { fontFamily: 'NotoNastaliqUrdu', fontSize: 14, color: 'rgba(22, 29, 38, 0.5)', lineHeight: 28, paddingTop: 6 },
  chipUrduTextActive: { color: '#00e482' },

  notesContainer: { backgroundColor: '#F7F8FA', borderRadius: 24, padding: 16 },
  notesInput: { fontFamily: 'NotoNastaliqUrdu', fontSize: 16, color: '#161D26', textAlignVertical: 'top', minHeight: 120, marginBottom: 16, lineHeight: 32 },
  voiceButton: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  voiceButtonActive: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  voiceButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  pulseRing: { alignItems: 'center', justifyContent: 'center' },
  voiceButtonTextContainer: { alignItems: 'flex-start' },
  voiceButtonText: { fontSize: 16, fontWeight: '800', color: '#161D26' },
  voiceButtonSubtext: { fontFamily: 'NotoNastaliqUrdu', fontSize: 13, color: 'rgba(22, 29, 38, 0.5)', marginTop: 2, paddingTop: 4 },

  wizardNav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, gap: 12 },
  secondaryButton: { flex: 1, backgroundColor: '#F7F8FA', paddingVertical: 18, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: 'rgba(22, 29, 38, 0.6)', fontSize: 16, fontWeight: '800' },
  primaryButtonHalf: { flex: 1, flexDirection: 'row', backgroundColor: '#00e482', paddingVertical: 18, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#00e482', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }, android: { elevation: 6 } }) },
  primaryButtonText: { color: '#161D26', fontSize: 16, fontWeight: '800' },
});