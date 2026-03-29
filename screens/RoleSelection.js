import React, { useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  Dimensions, Animated, Platform, StatusBar
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';

const { width, height } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function RoleSelection({ onSelectRole }) {
  const scrollY = useRef(new Animated.Value(0)).current;

  // Logo fades out as user scrolls
  const logoOpacity = scrollY.interpolate({
    inputRange: [0, height * 0.35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        snapToInterval={height}
        decelerationRate="fast"
      >

        {/* ── SECTION 1: SPLASH ── */}
        <View style={styles.splashScreen}>
          {/* Soft decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <Animated.View style={[styles.logoGroup, { opacity: logoOpacity }]}>
            <NeumorphicView style={styles.logoCard}>
              <Ionicons name="pulse" size={72} color="#0ea5e9" />
            </NeumorphicView>
            <Text style={styles.appName}>ClassPulse</Text>
            <Text style={styles.tagline}>Real-time classroom comprehension</Text>
          </Animated.View>

          {/* Scroll hint */}
          <View style={styles.scrollHint}>
            <Text style={styles.scrollHintText}>Scroll to get started</Text>
            <Ionicons name="chevron-down" size={22} color="#94a3b8" style={{ marginTop: 6 }} />
          </View>
        </View>

        {/* ── SECTION 2: ROLE SELECTION (existing cards) ── */}
        <View style={styles.roleScreen}>
          <View style={styles.roleHeader}>
            <Text style={styles.roleTitle}>Select Your Role</Text>
            <Text style={styles.roleSubtitle}>How will you use ClassPulse today?</Text>
          </View>

          <View style={[isLargeScreen ? styles.row : styles.column, styles.cardsContainer]}>

            {/* Student Card */}
            <TouchableOpacity
              style={[isLargeScreen ? styles.flex1 : styles.fullWidth, styles.cardSpacing]}
              onPress={() => onSelectRole('student')}
              activeOpacity={0.8}
            >
              <NeumorphicView style={styles.roleCard}>
                <View style={[styles.iconWrapper, { backgroundColor: '#f0fdf4' }]}>
                  <FontAwesome5 name="user-graduate" size={44} color="#4CAF50" />
                </View>
                <Text style={styles.roleName}>Student</Text>
                <Text style={styles.roleSubtext}>
                  Join active sessions, anonymously answer pulse checks, and ask questions.
                </Text>
                <View style={styles.roleCTA}>
                  <Text style={[styles.roleCTAText, { color: '#4CAF50' }]}>Join Now</Text>
                  <Ionicons name="arrow-forward" size={15} color="#4CAF50" style={{ marginLeft: 6 }} />
                </View>
              </NeumorphicView>
            </TouchableOpacity>

            {/* Teacher Card */}
            <TouchableOpacity
              style={[isLargeScreen ? styles.flex1 : styles.fullWidth, styles.cardSpacing]}
              onPress={() => onSelectRole('teacher')}
              activeOpacity={0.8}
            >
              <NeumorphicView style={styles.roleCard}>
                <View style={[styles.iconWrapper, { backgroundColor: '#e0f2fe' }]}>
                  <MaterialIcons name="school" size={48} color="#0ea5e9" />
                </View>
                <Text style={styles.roleName}>Teacher</Text>
                <Text style={styles.roleSubtext}>
                  Create sessions, run pulse checks, and monitor class comprehension instantly.
                </Text>
                <View style={styles.roleCTA}>
                  <Text style={[styles.roleCTAText, { color: '#0ea5e9' }]}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={15} color="#0ea5e9" style={{ marginLeft: 6 }} />
                </View>
              </NeumorphicView>
            </TouchableOpacity>

          </View>

          <Text style={styles.footer}>ClassPulse · Classroom Intelligence</Text>
        </View>

      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e0e5ec',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  scrollContainer: { width: '100%' },

  // ── Splash ─────────────────────────────────────────────────────────────────
  splashScreen: {
    height,
    width,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e5ec',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(14, 165, 233, 0.07)', top: -100, right: -110,
  },
  decorCircle2: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(76, 175, 80, 0.07)', bottom: 60, left: -80,
  },
  logoGroup: { alignItems: 'center' },
  logoCard: {
    width: 136,
    height: 136,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  appName: { fontSize: 40, fontWeight: 'bold', color: '#2f3542', letterSpacing: 1, marginBottom: 8 },
  tagline: { fontSize: 15, color: '#78909c', letterSpacing: 0.3 },

  scrollHint: { position: 'absolute', bottom: 44, alignItems: 'center' },
  scrollHintText: { fontSize: 13, color: '#94a3b8', fontWeight: '500', letterSpacing: 0.4 },

  // ── Role Screen ─────────────────────────────────────────────────────────────
  roleScreen: {
    minHeight: height,
    width,
    paddingHorizontal: isLargeScreen ? 60 : 20,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: '#e0e5ec',
  },
  roleHeader: { alignItems: 'center', marginBottom: 32 },
  roleTitle: { fontSize: 26, fontWeight: 'bold', color: '#2f3542', textAlign: 'center' },
  roleSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' },

  cardsContainer: { width: '100%', maxWidth: 800 },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  flex1: { flex: 1 },
  fullWidth: { width: '100%' },
  cardSpacing: {
    marginVertical: isLargeScreen ? 0 : 12,
    marginHorizontal: isLargeScreen ? 12 : 0,
  },

  roleCard: { padding: 28, borderRadius: 24, alignItems: 'center' },
  iconWrapper: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  roleName: { fontSize: 22, fontWeight: 'bold', color: '#2f3542', marginBottom: 10 },
  roleSubtext: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  roleCTA: { flexDirection: 'row', alignItems: 'center' },
  roleCTAText: { fontSize: 14, fontWeight: '700' },

  footer: { marginTop: 40, fontSize: 12, color: '#b0bec5', letterSpacing: 0.5 },
});