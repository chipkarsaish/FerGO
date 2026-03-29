import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  ScrollView, Dimensions, Platform, StatusBar, ActivityIndicator, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function TeacherHome({ user, onCreateSession, onViewSummary, onBack }) {
  const [isCreating, setIsCreating] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // --- NEW: FETCH PAST SESSIONS ---
  useEffect(() => {
    if (user?.id) {
      fetchPastSessions();
    }
  }, [user]);

  const fetchPastSessions = async () => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setPastSessions(data);
    }
    setIsLoadingHistory(false);
  };

  // --- UPDATE: SECURE SESSION CREATION ---
  const handleCreateSession = async () => {
    if (!user?.id) {
      Alert.alert("Authentication Error", "You must be logged in to create a session.");
      return;
    }

    setIsCreating(true);
    
    // 1. Generate a random 4-digit code
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 2. Insert into Supabase AND attach the teacher_id
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ 
        code: newCode, 
        is_active: true,
        teacher_id: user.id // LOCKING IT TO THE LOGGED IN TEACHER
      }])
      .select();

    setIsCreating(false);

    if (error) {
      console.error("Error creating session:", error);
      Alert.alert("Error", "Could not create session. Check your internet/database.");
      return;
    }

    // 3. Pass the real database object to the Dashboard
    if (data && data.length > 0) {
      onCreateSession(data[0]); 
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown Date';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderSessionCard = (session) => (
    <NeumorphicView key={session.id} style={styles.sessionCard}>
      <View style={styles.sessionCardTop}>
        <View style={styles.sessionMeta}>
          <View style={styles.codeRow}>
            <Ionicons name="keypad-outline" size={14} color="#4f8cff" style={{ marginRight: 5 }} />
            <Text style={styles.sessionCode}>Session: {session.code}</Text>
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{formatDate(session.created_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="radio-button-on" size={12} color={session.is_active ? "#4CAF50" : "#FF5C5C"} style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{session.is_active ? "Active" : "Closed"}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={() => onViewSummary(session)} activeOpacity={0.8}>
          <NeumorphicView style={styles.viewSummaryBtn}>
            <Ionicons name="bar-chart-outline" size={14} color="#4f8cff" style={{ marginBottom: 3 }} />
            <Text style={styles.viewSummaryText}>View{"\n"}Summary</Text>
          </NeumorphicView>
        </TouchableOpacity>
      </View>
    </NeumorphicView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/logo.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <View style={{ marginLeft: 6 }}>
            <Text style={[styles.headerAppName, { marginLeft: 0 }]}>FearGo</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>For Educators</Text>
          </View>
        </View>

        <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
          <View style={styles.backPill}>
            <Ionicons name="log-out-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.backPillText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome, Host a Session </Text>
        </View>

        <TouchableOpacity 
          onPress={handleCreateSession} 
          disabled={isCreating}
          activeOpacity={0.85} 
          style={styles.createButtonWrapper}
        >
          <NeumorphicView style={styles.createButton} isGlow={true} glowColor="#4f8cff">
            <View style={styles.createButtonInner}>
              <View style={styles.createIconCircle}>
                {isCreating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="add-circle" size={32} color="#fff" />
                )}
              </View>
              <View style={styles.createTextBlock}>
                <Text style={styles.createButtonLabel}>
                  {isCreating ? "Creating..." : "Create Session"}
                </Text>
                <Text style={styles.createButtonSub}>Generates a unique code + QR for students</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
            </View>
          </NeumorphicView>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={20} color="#4f8cff" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Session Review Summary</Text>
        </View>

        {isLoadingHistory ? (
          <ActivityIndicator size="large" color="#4f8cff" style={{ marginTop: 20 }} />
        ) : pastSessions.length === 0 ? (
          <NeumorphicView style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={40} color="#d1d9e6" />
            <Text style={styles.emptyTitle}>No previous sessions found.</Text>
            <Text style={styles.emptySubtext}>Start your first session using the Create Session button.</Text>
          </NeumorphicView>
        ) : (
          pastSessions.map(renderSessionCard)
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e0e5ec' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12, paddingBottom: 14, backgroundColor: '#0ea5e9', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10, },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerAppName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8, letterSpacing: 0.5 },
  backPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, },
  backPillText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { paddingHorizontal: isLargeScreen ? 60 : 16, paddingTop: 28, paddingBottom: 16, maxWidth: 900, alignSelf: 'center', width: '100%', },
  welcomeSection: { alignItems: 'center', marginBottom: 28 },
  welcomeTitle: { fontSize: 26, fontWeight: 'bold', color: '#2f3542', textAlign: 'center' },
  createButtonWrapper: { width: '100%', marginBottom: 32 },
  createButton: { borderRadius: 24, backgroundColor: '#4f8cff', padding: 20, },
  createButtonInner: { flexDirection: 'row', alignItems: 'center', },
  createIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16, },
  createTextBlock: { flex: 1 },
  createButtonLabel: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  createButtonSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#d1dce8', },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2f3542' },
  sessionCard: { borderRadius: 16, padding: 14, marginBottom: 10 },
  sessionCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionMeta: { flex: 1, marginRight: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sessionCode: { fontSize: 15, fontWeight: 'bold', color: '#2f3542' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  metaText: { fontSize: 12, color: '#6b7280' },
  viewSummaryBtn: { width: 68, height: 68, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 8, },
  viewSummaryText: { fontSize: 11, fontWeight: '700', color: '#4f8cff', textAlign: 'center', lineHeight: 14 },
  emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#2f3542', marginTop: 14, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8, textAlign: 'center', lineHeight: 20 },
});