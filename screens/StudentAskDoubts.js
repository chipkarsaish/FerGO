import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Dimensions, Platform, StatusBar, KeyboardAvoidingView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function StudentAskDoubts({ sessionCode, onLeave, onPulseCheck, onViewQuiz }) {
  const [doubtText, setDoubtText] = useState('');
  const [pendingDoubts, setPendingDoubts] = useState([]);
  const [answeredDoubts, setAnsweredDoubts] = useState([]);
  
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    fetchSessionId();
  }, [sessionCode]);

  const fetchSessionId = async () => {
    const { data } = await supabase.from('sessions').select('id').eq('code', sessionCode).single();
    if (data) {
      setSessionId(data.id);
      fetchExistingDoubts(data.id);
      checkActiveQuiz(data.id);
    }
  };

  const fetchExistingDoubts = async (sId) => {
    const { data } = await supabase.from('doubts').select('*').eq('session_id', sId).order('created_at', { ascending: false });
    if (data) {
      setPendingDoubts(data.filter(d => !d.is_answered));
      setAnsweredDoubts(data.filter(d => d.is_answered));
    }
  };

  const checkActiveQuiz = async (sId) => {
    const { data } = await supabase.from('quizzes').select('*').eq('session_id', sId).eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) setActiveQuiz(data[0]);
  };

  useEffect(() => {
    if (!sessionId) return;

    // 1. Listen for Pulse Checks
    const pulseSub = supabase.channel('public:pulses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulses', filter: `session_id=eq.${sessionId}` }, () => {
        onPulseCheck();
      }).subscribe();

    // 2. Listen for NEW Doubts and ANSWERED Doubts
    const doubtSub = supabase.channel('public:doubts_update')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doubts', filter: `session_id=eq.${sessionId}` }, (payload) => {
        // When a doubt hits the database, push it to the screen officially
        setPendingDoubts(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'doubts', filter: `session_id=eq.${sessionId}` }, (payload) => {
        if (payload.new.is_answered) {
          setPendingDoubts(prev => prev.filter(d => d.id !== payload.new.id)); // Now the IDs will match perfectly!
          setAnsweredDoubts(prev => [payload.new, ...prev]);
        }
      }).subscribe();

    // 3. Listen for Quizzes
    const quizSub = supabase.channel('public:quizzes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quizzes', filter: `session_id=eq.${sessionId}` }, (payload) => {
        if (payload.new.is_active) setActiveQuiz(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quizzes', filter: `session_id=eq.${sessionId}` }, (payload) => {
        if (!payload.new.is_active && activeQuiz?.id === payload.new.id) setActiveQuiz(null);
      }).subscribe();

    // FIX 4: Listen for Teacher Ending the Session (Auto-Kick)
    const sessionSub = supabase.channel('public:session_status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        if (payload.new.is_active === false) {
          if (Platform.OS === 'web') {
             alert("The teacher has ended this session.");
          } else {
             Alert.alert("Session Ended", "The teacher has ended this session.");
          }
          onLeave(); // Kicks them back to join screen instantly
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(pulseSub);
      supabase.removeChannel(doubtSub);
      supabase.removeChannel(quizSub);
      supabase.removeChannel(sessionSub);
    };
  }, [sessionId, activeQuiz]);

  const submitDoubt = async () => {
    if (doubtText.trim().length === 0 || !sessionId) return;
    
    const textToSend = doubtText.trim();
    setDoubtText(''); // Instantly clear the text box so it feels fast
    
    // Send to DB. The INSERT listener above will catch it and put it on the screen!
    await supabase.from('doubts').insert([{ session_id: sessionId, content: textToSend }]);
  };

  const getTimeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const renderCard = (item, isPending) => (
    <NeumorphicView key={item.id} style={styles.doubtCard}>
      <View style={styles.doubtCardRow}>
        <View style={styles.doubtTextWrapper}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={isPending ? "#4f8cff" : "#4CAF50"} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.doubtQuestionText}>"{item.content}"</Text>
        </View>
        <View style={isPending ? styles.pendingBadge : styles.answeredBadge}>
          <Text style={isPending ? styles.pendingBadgeText : styles.answeredBadgeText}>{isPending ? "Pending" : "Answered"}</Text>
        </View>
      </View>
      <Text style={styles.timestampText}>Submitted {getTimeAgo(item.created_at)}</Text>
    </NeumorphicView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/logo.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <View style={{ marginLeft: 6 }}>
            <Text style={[styles.headerAppName, { marginLeft: 0 }]}>FearGo</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Ask Without Fear.Learn Without Doubt</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={onLeave} activeOpacity={0.8}>
            <View style={styles.headerRight}>
              <View style={styles.activeDot} />
              <Text style={styles.headerConnected}>Leave</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {activeQuiz && (
            <TouchableOpacity onPress={() => onViewQuiz(activeQuiz)} activeOpacity={0.8} style={{ marginBottom: 20 }}>
              <NeumorphicView style={styles.quizBanner}>
                <View style={styles.quizBannerContent}>
                  <View style={styles.quizBannerIconWrapper}>
                    <Ionicons name="flash" size={20} color="#1e40af" />
                  </View>
                  <View style={styles.quizBannerTextWrapper}>
                    <Text style={styles.quizBannerTitle}>Live Quiz Active!</Text>
                    <Text style={styles.quizBannerSubtitle}>The teacher has started a new quiz.</Text>
                  </View>
                  <View style={styles.quizBannerButton}>
                    <Text style={styles.quizBannerButtonText}>Join Quiz</Text>
                    <Ionicons name="chevron-forward" size={16} color="#1e40af" style={{marginLeft: 2, marginTop: 1}}/>
                  </View>
                </View>
              </NeumorphicView>
            </TouchableOpacity>
          )}

          <View style={styles.pageTitleSection}>
            <Text style={styles.pageTitle}>Ask Doubts</Text>
            <Text style={styles.pageSubtitle}>Submit your question anonymously to the teacher.</Text>
          </View>

          <NeumorphicView style={styles.card}>
            <Text style={styles.inputLabel}>Your Question</Text>
            <NeumorphicView inset={true} style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea} multiline={true} numberOfLines={5} textAlignVertical="top"
                placeholder={`"I didn't understand the formula..."`} placeholderTextColor="#a0aab5"
                value={doubtText} onChangeText={setDoubtText}
              />
            </NeumorphicView>
            <Text style={styles.helperText}>Your question will be submitted anonymously.</Text>
            <TouchableOpacity style={{ marginTop: 20 }} onPress={submitDoubt} disabled={doubtText.trim().length === 0} activeOpacity={0.8}>
              <View style={[styles.submitButton, { opacity: doubtText.trim().length > 0 ? 1 : 0.45 }]}>
                <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.submitButtonText}>Submit Doubt</Text>
              </View>
            </TouchableOpacity>
          </NeumorphicView>

          <NeumorphicView style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="#FFC107" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Pending Doubts</Text>
              {pendingDoubts.length > 0 && <View style={styles.countBubble}><Text style={styles.countBubbleText}>{pendingDoubts.length}</Text></View>}
            </View>
            {pendingDoubts.length === 0 ? (
              <View style={styles.emptyState}><Ionicons name="checkmark-circle-outline" size={32} color="#d1d9e6" /><Text style={styles.emptyStateText}>No pending doubts.</Text></View>
            ) : (pendingDoubts.map(d => renderCard(d, true)))}
          </NeumorphicView>

          <NeumorphicView style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Answered Doubts</Text>
              {answeredDoubts.length > 0 && <View style={[styles.countBubble, { backgroundColor: '#e8f5e9' }]}><Text style={[styles.countBubbleText, { color: '#4CAF50' }]}>{answeredDoubts.length}</Text></View>}
            </View>
            {answeredDoubts.length === 0 ? (
              <View style={styles.emptyState}><Ionicons name="hourglass-outline" size={32} color="#d1d9e6" /><Text style={styles.emptyStateText}>No answered doubts yet.</Text></View>
            ) : (answeredDoubts.map(d => renderCard(d, false)))}
          </NeumorphicView>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e0e5ec' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12, paddingBottom: 14, backgroundColor: '#0ea5e9', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerAppName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8, letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f91111ff', marginRight: 6 },
  headerConnected: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { paddingHorizontal: isLargeScreen ? 60 : 16, paddingTop: 28, paddingBottom: 16, maxWidth: 900, alignSelf: 'center', width: '100%' },
  pageTitleSection: { alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 'bold', color: '#2f3542' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 6, textAlign: 'center' },
  quizBanner: { backgroundColor: '#e6f0ff', borderRadius: 20, padding: 16 },
  quizBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quizBannerIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(30, 64, 175, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  quizBannerTextWrapper: { flex: 1, marginRight: 10 },
  quizBannerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 },
  quizBannerSubtitle: { fontSize: 12, color: '#1e40af', opacity: 0.85, lineHeight: 16 },
  quizBannerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 64, 175, 0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  quizBannerButtonText: { fontSize: 13, fontWeight: 'bold', color: '#1e40af' },
  card: { borderRadius: 24, padding: 20, marginBottom: 20 },
  inputLabel: { fontSize: 15, fontWeight: '600', color: '#2f3542', marginBottom: 12 },
  textAreaContainer: { borderRadius: 16, padding: 16, minHeight: 120 },
  textArea: { fontSize: 15, color: '#2f3542', flex: 1, outlineStyle: 'none', lineHeight: 22 },
  helperText: { fontSize: 12, color: '#94a3b8', marginTop: 10, fontStyle: 'italic' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 27, backgroundColor: '#4f8cff', shadowColor: '#4f8cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2f3542', flex: 1 },
  countBubble: { backgroundColor: '#fff8e1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8 },
  countBubbleText: { fontSize: 13, fontWeight: 'bold', color: '#FFC107' },
  doubtCard: { borderRadius: 18, padding: 16, marginBottom: 12 },
  doubtCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  doubtTextWrapper: { flexDirection: 'row', flex: 1, marginRight: 12 },
  doubtQuestionText: { fontSize: 14, color: '#2f3542', fontStyle: 'italic', flex: 1, lineHeight: 20 },
  timestampText: { fontSize: 12, color: '#94a3b8' },
  pendingBadge: { backgroundColor: '#fff8e1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ffe082' },
  pendingBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#FFC107' },
  answeredBadge: { backgroundColor: '#e8f5e9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#a5d6a7' },
  answeredBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#4CAF50' },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyStateText: { fontSize: 14, color: '#a0aab5', marginTop: 10 },
});