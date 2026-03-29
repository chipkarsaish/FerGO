import React, { useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  ScrollView, Dimensions, Platform, StatusBar, Animated
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import NeumorphicView from '../components/NeumorphicView';

const { width, height } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function AppLanding({ onSelectRole }) {
  const scrollY = useRef(new Animated.Value(0)).current;

  // Fade out logo as user scrolls down
  const logoOpacity = scrollY.interpolate({
    inputRange: [0, height * 0.3],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Subtle arrow bounce animation hint
  const arrowTranslate = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 20],
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

        {/* ─── SCREEN 1: SPLASH / LOGO ─────────────────────────────────── */}
        <View style={styles.splashScreen}>

          {/* Background decorative circles */}
          <View style={styles.decorCircleLarge} />
          <View style={styles.decorCircleSmall} />

          {/* Logo card */}
          <Animated.View style={{ opacity: logoOpacity, alignItems: 'center' }}>
            <NeumorphicView style={styles.logoCard}>
              <Ionicons name="pulse" size={72} color="#0ea5e9" />
            </NeumorphicView>
            <Text style={styles.appName}>ClassPulse</Text>
            <Text style={styles.tagline}>Real-time classroom comprehension</Text>
          </Animated.View>

          {/* Scroll down hint */}
          <Animated.View style={[styles.scrollHint, { transform: [{ translateY: arrowTranslate }] }]}>
            <Text style={styles.scrollHintText}>Scroll to get started</Text>
            <Ionicons name="chevron-down" size={22} color="#94a3b8" style={{ marginTop: 4 }} />
          </Animated.View>

        </View>

        {/* ─── SCREEN 2: ROLE SELECTION ─────────────────────────────────── */}
        <View style={styles.roleScreen}>

          <View style={styles.roleHeader}>
            <Text style={styles.roleTitle}>Select Your Role</Text>
            <Text style={styles.roleSubtitle}>How will you use ClassPulse today?</Text>
          </View>

          <View style={isLargeScreen ? styles.cardRow : styles.cardColumn}>

            {/* Teacher Card */}
            <TouchableOpacity
              style={[styles.roleCardWrapper, isLargeScreen && { marginRight: 16 }]}
              onPress={() => onSelectRole('teacher')}
              activeOpacity={0.85}
            >
              <NeumorphicView style={styles.roleCard}>
                <View style={[styles.roleIconCircle, { backgroundColor: '#e0f2fe' }]}>
                  <MaterialIcons name="school" size={44} color="#0ea5e9" />
                </View>
                <Text style={styles.roleName}>Teacher</Text>
                <Text style={styles.roleDesc}>
                  Host sessions, run pulse checks, and monitor comprehension in real time.
                </Text>
                <View style={styles.roleCTA}>
                  <Text style={styles.roleCTAText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0ea5e9" style={{ marginLeft: 6 }} />
                </View>
              </NeumorphicView>
            </TouchableOpacity>

            {/* Student Card */}
            <TouchableOpacity
              style={styles.roleCardWrapper}
              onPress={() => onSelectRole('student')}
              activeOpacity={0.85}
            >
              <NeumorphicView style={styles.roleCard}>
                <View style={[styles.roleIconCircle, { backgroundColor: '#f0fdf4' }]}>
                  <FontAwesome5 name="user-graduate" size={40} color="#4CAF50" />
                </View>
                <Text style={styles.roleName}>Student</Text>
                <Text style={styles.roleDesc}>
                  Join live sessions, respond to pulse checks, and ask questions anonymously.
                </Text>
                <View style={styles.roleCTA}>
                  <Text style={[styles.roleCTAText, { color: '#4CAF50' }]}>Join Now</Text>
                  <Ionicons name="arrow-forward" size={16} color="#4CAF50" style={{ marginLeft: 6 }} />
                </View>
              </NeumorphicView>
            </TouchableOpacity>

          </View>

          {/* Footer */}
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: { width: '100%' },

  // ─── Splash Screen ────────────────────────────────────────────────────────
  splashScreen: {
    height: height,
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e5ec',
    position: 'relative',
    overflow: 'hidden',
  },

  // Subtle background decorations
  decorCircleLarge: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    top: -80,
    right: -120,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
    bottom: 80,
    left: -80,
  },

  logoCard: {
    width: 140,
    height: 140,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2f3542',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#78909c',
    letterSpacing: 0.3,
  },

  scrollHint: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  scrollHintText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // ─── Role Selection Screen ────────────────────────────────────────────────
  roleScreen: {
    minHeight: height,
    width: width,
    paddingHorizontal: isLargeScreen ? 60 : 20,
    paddingTop: 48,
    paddingBottom: 40,
    backgroundColor: '#e0e5ec',
    alignItems: 'center',
  },

  roleHeader: { alignItems: 'center', marginBottom: 36 },
  roleTitle: { fontSize: 28, fontWeight: 'bold', color: '#2f3542', textAlign: 'center' },
  roleSubtitle: { fontSize: 15, color: '#6b7280', marginTop: 8, textAlign: 'center' },

  cardRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', maxWidth: 800 },
  cardColumn: { flexDirection: 'column', width: '100%' },

  roleCardWrapper: { flex: 1, marginBottom: isLargeScreen ? 0 : 20 },
  roleCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  roleIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  roleName: { fontSize: 22, fontWeight: 'bold', color: '#2f3542', marginBottom: 10 },
  roleDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  roleCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleCTAText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0ea5e9',
  },

  footer: {
    marginTop: 40,
    fontSize: 12,
    color: '#b0bec5',
    letterSpacing: 0.5,
  },
});
