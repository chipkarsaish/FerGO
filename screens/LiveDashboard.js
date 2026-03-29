import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, SafeAreaView, Platform, StatusBar, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;
const cardPadding = isLargeScreen ? 24 : 16;
const cardMargin = isLargeScreen ? 24 : 12;

// --- DYNAMIC SVG DONUT COMPONENT ---
const DynamicDonut = ({ gotIt, sortOf, lost, total }) => {
  const size = 180;
  const strokeWidth = 30;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return <Circle cx={center} cy={center} r={radius} stroke="#d1d9e6" strokeWidth={strokeWidth} fill="none" />;
  }

  const gotItShare = (gotIt / total) * circumference;
  const sortOfShare = (sortOf / total) * circumference;
  const lostShare = (lost / total) * circumference;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }], position: 'absolute' }}>
      <Circle cx={center} cy={center} r={radius} fill="none" stroke="#4CAF50" strokeWidth={strokeWidth} strokeDasharray={`${gotItShare} ${circumference}`} />
      <Circle cx={center} cy={center} r={radius} fill="none" stroke="#FFC107" strokeWidth={strokeWidth} strokeDasharray={`${sortOfShare} ${circumference}`} strokeDashoffset={-gotItShare} />
      <Circle cx={center} cy={center} r={radius} fill="none" stroke="#FF5C5C" strokeWidth={strokeWidth} strokeDasharray={`${lostShare} ${circumference}`} strokeDashoffset={-(gotItShare + sortOfShare)} />
    </Svg>
  );
};

