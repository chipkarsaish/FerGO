import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const NeumorphicView = ({ children, style, inset = false, isGlow = false, glowColor = '' }) => {
  if (inset) {
    return (
      <View style={[styles.insetContainer, style]}>
        {children}
      </View>
    );
  }

  // To simulate the light highlight on Android (which doesn't support dual shadow drops natively)
  const androidHighlight = Platform.OS === 'android' ? styles.androidOuterHighlight : {};

  return (
    <View style={[
      styles.outerShadow, 
      style, 
      androidHighlight,
      isGlow && { shadowColor: glowColor, shadowOpacity: 0.6, shadowRadius: 15 }
    ]}>
      <View style={[
        styles.innerShadow, 
        style,
        { backgroundColor: 'transparent', padding: 0, margin: 0, borderWidth: 0 }
      ]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShadow: {
    backgroundColor: '#e0e5ec',
    shadowColor: '#a3b1c6',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8, // For Android dark shadow
  },
  androidOuterHighlight: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#ffffff', // Simulate the white highlight
  },
  innerShadow: {
    backgroundColor: '#e0e5ec',
    shadowColor: '#ffffff',
    shadowOffset: { width: -8, height: -8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 0,
  },
  insetContainer: {
    backgroundColor: '#d1d9e6', // darker bg simulates inset
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#c4ccd8', // rough simulate inset shadow top/left
    borderBottomColor: '#ffffff',
    borderRightColor: '#ffffff',
    overflow: 'hidden',
  }
});

export default NeumorphicView;
