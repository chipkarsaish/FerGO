import React, { useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, Dimensions, Platform, StatusBar, Image, KeyboardAvoidingView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function TeacherLogin({ onLogin, onBack }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState(''); // NEW: Name state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    // Basic validation
    if (!email || !password || (isSignUp && !name)) {
      Alert.alert("Missing Fields", "Please fill out all required fields.");
      return;
    }

    setIsLoading(true);

    if (isSignUp) {
      // 1. REGISTER NEW TEACHER IN AUTH VAULT
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        Alert.alert("Sign Up Failed", error.message);
      } else if (data.user) {
        
        // 2. THE BRIDGE: Save Name to public table
        const { error: dbError } = await supabase.from('teachers').insert([
          { id: data.user.id, name: name, email: email }
        ]);

        if (dbError) {
          console.error("Profile Error:", dbError);
          Alert.alert("Warning", "Account created, but failed to save profile name.");
        } else {
          Alert.alert("Success", "Welcome to FearGo, " + name + "!");
        }
        
        onLogin(data.user);
      }
    } else {
      // 3. LOGIN EXISTING TEACHER
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
      } else if (data.user) {
        onLogin(data.user);
      }
    }

    setIsLoading(false);
  };

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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.pageTitleSection}>
            <View style={styles.iconCircle}><Ionicons name="school" size={40} color="#4f8cff" /></View>
            <Text style={styles.pageTitle}>{isSignUp ? "Create Account" : "Welcome Back"}</Text>
            <Text style={styles.pageSubtitle}>{isSignUp ? "Sign up to start hosting live interactive sessions." : "Log in to access your dashboard and past sessions."}</Text>
          </View>

          <NeumorphicView style={styles.card}>
            
            {/* NEW: Conditional Name Input */}
            {isSignUp && (
              <>
                <Text style={styles.inputLabel}>Full Name</Text>
                <NeumorphicView inset={true} style={[styles.inputWrapper, { marginBottom: 20 }]}>
                  <Ionicons name="person-outline" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mr. Sharma"
                    placeholderTextColor="#b0bec5"
                    value={name}
                    onChangeText={setName}
                  />
                </NeumorphicView>
              </>
            )}

            <Text style={styles.inputLabel}>Email Address</Text>
            <NeumorphicView inset={true} style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
              <TextInput style={styles.input} placeholder="teacher@school.edu" placeholderTextColor="#b0bec5" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </NeumorphicView>

            <Text style={[styles.inputLabel, { marginTop: 20 }]}>Password</Text>
            <NeumorphicView inset={true} style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#b0bec5" secureTextEntry={true} value={password} onChangeText={setPassword} />
            </NeumorphicView>

            <TouchableOpacity style={{ marginTop: 30 }} onPress={handleAuth} disabled={isLoading} activeOpacity={0.8}>
              <View style={[styles.submitButton, isLoading && { opacity: 0.7 }]}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.submitButtonText}>{isSignUp ? "Sign Up" : "Log In"}</Text><Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} /></>}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleWrapper} onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.toggleText}>{isSignUp ? "Already have an account? " : "Don't have an account? "}<Text style={styles.toggleTextBold}>{isSignUp ? "Log In" : "Sign Up"}</Text></Text>
            </TouchableOpacity>

          </NeumorphicView>
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
  scrollContainer: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40, width: '100%', maxWidth: 500, alignSelf: 'center', },
  pageTitleSection: { alignItems: 'center', marginBottom: 30 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0ebf6', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#d1d9e6' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#2f3542', marginBottom: 8 },
  pageSubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', paddingHorizontal: 20 },
  card: { borderRadius: 24, padding: 30, backgroundColor: '#e0e5ec' },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#2f3542', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56, },
  input: { flex: 1, fontSize: 16, fontWeight: '500', color: '#2f3542', outlineStyle: 'none' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 28, backgroundColor: '#4f8cff', shadowColor: '#4f8cff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8, },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  toggleWrapper: { marginTop: 24, alignItems: 'center' },
  toggleText: { fontSize: 14, color: '#6b7280' },
  toggleTextBold: { fontWeight: 'bold', color: '#4f8cff' },
});