export default function LiveDashboard({ session, onEndSession, onBack, onCreateQuiz, onLiveQuiz }) {
  // --- REAL-TIME STATE ---
  const [questions, setQuestions] = useState([]);
  const [pulseActive, setPulseActive] = useState(false);
  const [currentPulseId, setCurrentPulseId] = useState(null);
  const [pulseCount, setPulseCount] = useState(0);
  const [pulseHistory, setPulseHistory] = useState([]);
  const [responsesCount, setResponsesCount] = useState({ gotIt: 0, sortOf: 0, lost: 0, total: 0 });

  const [quizActive, setQuizActive] = useState(false);

  const repulseTimeout = useRef(null);

  useEffect(() => {
    return () => {
      if (repulseTimeout.current) clearTimeout(repulseTimeout.current);
    };
  }, []);

  const displayCode = session?.code || 'ERROR';
  const sessionId = session?.id;

  // --- SUPABASE SUBSCRIPTIONS ---
  useEffect(() => {
    if (!sessionId) return;

    const doubtSub = supabase
      .channel('public:doubts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doubts', filter: `session_id=eq.${sessionId}` },
        (payload) => setQuestions((prev) => [payload.new, ...prev])
      )
      .subscribe();

    const responseSub = supabase
      .channel('public:responses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' },
        (payload) => {
          if (payload.new.pulse_id === currentPulseId) {
            setResponsesCount(prev => {
              const newStats = { ...prev, total: prev.total + 1 };
              if (payload.new.status === 'got_it') newStats.gotIt++;
              if (payload.new.status === 'sort_of') newStats.sortOf++;
              if (payload.new.status === 'lost') newStats.lost++;
              return newStats;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(doubtSub);
      supabase.removeChannel(responseSub);
    };
  }, [sessionId, currentPulseId]);

  const handleDismiss = async (id) => {
    setQuestions(questions.filter(q => q.id !== id));
    await supabase.from('doubts').update({ is_answered: true }).eq('id', id);
  };

  const startPulse = async () => {
    if (!sessionId) { alert("Error: No Active Session ID found!"); return; }

    setPulseActive(true);
    setPulseCount(prev => prev + 1);
    setResponsesCount({ gotIt: 0, sortOf: 0, lost: 0, total: 0 });

    const { data, error } = await supabase.from('pulses').insert([{ session_id: sessionId, is_open: true }]).select();

    if (error) {
      console.error("PULSE ERROR:", error);
      alert("Database Error: Could not start pulse.");
      setPulseActive(false);
    } else if (data && data.length > 0) {
      setCurrentPulseId(data[0].id);
    }
  };

  const endPulse = async () => {
    setPulseActive(false);
    if (currentPulseId) await supabase.from('pulses').update({ is_open: false }).eq('id', currentPulseId);

    if (responsesCount.total > 0) {
      const gotItPct = getPercentage(responsesCount.gotIt, responsesCount.total);
      setPulseHistory([{ id: pulseCount, title: `Topic Feedback`, gotItPct }, ...pulseHistory]);
    }
  };

  // --- NEW: RE-PULSE LOGIC ---
  const handleRepulse = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("This will end the current pulse and instantly start a new one. Proceed?")) {
        executeRepulse();
      }
    } else {
      Alert.alert("Re-Pulse", "This will end the current pulse and instantly start a new one. Proceed?", [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Re-Pulse", onPress: () => executeRepulse() }
      ]);
    }
  };

  const executeRepulse = async () => {
    await endPulse();
    repulseTimeout.current = setTimeout(() => {
      startPulse();
    }, 400);
  };

  const handleEndSession = async () => {
    if (sessionId) await supabase.from('sessions').update({ is_active: false }).eq('id', sessionId);
    onEndSession();
  };

  const getPercentage = (value, total) => total === 0 ? '0%' : Math.round((value / total) * 100) + '%';

  // --- NEW: 40% CONFUSION THRESHOLD ---
  const confusedCount = responsesCount.lost + responsesCount.sortOf;
  // Requires at least 2 responses so one quick "Lost" click doesn't trigger alarms instantly
  const isHighConfusion = pulseActive && responsesCount.total >= 2 && ((confusedCount / responsesCount.total) >= 0.4);

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

        <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
          <View style={styles.backPill}>
            <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.backPillText}>Back</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.maxWidthContainer}>

          {/* SESSION JOIN CARD */}
          <NeumorphicView style={[styles.card, { padding: cardPadding }]}>
            <View style={isLargeScreen ? styles.row : styles.column}>
              <View style={[styles.flex1, styles.qrSection]}>
                <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Scan to Join Session</Text>
                <NeumorphicView inset={true} style={styles.qrContainer}>
                  <QRCode value={displayCode} size={90} color="#2f3542" backgroundColor="transparent" />
                </NeumorphicView>
                <Text style={styles.secondaryText}>Students can scan this QR code to join the session instantly.</Text>
              </View>

              <View style={[styles.flex1, styles.joinCodeSection]}>
                <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Session Code</Text>
                <View style={[styles.codeRow, { marginBottom: 16 }]}>
                  <NeumorphicView style={styles.pillContainer}>
                    <Text style={styles.largeCodeText} numberOfLines={1} adjustsFontSizeToFit>{displayCode}</Text>
                  </NeumorphicView>
                  <TouchableOpacity>
                    <NeumorphicView style={styles.iconButton}>
                      <Ionicons name="copy-outline" size={20} color="#4f8cff" />
                    </NeumorphicView>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </NeumorphicView>

          {/* END SESSION CARD */}
          <NeumorphicView style={[styles.card, { padding: cardPadding }, styles.spacingTop]}>
            <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { marginBottom: isLargeScreen ? 0 : 12 }]}>Session Management</Text>
              <TouchableOpacity onPress={handleEndSession}>
                <NeumorphicView style={[styles.pulseButtonDanger, { paddingVertical: 10, paddingHorizontal: 20 }]}>
                  <Ionicons name="power" size={18} color="#FF5C5C" style={{ marginRight: 8 }} />
                  <Text style={[styles.pulseButtonText, { color: '#FF5C5C', fontSize: 14 }]}>End Session</Text>
                </NeumorphicView>
              </TouchableOpacity>
            </View>
          </NeumorphicView>

          {/* QUIZ CONTROL PANEL */}
          <NeumorphicView style={[styles.card, { padding: isLargeScreen ? 16 : 12 }, styles.spacingTop]}>
            <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', justifyContent: 'space-between', alignItems: isLargeScreen ? 'center' : 'flex-start' }}>
              <View style={{ marginBottom: isLargeScreen ? 0 : 10 }}>
                <Text style={[styles.cardTitle, { marginBottom: 4, textAlign: 'left', fontSize: isLargeScreen ? 18 : 16 }]}>Live Quiz</Text>
                <View style={[styles.statusRow, { marginBottom: 0 }]}>
                  <Text style={styles.cardLabelSmall}>Status:  </Text>
                  {quizActive ? (
                    <View style={[styles.quizBadgeActive, { paddingVertical: 2, paddingHorizontal: 8 }]}>
                      <View style={[styles.glowingDot, { backgroundColor: '#4f8cff', width: 6, height: 6, borderRadius: 3 }]} />
                      <Text style={[styles.statusTextActive, { fontSize: 13 }]}>Quiz Active</Text>
                    </View>
                  ) : (
                    <Text style={[styles.statusTextClosed, { fontSize: 13 }]}>No active quiz</Text>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 8, marginTop: isLargeScreen ? 0 : 10, width: isLargeScreen ? 'auto' : '100%' }}>
                <TouchableOpacity onPress={onLiveQuiz} style={isLargeScreen ? {} : { width: '100%' }}>
                  <NeumorphicView style={[styles.pulseButtonPrimary, { paddingVertical: 10, paddingHorizontal: 16 }]}>
                    <Ionicons name="bar-chart" size={18} color="#4f8cff" style={{ marginRight: 6 }} />
                    <Text style={[styles.pulseButtonText, { fontSize: 14 }]} numberOfLines={1}>Live Quiz</Text>
                  </NeumorphicView>
                </TouchableOpacity>

                <TouchableOpacity onPress={onCreateQuiz} style={isLargeScreen ? {} : { width: '100%' }}>
                  <NeumorphicView style={[styles.pulseButtonPrimary, { paddingVertical: 10, paddingHorizontal: 16 }]}>
                    <Ionicons name="add-circle" size={18} color="#4f8cff" style={{ marginRight: 6 }} />
                    <Text style={[styles.pulseButtonText, { fontSize: 14 }]} numberOfLines={1}>Create Quiz</Text>
                  </NeumorphicView>
                </TouchableOpacity>
              </View>
            </View>
          </NeumorphicView>

          {/* PULSE CONTROL PANEL */}
          <NeumorphicView style={[styles.card, { padding: cardPadding }, styles.spacingTop]}>
            <Text style={styles.cardTitle}>Pulse Check Control</Text>
            <View style={[isLargeScreen ? styles.row : styles.column, { alignItems: 'center', justifyContent: 'space-between' }]}>
              <TouchableOpacity onPress={pulseActive ? endPulse : startPulse} style={isLargeScreen ? { flex: 1 } : { width: '100%', marginBottom: 20 }}>
                <NeumorphicView style={pulseActive ? styles.pulseButtonDanger : styles.pulseButtonPrimary}>
                  <Ionicons name="pulse" size={24} color={pulseActive ? "#FF5C5C" : "#4f8cff"} style={{ marginRight: 8 }} />
                  <Text style={[styles.pulseButtonText, pulseActive && { color: '#FF5C5C' }]}>
                    {pulseActive ? 'End Pulse Check' : 'Start Pulse Check'}
                  </Text>
                </NeumorphicView>
              </TouchableOpacity>

              <View style={[styles.centerContent, isLargeScreen ? { flex: 1 } : { width: '100%', marginBottom: 20 }]}>
                <View style={styles.statusRow}>
                  <Text style={styles.cardLabel}>Pulse Status:  </Text>
                  {pulseActive ? (
                    <View style={styles.statusBadgeActive}>
                      <View style={styles.glowingDot} />
                      <Text style={styles.statusTextActive}>Active</Text>
                    </View>
                  ) : (
                    <Text style={styles.statusTextClosed}>Closed</Text>
                  )}
                </View>
                <Text style={styles.secondaryText}>
                  Live Responses: {responsesCount.total}
                </Text>
              </View>
            </View>
          </NeumorphicView>

          {pulseActive && (
            <Text style={[styles.pulseHistoryLabel, { textAlign: 'center', marginBottom: 12 }]}>
              Pulse #{pulseCount} — Topic Feedback
            </Text>
          )}

          {/* LIVE COMPREHENSION CARDS */}
          <View style={[isLargeScreen ? styles.row : styles.rowWrap, styles.spacingTop]}>
            <NeumorphicView style={[styles.smallCard, styles.flex1, { opacity: pulseActive ? 1 : 0.4 }, isLargeScreen ? { marginRight: cardMargin } : styles.mobileCardMargin]} isGlow={pulseActive} glowColor="#4CAF50">
              <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                {pulseActive ? (
                  <>
                    <Text style={[styles.metricNumber, { color: '#4CAF50' }]} numberOfLines={1}>{responsesCount.gotIt}</Text>
                    <Text style={styles.cardLabelSmall}>Got It</Text>
                    <Text style={styles.subtitleText}>{responsesCount.gotIt} responses</Text>
                    <Text style={styles.percentageText}>{getPercentage(responsesCount.gotIt, responsesCount.total)}</Text>
                  </>
                ) : (
                  <View style={{ height: 80, justifyContent: 'center' }}><Text style={styles.waitingText}>Waiting for{'\n'}Pulse Check</Text></View>
                )}
              </View>
            </NeumorphicView>

            <NeumorphicView style={[styles.smallCard, styles.flex1, { opacity: pulseActive ? 1 : 0.4 }, isLargeScreen ? { marginRight: cardMargin } : styles.mobileCardMargin]}>
              <View style={styles.centerContent}>
                <MaterialCommunityIcons name="head-lightbulb-outline" size={28} color="#FFC107" />
                {pulseActive ? (
                  <>
                    <Text style={[styles.metricNumber, { color: '#FFC107' }]} numberOfLines={1}>{responsesCount.sortOf}</Text>
                    <Text style={styles.cardLabelSmall}>Sort Of</Text>
                    <Text style={styles.subtitleText}>{responsesCount.sortOf} responses</Text>
                    <Text style={styles.percentageText}>{getPercentage(responsesCount.sortOf, responsesCount.total)}</Text>
                  </>
                ) : (
                  <View style={{ height: 80, justifyContent: 'center' }}><Text style={styles.waitingText}>Waiting for{'\n'}Pulse Check</Text></View>
                )}
              </View>
            </NeumorphicView>

            <NeumorphicView style={[styles.smallCard, styles.flex1, { opacity: pulseActive ? 1 : 0.4 }, isLargeScreen ? {} : styles.mobileCardMargin]}>
              <View style={styles.centerContent}>
                <Ionicons name="alert-circle" size={28} color="#FF5C5C" />
                {pulseActive ? (
                  <>
                    <Text style={[styles.metricNumber, { color: '#FF5C5C' }]} numberOfLines={1}>{responsesCount.lost}</Text>
                    <Text style={styles.cardLabelSmall}>Lost</Text>
                    <Text style={styles.subtitleText}>{responsesCount.lost} responses</Text>
                    <Text style={styles.percentageText}>{getPercentage(responsesCount.lost, responsesCount.total)}</Text>
                  </>
                ) : (
                  <View style={{ height: 80, justifyContent: 'center' }}><Text style={styles.waitingText}>Waiting for{'\n'}Pulse Check</Text></View>
                )}
              </View>
            </NeumorphicView>
          </View>

          {/* LIVE UNDERSTANDING CHART */}
          <NeumorphicView style={[styles.card, { padding: cardPadding, opacity: pulseActive ? 1 : 0.5 }, styles.spacingTop]}>
            <Text style={styles.cardTitle}>Pulse Check Results</Text>
            <View style={styles.chartContainer}>
              <NeumorphicView style={styles.donutOuter}>
                <DynamicDonut {...responsesCount} />
                <NeumorphicView style={styles.donutInner} />
              </NeumorphicView>

              <View style={styles.legendContainer}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} /><Text style={styles.cardLabelSmall}>Got It</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} /><Text style={styles.cardLabelSmall}>Sort Of</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FF5C5C' }]} /><Text style={styles.cardLabelSmall}>Lost</Text></View>
              </View>
            </View>
          </NeumorphicView>

          {/* --- NEW: HIGH CONFUSION RE-PULSE ALERT --- */}
          {isHighConfusion && (
            <NeumorphicView style={[styles.card, { padding: cardPadding }, styles.spacingTop]} isGlow={true} glowColor="#FFC107">
              <View style={styles.alertRow}>
                <View style={styles.alertIcon}>
                  <Ionicons name="warning" size={32} color="#F57C00" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.alertTitle}>High Confusion Detected!</Text>
                  <Text style={styles.alertSubtext}>
                    {getPercentage(confusedCount, responsesCount.total)} of students are struggling with this concept.
                  </Text>
                  <TouchableOpacity style={{ marginTop: 14 }} onPress={handleRepulse} activeOpacity={0.7}>
                    <NeumorphicView inset={false} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#fff8e1', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#ffe082' }}>
                      <Text style={{ color: '#F57C00', fontWeight: 'bold', fontSize: 13 }}>↻ Re-Pulse Now</Text>
                    </NeumorphicView>
                  </TouchableOpacity>
                </View>
              </View>
            </NeumorphicView>
          )}

          {/* PULSE HISTORY */}
          <NeumorphicView style={[styles.card, { padding: cardPadding }, styles.spacingTop]}>
            <Text style={styles.cardTitle}>Pulse History</Text>
            <View style={styles.questionsContainer}>
              {pulseHistory.length === 0 ? (
                <Text style={styles.secondaryText}>No pulses run yet for this session.</Text>
              ) : (
                pulseHistory.map((ph, idx) => (
                  <View key={idx} style={styles.historyRow}>
                    <Ionicons name="analytics" size={20} color="#6b7280" />
                    <Text style={[styles.cardLabelSmall, { marginLeft: 12, flex: 1, textAlign: 'left' }]}>Pulse {ph.id} — {ph.title}</Text>
                    <Text style={[styles.percentageText, { marginTop: 0 }]}>{ph.gotItPct} Got It</Text>
                  </View>
                ))
              )}
            </View>
          </NeumorphicView>

          {/* ANONYMOUS QUESTION QUEUE */}
          <NeumorphicView style={[styles.card, { padding: cardPadding }, styles.spacingTop]}>
            <Text style={styles.cardTitle}>Anonymous Questions</Text>
            <View style={styles.questionsContainer}>
              {questions.length === 0 ? (
                <Text style={styles.secondaryText}>No questions at the moment.</Text>
              ) : (
                questions.map((q) => (
                  <NeumorphicView key={q.id} style={styles.questionCard}>
                    <Text style={styles.questionText}>"{q.content || q.text}"</Text>
                    <View style={styles.questionActions}>
                      <TouchableOpacity onPress={() => handleDismiss(q.id)}>
                        <NeumorphicView style={styles.actionButtonSecondary}>
                          <Text style={styles.actionButtonTextSecondary}>Dismiss / Answered</Text>
                        </NeumorphicView>
                      </TouchableOpacity>
                    </View>
                  </NeumorphicView>
                ))
              )}
            </View>
          </NeumorphicView>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12, paddingBottom: 14, backgroundColor: '#0ea5e9', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10, },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerAppName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8, letterSpacing: 0.5 },
  backPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  backPillText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  safeArea: { flex: 1, backgroundColor: '#e0e5ec' },
  scrollContainer: { padding: Platform.OS === 'web' ? 40 : 16, alignItems: 'center', backgroundColor: '#e0e5ec', minHeight: '100%' },
  maxWidthContainer: { width: '100%', maxWidth: 1200 },
  card: { borderRadius: 24, marginBottom: isLargeScreen ? 24 : 16 },
  smallCard: { borderRadius: 20, padding: 12, marginBottom: isLargeScreen ? 24 : 16 },
  cardTitle: { fontSize: isLargeScreen ? 20 : 18, fontWeight: 'bold', color: '#2f3542', marginBottom: 16, textAlign: isLargeScreen ? 'left' : 'center' },
  row: { flexDirection: 'row' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  column: { flexDirection: 'column' },
  flex1: { flex: 1, minWidth: isLargeScreen ? 0 : 90 },
  mobileCardMargin: { marginHorizontal: 4 },
  spacingTop: { marginTop: 0 },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  pulseButtonPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, backgroundColor: '#e0e5ec' },
  pulseButtonDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, backgroundColor: '#e0e5ec' },
  pulseButtonText: { fontSize: 18, fontWeight: 'bold', color: '#4f8cff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusBadgeActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0ebf6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#4f8cff33' },
  quizBadgeActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f0ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#4f8cff33' },
  glowingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f8cff', marginRight: 6 },
  statusTextActive: { fontSize: 16, fontWeight: 'bold', color: '#4f8cff' },
  statusTextClosed: { fontSize: 16, fontWeight: 'bold', color: '#6b7280' },
  waitingText: { textAlign: 'center', fontSize: 13, color: '#6b7280', fontWeight: 'bold', fontStyle: 'italic' },
  subtitleText: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  pulseHistoryLabel: { fontSize: 14, fontWeight: 'bold', color: '#4f8cff', letterSpacing: 1 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d1d9e6' },
  qrSection: { alignItems: 'center', borderRightWidth: isLargeScreen ? 1 : 0, borderBottomWidth: isLargeScreen ? 0 : 1, borderColor: '#d1d9e6', paddingRight: isLargeScreen ? 24 : 0, paddingBottom: isLargeScreen ? 0 : 16, marginBottom: isLargeScreen ? 0 : 16 },
  qrContainer: { width: 120, height: 120, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  secondaryText: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 8 },
  joinCodeSection: { paddingLeft: isLargeScreen ? 24 : 0, alignItems: isLargeScreen ? 'flex-start' : 'center', paddingTop: isLargeScreen ? 0 : 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  pillContainer: { borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20, marginRight: 12, maxWidth: 150 },
  largeCodeText: { fontSize: isLargeScreen ? 32 : 24, fontWeight: 'bold', color: '#2f3542', textAlign: 'center' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  metricNumber: { fontSize: isLargeScreen ? 36 : 28, fontWeight: 'bold', color: '#2f3542', marginVertical: 4, textAlign: 'center' },
  cardLabel: { fontSize: isLargeScreen ? 16 : 14, fontWeight: '600', color: '#2f3542', textAlign: 'center' },
  cardLabelSmall: { fontSize: 12, fontWeight: '600', color: '#2f3542', textAlign: 'center' },
  percentageText: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginTop: 4 },
  alertRow: { flexDirection: 'row', alignItems: 'center' },
  alertIcon: { marginRight: 16 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#F57C00', marginBottom: 4 },
  alertSubtext: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  questionsContainer: { marginTop: 8 },
  questionCard: { padding: 16, borderRadius: 16, marginBottom: 16, flexDirection: 'column', alignItems: 'flex-start' },
  questionText: { fontSize: 14, color: '#2f3542', fontStyle: 'italic', marginBottom: 16 },
  questionActions: { flexDirection: 'row', gap: 10 },
  actionButtonSecondary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionButtonTextSecondary: { color: '#6b7280', fontWeight: 'bold', fontSize: 12 },
  chartContainer: { alignItems: 'center', marginVertical: 16 },
  donutOuter: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  donutInner: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#e0e5ec', zIndex: 10 },
  legendContainer: { flexDirection: 'row', marginTop: 24, justifyContent: 'center', width: '100%', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
});