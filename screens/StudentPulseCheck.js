import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  ScrollView, Dimensions, Platform, StatusBar, TextInput, KeyboardAvoidingView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function StudentPulseCheck({ sessionCode, onLeave, onBack }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showDoubtBox, setShowDoubtBox] = useState(false);
  const [doubtText, setDoubtText] = useState('');
  
  // DB references
  const [sessionId, setSessionId] = useState(null);
  const [activePulseId, setActivePulseId] = useState(null);

  useEffect(() => {
    let pulseSub;

    const fetchRealPulse = async () => {
      const { data: sessionData } = await supabase.from('sessions').select('id').eq('code', sessionCode).single();
      if (!sessionData) return;
      setSessionId(sessionData.id);

      const { data: pulseData } = await supabase.from('pulses').select('id').eq('session_id', sessionData.id).eq('is_open', true).order('created_at', { ascending: false }).limit(1);
      if (pulseData && pulseData.length > 0) {
        setActivePulseId(pulseData[0].id);
      }

      // --- THE FIX: LISTEN FOR NEW PULSES WHILE WAITING ON THIS SCREEN ---
      pulseSub = supabase.channel('pulse_screen_refresh')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulses', filter: `session_id=eq.${sessionData.id}` }, (payload) => {
           // WIPE THE SLATE CLEAN FOR THE NEW PULSE!
           setSubmitted(false);
           setSelectedOption(null);
           setShowDoubtBox(false);
           setDoubtText('');
           setActivePulseId(payload.new.id);
        }).subscribe();
    };
    
    fetchRealPulse();

    return () => {
      if (pulseSub) supabase.removeChannel(pulseSub);
    };
  }, [sessionCode]);

  const handleSelect = async (option) => {
    if (submitted || !activePulseId) return;
    setSelectedOption(option);

    // Send the signal to the teacher immediately
    await supabase.from('responses').insert([{ pulse_id: activePulseId, status: option }]);

    // Both Lost AND Sort Of trigger the doubt box
    if (option === 'lost' || option === 'sort_of') {
      setShowDoubtBox(true);
    } else {
      setSubmitted(true);
    }
  };

  const handleSubmitDoubt = async () => {
    if (submitted || !sessionId) return;
    
    if (doubtText.trim().length > 0) {
      await supabase.from('doubts').insert([{ session_id: sessionId, content: doubtText }]);
    }
    setSubmitted(true);
  };

  const OPTIONS = [
    { key: 'got_it', label: 'Got It', description: 'I understood the concept clearly.', color: '#4CAF50', bgLight: '#e8f5e9', icon: <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />, },
    { key: 'sort_of', label: 'Sort Of', description: 'I understand some parts but not everything.', color: '#FFC107', bgLight: '#fff8e1', icon: <MaterialCommunityIcons name="head-lightbulb-outline" size={40} color="#FFC107" />, },
    { key: 'lost', label: 'Lost', description: 'I am confused and need clarification.', color: '#FF5C5C', bgLight: '#ffebee', icon: <Ionicons name="alert-circle" size={40} color="#FF5C5C" />, },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Ionicons name="pulse" size={24} color="#fff" />
          <Text style={styles.headerAppName}>ClassPulse</Text>
        </View>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
          <View style={styles.backPill}>
            <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.backPillText}>Back</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* FIX 2: WRAPPED IN KEYBOARD AVOIDING VIEW */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.instructionSection}>
            <View style={styles.pulseBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseBadgeText}>LIVE PULSE CHECK</Text>
            </View>
            <Text style={styles.pageTitle}>Pulse Check</Text>
            <Text style={styles.pageSubtitle}>How well did you understand the topic just explained?</Text>
          </View>

          {submitted ? (
            <NeumorphicView style={styles.confirmationCard}>
              <View style={styles.confirmIconWrapper}>
                <Ionicons name="checkmark-circle" size={64} color={OPTIONS.find(o => o.key === selectedOption)?.color || '#4CAF50'} />
              </View>
              <Text style={styles.confirmTitle}>Response Submitted!</Text>
              <Text style={styles.confirmSubtext}>
                You selected: <Text style={{ fontWeight: 'bold', color: OPTIONS.find(o => o.key === selectedOption)?.color }}>{OPTIONS.find(o => o.key === selectedOption)?.label}</Text>
              </Text>
              {(selectedOption === 'lost' || selectedOption === 'sort_of') && doubtText.length > 0 && (
                <Text style={[styles.confirmSubtext, { marginTop: 8 }]}>Your doubt has been sent to the teacher.</Text>
              )}
              <Text style={[styles.confirmSubtext, { marginTop: 16 }]}>You can go back to Ask Doubts while waiting for the next pulse.</Text>
            </NeumorphicView>
          ) : (
            <>
              <View style={styles.optionsContainer}>
                {OPTIONS.map((opt) => {
                  const isSelected = selectedOption === opt.key;
                  return (
                    <TouchableOpacity key={opt.key} onPress={() => handleSelect(opt.key)} activeOpacity={0.8} style={{ width: '100%' }}>
                      <NeumorphicView style={[ styles.optionCard, isSelected && { borderColor: opt.color, borderWidth: 2 } ]} inset={isSelected} isGlow={isSelected} glowColor={opt.color}>
                        <View style={[styles.optionIconBox, { backgroundColor: opt.bgLight }]}>{opt.icon}</View>
                        <View style={styles.optionTextBlock}>
                          <Text style={[styles.optionLabel, { color: opt.color }]}>{opt.label}</Text>
                          <Text style={styles.optionDescription}>{opt.description}</Text>
                        </View>
                        <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={24} color={isSelected ? opt.color : '#c8d4e0'} />
                      </NeumorphicView>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {showDoubtBox && (
                <NeumorphicView style={styles.doubtCard}>
                  <Text style={[styles.doubtTitle, { color: OPTIONS.find(o => o.key === selectedOption)?.color }]}>
                    {selectedOption === 'sort_of' ? "What part was confusing?" : "Don’t worry, ask your doubt"}
                  </Text>
                  <Text style={styles.doubtSubtitle}>Send your question anonymously to the teacher.</Text>
                  <TextInput 
                    style={styles.doubtInput} 
                    placeholder="Type your doubt here..." 
                    placeholderTextColor="#94a3b8" 
                    multiline 
                    value={doubtText} 
                    onChangeText={setDoubtText} 
                  />
                  <TouchableOpacity style={[styles.submitDoubtButton, { backgroundColor: OPTIONS.find(o => o.key === selectedOption)?.color || '#4f8cff' }]} onPress={handleSubmitDoubt} activeOpacity={0.85}>
                    <Text style={styles.submitDoubtText}>Submit Doubt</Text>
                  </TouchableOpacity>
                </NeumorphicView>
              )}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e0e5ec' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12, paddingBottom: 14, backgroundColor: '#0ea5e9', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerAppName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8 },
  backPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  backPillText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { paddingHorizontal: isLargeScreen ? 80 : 16, paddingTop: 28, alignItems: 'center', maxWidth: 700, alignSelf: 'center', width: '100%', },
  instructionSection: { alignItems: 'center', marginBottom: 28, width: '100%' },
  pulseBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff0f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14, borderWidth: 1, borderColor: '#ffcdd2', },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5C5C', marginRight: 8 },
  pulseBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#FF5C5C' },
  pageTitle: { fontSize: 26, fontWeight: 'bold', color: '#2f3542' },
  pageSubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  optionsContainer: { width: '100%', gap: 16, marginBottom: 24 },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24 },
  optionIconBox: { width: 70, height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  optionTextBlock: { flex: 1 },
  optionLabel: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  optionDescription: { fontSize: 14, color: '#6b7280' },
  confirmationCard: { borderRadius: 24, padding: 36, alignItems: 'center', width: '100%' },
  confirmIconWrapper: { marginBottom: 16 },
  confirmTitle: { fontSize: 22, fontWeight: 'bold', color: '#2f3542' },
  confirmSubtext: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  doubtCard: { borderRadius: 24, padding: 24, width: '100%' },
  doubtTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  doubtSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  doubtInput: { backgroundColor: '#e0e5ec', borderRadius: 16, padding: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 14 },
  submitDoubtButton: { paddingVertical: 12, borderRadius: 18, alignItems: 'center' },
  submitDoubtText: { color: '#fff', fontWeight: 'bold' }
});