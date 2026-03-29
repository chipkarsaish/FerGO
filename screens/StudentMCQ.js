import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  ScrollView, Dimensions, Platform, StatusBar, Image, ActivityIndicator, AppState, BackHandler, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function StudentMCQ({ sessionCode, onLeave, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [deviceId, setDeviceId] = useState(null);

  // --- INITIALIZE & REAL-TIME REFRESH ---
  useEffect(() => {
    let quizSub;

    const initializeQuiz = async () => {
      setIsLoading(true);

      let storedId = await AsyncStorage.getItem('feargo_device_id');
      if (!storedId) {
        storedId = 'device_' + Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem('feargo_device_id', storedId);
      }
      setDeviceId(storedId);

      const { data: sessionData } = await supabase.from('sessions').select('id').eq('code', sessionCode).single();

      if (sessionData) {
        const { data: quizData } = await supabase.from('quizzes').select('*').eq('session_id', sessionData.id).eq('is_active', true);

        if (quizData && quizData.length > 0) {
          setQuestions(quizData);

          const currentQuizIds = quizData.map(q => q.id);
          const { data: pastResponses } = await supabase.from('quiz_responses').select('*').eq('student_id', storedId).in('quiz_id', currentQuizIds);

          if (pastResponses && pastResponses.length > 0) {
            let restoredAnswers = {};
            pastResponses.forEach(r => restoredAnswers[r.quiz_id] = r.selected_option);
            setSelectedAnswers(restoredAnswers);
            setIsSubmitted(true);
          }
        }

        quizSub = supabase.channel('mcq_screen_refresh')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quizzes', filter: `session_id=eq.${sessionData.id}` }, (payload) => {
            if (payload.new.is_active) {
              setIsSubmitted(false);
              setSelectedAnswers({});
              setCurrentQuestionIndex(0);
              initializeQuiz();
            }
          }).subscribe();
      }
      setIsLoading(false);
    };

    initializeQuiz();

    return () => {
      if (quizSub) supabase.removeChannel(quizSub);
    };
  }, [sessionCode]);

  // --- CORRECTED: ANTI-CHEAT EXAM MODE ---
  useEffect(() => {
    // 1. Block the Android Hardware Back Button
    const onBackPress = () => {
      if (Platform.OS === 'web') alert("Exam Mode Active: You cannot go back during a live quiz.");
      else Alert.alert("Exam Mode", "You cannot go back during an active exam.");
      return true;
    };

    // FIX: Assign the listener to a variable
    const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // 2. Detect if they switch apps
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if ((nextAppState === 'background' || nextAppState === 'inactive') && !isSubmitted) {
        if (Platform.OS === 'web') alert("Session Disconnected: You left the app during an active exam.");
        else Alert.alert("Disconnected", "You left the app during an active exam.");
        onLeave();
      }
    });

    return () => {
      // FIX: Use the .remove() method on the subscriptions
      backHandlerSubscription.remove();
      appStateSubscription.remove();
    };
  }, [isSubmitted, onLeave]);

  const currentQ = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isComplete = Object.keys(selectedAnswers).length === totalQuestions;

  const handleSelect = (qId, optionIndex) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: optionIndex }));
  };

  const handleNext = () => { if (currentQuestionIndex < totalQuestions - 1) setCurrentQuestionIndex(prev => prev + 1); };
  const handlePrev = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1); };

  const handleSubmit = async () => {
    if (isSubmitted || !deviceId) return;
    setIsSubmitted(true);

    const responses = Object.keys(selectedAnswers).map(quizId => ({
      quiz_id: quizId,
      student_id: deviceId,
      selected_option: selectedAnswers[quizId]
    }));

    const { error } = await supabase.from('quiz_responses').insert(responses);

    if (error) {
      console.error("Submission error:", error);
      if (Platform.OS === 'web') alert("Error submitting quiz.");
      else Alert.alert("Error", "Could not submit quiz.");
      setIsSubmitted(false);
    }
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct_option) score += 1;
    });
    return score;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4f8cff" />
        <Text style={{ marginTop: 20 }}>Loading Live Quiz...</Text>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: '#2f3542' }}>No active quiz found.</Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 20 }}><Text style={{ color: '#4f8cff', fontWeight: 'bold' }}>Go Back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/logo.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <Text style={styles.headerAppName}>FearGo</Text>
        </View>
        <View style={styles.headerRight}>
          {/* ONLY show the back button IF they have submitted the quiz */}
          {isSubmitted && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
              <View style={styles.backPill}>
                <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.backPillText}>Back</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {isSubmitted ? (
          <View style={{ width: '100%' }}>
            {/* SCORE SUMMARY */}
            <NeumorphicView style={[styles.resultCard, { marginBottom: 24 }]}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" style={{ marginBottom: 20 }} />
              <Text style={styles.resultTitle}>Quiz Submitted!</Text>
              <NeumorphicView inset style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>Your Score</Text>
                <Text style={styles.scoreValue}>{calculateScore()} / {totalQuestions}</Text>
              </NeumorphicView>
            </NeumorphicView>

            {/* DETAILED ANALYSIS LIST */}
            <Text style={styles.analysisTitle}>Detailed Analysis</Text>
            {questions.map((q, idx) => {
              const studentAns = selectedAnswers[q.id];
              const isCorrect = studentAns === q.correct_option;

              return (
                <NeumorphicView key={q.id} style={styles.analysisCard}>
                  <View style={styles.analysisHeader}>
                    <Text style={styles.analysisQNum}>Question {idx + 1}</Text>
                    <Ionicons name={isCorrect ? "checkmark-circle" : "close-circle"} size={24} color={isCorrect ? "#4CAF50" : "#FF5C5C"} />
                  </View>
                  <Text style={styles.analysisQText}>{q.text}</Text>

                  {q.options.map((opt, oIdx) => {
                    const isStudentChoice = studentAns === oIdx;
                    const isActualCorrect = q.correct_option === oIdx;

                    let bgColor = '#e0e5ec';
                    let borderColor = 'transparent';

                    if (isActualCorrect) { bgColor = '#e8f5e9'; borderColor = '#4CAF50'; }
                    else if (isStudentChoice && !isActualCorrect) { bgColor = '#ffebee'; borderColor = '#FF5C5C'; }

                    return (
                      <View key={oIdx} style={[styles.analysisOption, { backgroundColor: bgColor, borderColor: borderColor, borderWidth: (isActualCorrect || isStudentChoice) ? 2 : 0 }]}>
                        <Text style={[styles.analysisOptionText, isActualCorrect && { fontWeight: 'bold', color: '#2e7d32' }]}>
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </Text>
                        {isStudentChoice && <Text style={{ fontSize: 10, fontWeight: 'bold', color: isCorrect ? '#4CAF50' : '#FF5C5C' }}>YOUR ANSWER</Text>}
                        {isActualCorrect && !isStudentChoice && <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#4CAF50' }}>CORRECT</Text>}
                      </View>
                    )
                  })}
                </NeumorphicView>
              )
            })}

            <TouchableOpacity style={{ marginTop: 20, marginBottom: 40 }} onPress={onBack} activeOpacity={0.8}>
              <View style={styles.submitButton}>
                <Ionicons name="arrow-back" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Return to Ask Doubts</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <NeumorphicView style={styles.card}>
              <Text style={styles.questionIndex}>Question {currentQuestionIndex + 1} of {totalQuestions}</Text>
              <Text style={styles.questionText}>{currentQ.text}</Text>

              <View style={styles.optionsContainer}>
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = selectedAnswers[currentQ.id] === oIdx;
                  return (
                    <TouchableOpacity key={oIdx} onPress={() => handleSelect(currentQ.id, oIdx)} activeOpacity={0.8} style={{ marginBottom: 16 }}>
                      <NeumorphicView inset={isSelected} style={[styles.optionCard, isSelected && styles.optionCardSelected]}>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{opt}</Text>
                      </NeumorphicView>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.navigationRow}>
                <TouchableOpacity onPress={handlePrev} disabled={currentQuestionIndex === 0} activeOpacity={0.7} style={styles.navTouchWrapper}>
                  <NeumorphicView style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}>
                    <Ionicons name="chevron-back" size={20} color={currentQuestionIndex === 0 ? '#a0aab5' : '#4f8cff'} />
                    <Text style={[styles.navButtonText, currentQuestionIndex === 0 && { color: '#a0aab5' }]} numberOfLines={1} adjustsFontSizeToFit>Previous</Text>
                  </NeumorphicView>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNext} disabled={currentQuestionIndex === totalQuestions - 1} activeOpacity={0.7} style={styles.navTouchWrapper}>
                  <NeumorphicView style={[styles.navButton, currentQuestionIndex === totalQuestions - 1 && styles.navButtonDisabled]}>
                    <Text style={[styles.navButtonText, currentQuestionIndex === totalQuestions - 1 && { color: '#a0aab5' }]} numberOfLines={1} adjustsFontSizeToFit>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color={currentQuestionIndex === totalQuestions - 1 ? '#a0aab5' : '#4f8cff'} />
                  </NeumorphicView>
                </TouchableOpacity>
              </View>
            </NeumorphicView>

            <TouchableOpacity style={{ marginTop: 10, marginBottom: 40 }} disabled={!isComplete} activeOpacity={0.8} onPress={handleSubmit}>
              <View style={[styles.submitButton, { opacity: isComplete ? 1 : 0.45 }]}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.submitButtonText}>Submit Quiz</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e0e5ec' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12, paddingBottom: 14, backgroundColor: '#0ea5e9', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10, },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAppName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8, letterSpacing: 0.5 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  backPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  backPillText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, width: '100%', maxWidth: 700, alignSelf: 'center', },
  card: { borderRadius: 20, padding: 16, marginBottom: 16 },
  questionIndex: { fontSize: 12, fontWeight: 'bold', color: '#0ea5e9', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  questionText: { fontSize: 16, fontWeight: '600', color: '#2f3542', marginBottom: 16, lineHeight: 22 },
  optionsContainer: { marginTop: 4 },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#e0e5ec', },
  optionCardSelected: { backgroundColor: 'rgba(79, 140, 255, 0.08)', borderColor: '#4f8cff', borderWidth: 1, },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#a0aab5', alignItems: 'center', justifyContent: 'center', marginRight: 12, },
  radioCircleSelected: { borderColor: '#4f8cff', },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4f8cff', },
  optionText: { fontSize: 13, color: '#4b5563', flex: 1, fontWeight: '500' },
  optionTextSelected: { color: '#4f8cff', fontWeight: 'bold' },
  navigationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', gap: 12, },
  navTouchWrapper: { flex: 1, },
  navButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 10, borderRadius: 16, },
  navButtonDisabled: { opacity: 0.6, },
  navButtonText: { fontSize: 13, fontWeight: '700', color: '#4f8cff', marginHorizontal: 4, },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 28, backgroundColor: '#4f8cff', shadowColor: '#4f8cff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8, },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  resultCard: { borderRadius: 24, padding: 32, alignItems: 'center', marginTop: 10 },
  resultTitle: { fontSize: 24, fontWeight: 'bold', color: '#2f3542', marginBottom: 16, textAlign: 'center' },
  scoreBox: { padding: 24, borderRadius: 20, alignItems: 'center', width: '100%', maxWidth: 300, },
  scoreLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  scoreValue: { fontSize: 42, fontWeight: 'bold', color: '#0ea5e9' },
  analysisTitle: { fontSize: 20, fontWeight: 'bold', color: '#2f3542', marginBottom: 16, paddingLeft: 4 },
  analysisCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  analysisQNum: { fontSize: 13, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' },
  analysisQText: { fontSize: 15, fontWeight: '600', color: '#2f3542', marginBottom: 16 },
  analysisOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  analysisOptionText: { fontSize: 14, color: '#4b5563', flex: 1 }
});