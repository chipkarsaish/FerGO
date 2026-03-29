import React, { useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  ScrollView, Dimensions, Platform, StatusBar, TextInput, Image, KeyboardAvoidingView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function TeacherQuizCreation({ session, onBack, onPublish }) {
  const [questions, setQuestions] = useState([]);
  const [draft, setDraft] = useState({ text: '', options: ['', '', '', ''], correctOption: 0 });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const updateDraftOption = (index, value) => {
    const newOptions = [...draft.options];
    newOptions[index] = value;
    setDraft({ ...draft, options: newOptions });
  };

  const handleAddQuestion = () => {
    if (!draft.text.trim()) {
      Alert.alert("Question Required", "Please enter the question text before adding it to the quiz.");
      return;
    }
    setQuestions([...questions, { ...draft, id: Date.now().toString() }]);
    setDraft({ text: '', options: ['', '', '', ''], correctOption: 0 });
  };

  const handleDelete = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  // --- NEW: SUPABASE INTEGRATION ---
  const handlePublish = async () => {
    if (questions.length === 0) {
      Alert.alert("Empty Quiz", "Please add at least one question before publishing.");
      return;
    }

    setIsPublishing(true);

    // --- NEW FIX: DEACTIVATE OLD QUIZZES FIRST ---
    // This tells the database: "Turn off any currently active questions for this session"
    await supabase
      .from('quizzes')
      .update({ is_active: false })
      .eq('session_id', session.id);

    // Now, format the NEW questions
    const dbQuestions = questions.map(q => ({
      session_id: session.id,
      text: q.text,
      options: q.options,
      correct_option: q.correctOption,
      is_active: true // Only these new ones will be active!
    }));

    // Insert the new questions
    const { error } = await supabase.from('quizzes').insert(dbQuestions);

    setIsPublishing(false);

    if (error) {
      console.error(error);
      Alert.alert("Error", "Could not publish quiz.");
    } else {
      setIsPublished(true);
    }
  };

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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

          {isPublished ? (
            <NeumorphicView style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" style={{ marginBottom: 20 }} />
              <Text style={styles.successTitle}>Quiz Published Successfully</Text>
              <Text style={styles.successSubtitle}>Students can now attempt the quiz from their dashboard.</Text>
              <Text style={styles.successHelperText}>
                Students will see the quiz in the <Text style={{ fontWeight: 'bold' }}>View Quiz</Text> banner on their interface.
              </Text>
              <TouchableOpacity onPress={() => onPublish && onPublish(questions)} activeOpacity={0.8} style={{ marginTop: 40, width: '100%' }}>
                <NeumorphicView style={styles.backDashboardButton}>
                  <Text style={styles.backDashboardButtonText}>Back to Dashboard</Text>
                </NeumorphicView>
              </TouchableOpacity>
            </NeumorphicView>
          ) : (
            <>
              <View style={styles.pageTitleSection}>
                <Text style={styles.pageTitle}>Create Quiz</Text>
                <Text style={styles.pageSubtitle}>Add questions to build your assessment</Text>
              </View>

              <NeumorphicView style={styles.card}>
                <Text style={styles.inputLabel}>Question Text</Text>
                <NeumorphicView inset style={styles.inputContainerArea}>
                  <TextInput style={[styles.textInputArea, { minHeight: 30 }]} placeholder="Enter the question here..." placeholderTextColor="#94a3b8" value={draft.text} onChangeText={(text) => setDraft({ ...draft, text })} multiline />
                </NeumorphicView>

                <Text style={[styles.inputLabel, { marginTop: 16, marginBottom: 8 }]}>Options</Text>
                <View style={styles.optionsWrap}>
                  {draft.options.map((opt, oIndex) => (
                    <View key={oIndex} style={styles.optionInputRow}>
                      <Text style={styles.optionLetterText}>{String.fromCharCode(65 + oIndex)}.</Text>
                      <NeumorphicView inset style={styles.inputContainerAreaRow}>
                        <TextInput style={styles.textInputOption} placeholder={`Option ${String.fromCharCode(65 + oIndex)}`} placeholderTextColor="#94a3b8" value={opt} onChangeText={(text) => updateDraftOption(oIndex, text)} />
                      </NeumorphicView>
                    </View>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 20, marginBottom: 12 }]}>Correct Answer</Text>
                <View style={{ zIndex: 100 }}>
                  <TouchableOpacity onPress={() => setDropdownOpen(!dropdownOpen)} activeOpacity={0.8}>
                    <NeumorphicView inset={false} style={styles.dropdownHeader}>
                      <Text style={styles.dropdownHeaderText}>Option {String.fromCharCode(65 + draft.correctOption)}</Text>
                      <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#2f3542" />
                    </NeumorphicView>
                  </TouchableOpacity>

                  {dropdownOpen && (
                    <View style={styles.dropdownListWrapper}>
                      <NeumorphicView style={styles.dropdownListContainer}>
                        {[0, 1, 2, 3].map((oIndex) => {
                          const isSelected = draft.correctOption === oIndex;
                          return (
                            <TouchableOpacity key={oIndex} style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]} onPress={() => { setDraft({ ...draft, correctOption: oIndex }); setDropdownOpen(false); }}>
                              <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>Option {String.fromCharCode(65 + oIndex)}</Text>
                              {isSelected && <Ionicons name="checkmark" size={18} color="#4f8cff" />}
                            </TouchableOpacity>
                          );
                        })}
                      </NeumorphicView>
                    </View>
                  )}
                </View>
              </NeumorphicView>

              <TouchableOpacity onPress={handleAddQuestion} activeOpacity={0.8} style={{ alignSelf: 'center', marginBottom: 40 }}>
                <NeumorphicView style={styles.addButton}>
                  <Ionicons name="add" size={20} color="#2f3542" style={{ marginRight: 8 }} />
                  <Text style={styles.addButtonText}>Add Question</Text>
                </NeumorphicView>
              </TouchableOpacity>

              {questions.length > 0 && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewSectionTitle}>Quiz Preview</Text>
                  {questions.map((q, qIndex) => (
                    <NeumorphicView key={q.id} style={styles.previewCard}>
                      <View style={styles.previewHeader}>
                        <Text style={styles.previewQuestionIndex}>Question {qIndex + 1}</Text>
                        <TouchableOpacity onPress={() => handleDelete(q.id)}><Ionicons name="trash-outline" size={20} color="#FF5C5C" /></TouchableOpacity>
                      </View>
                      <Text style={styles.previewQuestionText}>{q.text}</Text>
                      <View style={styles.previewOptionsList}>
                        {q.options.map((opt, oIndex) => {
                          const isCorrect = q.correctOption === oIndex;
                          return (
                            <View key={oIndex} style={styles.previewOptionRow}>
                              <Text style={[styles.previewOptionText, isCorrect && styles.previewOptionTextCorrect]}>{String.fromCharCode(65 + oIndex)}. {opt || `(Empty Option)`}</Text>
                              {isCorrect && (<View style={styles.correctBadge}><Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{ marginRight: 4 }} /><Text style={styles.correctBadgeText}>Correct</Text></View>)}
                            </View>
                          )
                        })}
                      </View>
                    </NeumorphicView>
                  ))}
                </View>
              )}

              <TouchableOpacity onPress={handlePublish} disabled={isPublishing} activeOpacity={0.8} style={{ marginBottom: 40 }}>
                <View style={[styles.publishButton, (questions.length === 0 || isPublishing) && { opacity: 0.5 }]}>
                  <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.publishButtonText}>{isPublishing ? "Publishing..." : "Publish Quiz"}</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
  card: { borderRadius: 20, padding: 16, marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#2f3542', marginBottom: 6 },
  inputContainerArea: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  textInputArea: { fontSize: 13, color: '#2f3542', outlineStyle: 'none' },
  optionsWrap: { gap: 6 },
  optionInputRow: { flexDirection: 'row', alignItems: 'center' },
  optionLetterText: { fontSize: 13, fontWeight: 'bold', color: '#4b5563', width: 22 },
  inputContainerAreaRow: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 8 : 4 },
  textInputOption: { fontSize: 13, color: '#2f3542', outlineStyle: 'none' },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#e0e5ec' },
  dropdownHeaderText: { fontSize: 14, color: '#2f3542', fontWeight: '600' },
  dropdownListWrapper: { marginTop: 8 },
  dropdownListContainer: { borderRadius: 14, backgroundColor: '#e0e5ec', paddingVertical: 6 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemSelected: { backgroundColor: 'rgba(79, 140, 255, 0.08)' },
  dropdownItemText: { fontSize: 14, color: '#6b7280' },
  dropdownItemTextSelected: { color: '#4f8cff', fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, backgroundColor: '#e0e5ec' },
  addButtonText: { fontSize: 15, fontWeight: 'bold', color: '#2f3542' },
  previewSection: { marginTop: 16, marginBottom: 30 },
  previewSectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#2f3542', marginBottom: 20, textAlign: 'center' },
  previewCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  previewQuestionIndex: { fontSize: 12, fontWeight: 'bold', color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewQuestionText: { fontSize: 15, fontWeight: '600', color: '#2f3542', marginBottom: 12, lineHeight: 22 },
  previewOptionsList: { gap: 6 },
  previewOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  previewOptionText: { fontSize: 13, color: '#4b5563', flex: 1 },
  previewOptionTextCorrect: { color: '#4CAF50', fontWeight: 'bold' },
  correctBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  correctBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#4CAF50' },
  publishButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 28, backgroundColor: '#4f8cff', shadowColor: '#4f8cff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  publishButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  successCard: { borderRadius: 24, padding: 40, alignItems: 'center', marginTop: 20 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#2f3542', marginBottom: 12, textAlign: 'center' },
  successSubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  successHelperText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 20 },
  backDashboardButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, backgroundColor: '#e0e5ec' },
  backDashboardButtonText: { fontSize: 16, fontWeight: 'bold', color: '#4f8cff' },
});