import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, SafeAreaView, Platform, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;
const cardPadding = isLargeScreen ? 32 : 20;

export default function StudentDashboard({ sessionCode, onLeave }) {
  // DEV MOCK STATE: Pretends the teacher sent a "Start Pulse" command over websockets.
  const [pulseActive, setPulseActive] = useState(false);
  
  // Student's local state
  const [selectedResponse, setSelectedResponse] = useState(null); // 'gotIt' | 'sortOf' | 'lost' | null
  const [questionText, setQuestionText] = useState('');

  const submitQuestion = () => {
    if (questionText.trim().length > 0) {
      if (Platform.OS !== 'web') Alert.alert("Question Sent", "Your question was sent securely.");
      setQuestionText('');
    }
  };

  const handleResponse = (responseType) => {
    if (pulseActive) {
      setSelectedResponse(responseType);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.maxWidthContainer}>

          {/* SECTION 1 — CONNECTION HEADER */}
          <NeumorphicView style={[styles.card, { padding: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.liveIndicator} />
                <Text style={styles.headerText}>Session <Text style={{fontWeight: 'bold'}}>{sessionCode}</Text></Text>
              </View>
              <TouchableOpacity onPress={onLeave}>
                <NeumorphicView style={styles.leaveButton}>
                  <Ionicons name="log-out-outline" size={18} color="#FF5C5C" />
                  <Text style={styles.leaveButtonText}>Leave</Text>
                </NeumorphicView>
              </TouchableOpacity>
            </View>
          </NeumorphicView>

          {/* SECTION 2 — THE PULSE ENGINE */}
          <NeumorphicView style={[styles.card, { padding: cardPadding }, styles.spacingTop, pulseActive ? styles.pulseContainerActive : null]}>
            <Text style={styles.cardTitle}>{pulseActive ? "Pulse Check Active!" : "Waiting for Pulse"}</Text>
            
            {!pulseActive ? (
              <View style={styles.idleContainer}>
                <NeumorphicView inset={true} style={styles.idleOrb}>
                  <Ionicons name="hourglass-outline" size={40} color="#a0aab5" />
                </NeumorphicView>
                <Text style={styles.idleText}>Listen closely to the lecture.{'\n'}We will notify you when a check starts.</Text>
              </View>
            ) : (
              <View style={[isLargeScreen ? styles.row : styles.column, { gap: 16 }]}>
                
                {/* Got It Button */}
                <TouchableOpacity style={styles.flex1} onPress={() => handleResponse('gotIt')} activeOpacity={0.8}>
                  <NeumorphicView 
                    style={[styles.pulseActionCard, selectedResponse === 'gotIt' && styles.selectedGotIt]}
                    inset={selectedResponse === 'gotIt'}
                    isGlow={selectedResponse === 'gotIt'}
                    glowColor="#4CAF50"
                  >
                    <Ionicons name="checkmark-circle" size={48} color={selectedResponse === 'gotIt' ? '#4CAF50' : '#2f3542'} marginBottom={12} />
                    <Text style={[styles.pulseActionText, selectedResponse === 'gotIt' && { color: '#4CAF50' }]}>Got It!</Text>
                  </NeumorphicView>
                </TouchableOpacity>

                 {/* Sort Of Button */}
                 <TouchableOpacity style={styles.flex1} onPress={() => handleResponse('sortOf')} activeOpacity={0.8}>
                  <NeumorphicView 
                    style={[styles.pulseActionCard, selectedResponse === 'sortOf' && styles.selectedSortOf]}
                    inset={selectedResponse === 'sortOf'}
                    isGlow={selectedResponse === 'sortOf'}
                    glowColor="#FFC107"
                  >
                    <MaterialCommunityIcons name="head-lightbulb-outline" size={48} color={selectedResponse === 'sortOf' ? '#FFC107' : '#2f3542'} marginBottom={12} />
                    <Text style={[styles.pulseActionText, selectedResponse === 'sortOf' && { color: '#FFC107' }]}>Sort Of</Text>
                  </NeumorphicView>
                </TouchableOpacity>

                 {/* Lost Button */}
                 <TouchableOpacity style={styles.flex1} onPress={() => handleResponse('lost')} activeOpacity={0.8}>
                   <NeumorphicView 
                    style={[styles.pulseActionCard, selectedResponse === 'lost' && styles.selectedLost]}
                    inset={selectedResponse === 'lost'}
                    isGlow={selectedResponse === 'lost'}
                    glowColor="#FF5C5C"
                  >
                    <Ionicons name="alert-circle" size={48} color={selectedResponse === 'lost' ? '#FF5C5C' : '#2f3542'} marginBottom={12} />
                    <Text style={[styles.pulseActionText, selectedResponse === 'lost' && { color: '#FF5C5C' }]}>Completely Lost</Text>
                  </NeumorphicView>
                </TouchableOpacity>

              </View>
            )}

            {pulseActive && selectedResponse && (
               <Text style={styles.lockedInText}>Answer locked in. You can change it until the pulse ends.</Text>
            )}
          </NeumorphicView>

          {/* SECTION 3 — ANONYMOUS QUESTIONS */}
          <NeumorphicView style={[styles.card, { padding: cardPadding }, styles.spacingTop]}>
            <Text style={styles.cardTitle}>Ask a Question</Text>
            <Text style={styles.secondaryText}>Your question will be sent anonymously to the teacher's dashboard.</Text>

            <NeumorphicView inset={true} style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                multiline={true}
                numberOfLines={4}
                placeholder="What part didn't make sense?"
                placeholderTextColor="#a0aab5"
                value={questionText}
                onChangeText={setQuestionText}
              />
            </NeumorphicView>

            <TouchableOpacity style={{ marginTop: 24 }} onPress={submitQuestion} disabled={questionText.length === 0} activeOpacity={0.8}>
              <NeumorphicView style={[styles.submitButton, { opacity: questionText.length > 0 ? 1 : 0.5 }]}>
                <Ionicons name="send" size={18} color="#4f8cff" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Submit Anonymously</Text>
              </NeumorphicView>
            </TouchableOpacity>
          </NeumorphicView>


          {/* --- DEVELOPER TOOLS --- */}
          <TouchableOpacity 
            style={{ marginTop: 40, alignItems: 'center', opacity: 0.5 }} 
            onPress={() => {
              setPulseActive(!pulseActive);
              if (pulseActive) setSelectedResponse(null); // Reset on pulse end
            }}
          >
             <Text style={{ color: '#4f8cff', fontWeight: 'bold' }}>
               [Dev Tool] Simulate Pulse {pulseActive ? 'Ending' : 'Starting'}
             </Text>
          </TouchableOpacity>


          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e0e5ec' },
  scrollContainer: { padding: Platform.OS === 'web' ? 40 : 16, alignItems: 'center', backgroundColor: '#e0e5ec', minHeight: '100%' },
  maxWidthContainer: { width: '100%', maxWidth: 800 },
  card: { borderRadius: 24, marginBottom: 20 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#2f3542', marginBottom: 12, textAlign: 'center' },
  spacingTop: { marginTop: 8 },
  secondaryText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  flex1: { flex: 1 },

  // Header
  liveIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', marginRight: 10 },
  headerText: { fontSize: 16, color: '#2f3542' },
  leaveButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  leaveButtonText: { color: '#FF5C5C', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },

  // Pulse Engine Idle
  idleContainer: { alignItems: 'center', paddingVertical: 40 },
  idleOrb: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  idleText: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24 },

  // Pulse Engine Active
  pulseContainerActive: { borderWidth: 2, borderColor: '#ffffff', borderRadius: 24 }, // Slight highlight for pop
  pulseActionCard: { padding: 24, borderRadius: 20, alignItems: 'center', minHeight: 180, justifyContent: 'center' },
  pulseActionText: { fontSize: 18, fontWeight: 'bold', color: '#2f3542', textAlign: 'center' },
  lockedInText: { textAlign: 'center', color: '#6b7280', fontSize: 14, marginTop: 24, fontStyle: 'italic' },
  
  // Ask Question
  textAreaContainer: { borderRadius: 20, padding: 16, minHeight: 120 },
  textArea: { flex: 1, fontSize: 16, color: '#2f3542', outlineStyle: 'none', textAlignVertical: 'top' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 25 },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#4f8cff' },
});
