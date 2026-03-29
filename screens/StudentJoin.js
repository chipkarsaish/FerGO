import React, { useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  TextInput, Dimensions, Platform, StatusBar, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function StudentJoin({ onJoin, onBack }) {
  const [sessionCode, setSessionCode] = useState('');
  
  // --- NEW SCANNER & VALIDATION STATE ---
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleJoin = async (codeToJoin = sessionCode) => {
    if (codeToJoin.trim().length === 0) return;
    setIsChecking(true);

    // Verify room exists and is open
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', codeToJoin)
      .eq('is_active', true)
      .single();

    setIsChecking(false);

    if (data) {
      onJoin(codeToJoin);
    } else {
      Alert.alert("Invalid Code", "Session not found or already ended.");
      setScanned(false);
    }
  };

  // --- CAMERA LOGIC ---
  const startScanning = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission Denied", "Camera access is required to scan QR codes.");
        return;
      }
    }
    setScanned(false);
    setIsScanning(true);
  };

  const handleBarcodeScanned = ({ type, data }) => {
    setScanned(true);
    setIsScanning(false);
    setSessionCode(data);
    handleJoin(data);
  };

  // --- CAMERA VIEW OVERLAY ---
  if (isScanning) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>Point at Teacher's QR Code</Text>
          <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.cancelScanBtn}>
            <Text style={styles.cancelScanText}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── SKY-BLUE HEADER ─── */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Ionicons name="pulse" size={26} color="#fff" />
          <Text style={styles.headerAppName}>ClassPulse</Text>
        </View>

        <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
          <View style={styles.backPill}>
            <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.backPillText}>Back</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── MAIN SCROLL BODY ─── */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. WELCOME HEADER */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome</Text>
          <Text style={styles.welcomeSubtitle}>Join your session</Text>
        </View>

        {/* 2. JOIN SESSION CARD */}
        <NeumorphicView style={styles.card}>
          <Text style={styles.cardTitle}>Enter Session Code</Text>

          <NeumorphicView inset={true} style={styles.inputWrapper}>
            <Ionicons name="keypad-outline" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
            <TextInput
              style={styles.input}
              placeholder="Enter code"
              placeholderTextColor="#b0bec5"
              value={sessionCode}
              onChangeText={setSessionCode}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={() => handleJoin(sessionCode)}
            />
          </NeumorphicView>

          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={() => handleJoin(sessionCode)}
            disabled={sessionCode.length === 0 || isChecking}
            activeOpacity={0.8}
          >
            <View style={[styles.joinButton, { opacity: sessionCode.length > 0 ? 1 : 0.5 }]}>
              <Text style={styles.joinButtonText}>
                {isChecking ? "Checking..." : "Join Session"}
              </Text>
            </View>
          </TouchableOpacity>
        </NeumorphicView>

        {/* 3. DIVIDER */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 4. SCAN QR BUTTON */}
        <TouchableOpacity onPress={startScanning} activeOpacity={0.8} style={styles.qrButtonStandalone}>
          <Ionicons name="scan-outline" size={20} color="#0ea5e9" style={{ marginRight: 10 }} />
          <Text style={styles.qrButtonStandaloneText}>Scan QR Code</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// STYLES 100% UNTOUCHED
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e8edf5' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 12, paddingBottom: 16, backgroundColor: '#0ea5e9', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 10, },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerAppName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 10, letterSpacing: 0.8 },
  backPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  backPillText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { paddingHorizontal: isLargeScreen ? 60 : 20, paddingTop: 32, paddingBottom: 16, maxWidth: 600, alignSelf: 'center', width: '100%', },
  welcomeSection: { alignItems: 'center', marginBottom: 32 },
  welcomeTitle: { fontSize: 36, fontWeight: 'bold', color: '#2f3542', letterSpacing: 0.5, },
  welcomeSubtitle: { fontSize: 17, color: '#78909c', marginTop: 6, },
  card: { borderRadius: 24, padding: 24, marginBottom: 8, backgroundColor: '#e8edf5', },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#2f3542', marginBottom: 16, },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56, },
  input: { flex: 1, fontSize: 18, fontWeight: '600', color: '#2f3542', outlineStyle: 'none', },
  joinButton: { height: 54, borderRadius: 27, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6, },
  joinButtonText: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingHorizontal: 8, },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#c8d4e0' },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  qrButtonStandalone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, borderWidth: 1.5, borderColor: '#b0cfe8', borderStyle: 'dashed', },
  qrButtonStandaloneText: { fontSize: 16, fontWeight: 'bold', color: '#0ea5e9' },
  // NEW CAMERA STYLES
  scannerOverlay: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  scannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 },
  cancelScanBtn: { backgroundColor: '#FF5C5C', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20 },
  cancelScanText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});