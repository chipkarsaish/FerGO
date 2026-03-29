import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  ScrollView, Dimensions, Platform, StatusBar, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

// --- DYNAMIC PASS/FAIL DONUT CHART ---
const DynamicDonut = ({ passed, failed, total }) => {
  const size = 160;
  const strokeWidth = 24;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return <Circle cx={center} cy={center} r={radius} stroke="#d1d9e6" strokeWidth={strokeWidth} fill="none" />;
  }

  const passShare = (passed / total) * circumference;
  const failShare = (failed / total) * circumference;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }], position: 'absolute' }}>
      <Circle cx={center} cy={center} r={radius} fill="none" stroke="#4CAF50" strokeWidth={strokeWidth} strokeDasharray={`${passShare} ${circumference}`} />
      <Circle cx={center} cy={center} r={radius} fill="none" stroke="#FF5C5C" strokeWidth={strokeWidth} strokeDasharray={`${failShare} ${circumference}`} strokeDashoffset={-passShare} />
    </Svg>
  );
};

export default function TeacherQuizResults({ session, onBack }) {
  const [results, setResults] = useState([]);
  const [totalStudentsAttempted, setTotalStudentsAttempted] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.id) return;
    fetchResults();

    const responseSub = supabase.channel('public:quiz_responses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_responses' }, 
        () => fetchResults() // Refresh graph when new answers drop
      )
      .subscribe();

    return () => {
      supabase.removeChannel(responseSub);
    };
  }, [session]);

  const fetchResults = async () => {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('*')
      .eq('session_id', session.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!quizzes || quizzes.length === 0) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const quizIds = quizzes.map(q => q.id);
    const { data: responses } = await supabase
      .from('quiz_responses')
      .select('*')
      .in('quiz_id', quizIds);

    // --- 1. CALCULATE PASS / FAIL RATIO ---
    const studentScores = {};
    responses?.forEach(r => {
      if (!studentScores[r.student_id]) studentScores[r.student_id] = 0;
      
      const question = quizzes.find(q => q.id === r.quiz_id);
      if (question && question.correct_option === r.selected_option) {
        studentScores[r.student_id] += 1;
      }
    });

    const uniqueStudents = Object.keys(studentScores).length;
    setTotalStudentsAttempted(uniqueStudents);

    let passed = 0;
    let failed = 0;
    const passingThreshold = quizzes.length / 2; // 50% to pass

    Object.values(studentScores).forEach(score => {
      if (score >= passingThreshold) passed++;
      else failed++;
    });

    setPassCount(passed);
    setFailCount(failed);

    // --- 2. MAP DETAILED QUESTION DATA ---
    const mappedResults = quizzes.map((q) => {
      const qResponses = responses?.filter(r => r.quiz_id === q.id) || [];
      const totalAnswers = qResponses.length;

      const optionsData = q.options.map((optLabel, index) => {
        const count = qResponses.filter(r => r.selected_option === index).length;
        return {
          label: optLabel,
          count: count,
          isCorrect: q.correct_option === index
        };
      });

      return { id: q.id, text: q.text, totalAnswers, options: optionsData };
    });

    setResults(mappedResults);
    setIsLoading(false);
  };

  const getPercentage = (count, total) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4f8cff" />
        <Text style={{ marginTop: 20, fontWeight: 'bold', color: '#6b7280' }}>Crunching Live Results...</Text>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.backPillText}>Back</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.pageTitleSection}>
          <Text style={styles.pageTitle}>Live Quiz Results</Text>
          <Text style={styles.pageSubtitle}>Monitor student responses in real time</Text>
        </View>

        {/* ── NEW: CLASS PERFORMANCE SUMMARY CHART ── */}
        <NeumorphicView style={[styles.card, { padding: 24, marginBottom: 24, alignItems: 'center' }]}>
          <Text style={styles.cardTitle}>Class Performance</Text>
          
          <View style={styles.chartRow}>
            <View style={styles.chartContainer}>
              <NeumorphicView style={styles.donutOuter}>
                <DynamicDonut passed={passCount} failed={failCount} total={totalStudentsAttempted} />
                <NeumorphicView style={styles.donutInner}>
                  <Text style={styles.donutCenterMetric}>{totalStudentsAttempted}</Text>
                  <Text style={styles.donutCenterLabel}>Total</Text>
                </NeumorphicView>
              </NeumorphicView>
            </View>

            <View style={styles.statsColumn}>
              <View style={styles.statBox}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <View>
                  <Text style={styles.statNumber}>{passCount}</Text>
                  <Text style={styles.statLabel}>Passed (≥50%)</Text>
                </View>
              </View>
              <View style={[styles.statBox, { marginTop: 16 }]}>
                <View style={[styles.legendDot, { backgroundColor: '#FF5C5C' }]} />
                <View>
                  <Text style={styles.statNumber}>{failCount}</Text>
                  <Text style={styles.statLabel}>Failed {"(<50%)"}</Text>
                </View>
              </View>
            </View>
          </View>
        </NeumorphicView>

        <View style={styles.divider} />
        <Text style={[styles.cardTitle, { marginBottom: 16, marginLeft: 4 }]}>Question Breakdown</Text>

        {/* ── DETAILED RESULTS LIST ── */}
        {results.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 20 }}>No active quiz data to display.</Text>
        ) : (
          results.map((q, qIndex) => (
            <NeumorphicView key={q.id} style={styles.resultCard}>
              <Text style={styles.questionIndex}>Question {qIndex + 1}</Text>
              <Text style={styles.questionText}>{q.text}</Text>

              <View style={styles.optionsContainer}>
                {q.options.map((opt, oIndex) => {
                  const percentage = getPercentage(opt.count, q.totalAnswers);
                  return (
                    <View key={oIndex} style={styles.optionRow}>
                      <View style={styles.optionHeader}>
                        <Text style={[styles.optionLabel, opt.isCorrect && styles.correctText]}>
                          {String.fromCharCode(65 + oIndex)}. {opt.label} {opt.isCorrect && '✓'}
                        </Text>
                        <Text style={styles.optionCount}>{opt.count} students ({percentage}%)</Text>
                      </View>

                      <NeumorphicView inset style={styles.progressBarContainer}>
                        <View style={[
                          styles.progressBarFill, 
                          { width: `${percentage}%` },
                          opt.isCorrect && { backgroundColor: '#4CAF50' }
                        ]} />
                      </NeumorphicView>
                    </View>
                  );
                })}
              </View>
            </NeumorphicView>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e0e5ec' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12, paddingBottom: 14, backgroundColor: '#0ea5e9', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10, },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerAppName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8, letterSpacing: 0.5 },
  backPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  backPillText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, width: '100%', maxWidth: 700, alignSelf: 'center', },
  pageTitleSection: { alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#2f3542', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  
  // NEW SUMMARY CHART STYLES
  card: { borderRadius: 20, backgroundColor: '#e0e5ec' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2f3542', alignSelf: 'flex-start', width: '100%', marginBottom: 20 },
  chartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', flexWrap: 'wrap' },
  chartContainer: { alignItems: 'center', marginVertical: 8, marginRight: 20 },
  donutOuter: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donutInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e0e5ec', zIndex: 10, alignItems: 'center', justifyContent: 'center' },
  donutCenterMetric: { fontSize: 28, fontWeight: 'bold', color: '#2f3542' },
  donutCenterLabel: { fontSize: 12, color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase' },
  statsColumn: { justifyContent: 'center' },
  statBox: { flexDirection: 'row', alignItems: 'flex-start' },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12, marginTop: 4 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#2f3542', lineHeight: 22 },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#d1dce8', width: '100%', marginVertical: 8 },

  // BREAKDOWN STYLES
  resultCard: { borderRadius: 20, padding: 20, marginBottom: 20 },
  questionIndex: { fontSize: 12, fontWeight: 'bold', color: '#4f8cff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  questionText: { fontSize: 16, fontWeight: '600', color: '#2f3542', marginBottom: 20, lineHeight: 22 },
  optionsContainer: { gap: 16 },
  optionRow: { width: '100%' },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  optionLabel: { fontSize: 14, fontWeight: '600', color: '#4b5563', flex: 1 },
  correctText: { color: '#4CAF50', fontWeight: 'bold' },
  optionCount: { fontSize: 13, color: '#6b7280', fontWeight: 'bold' },
  progressBarContainer: { height: 14, borderRadius: 7, justifyContent: 'center', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4f8cff', borderRadius: 7 }
});