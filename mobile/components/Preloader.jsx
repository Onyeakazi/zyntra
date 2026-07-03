import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Text } from 'react-native';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import LogoIcon from '../assets/images/icon-only.png';

const Preloader = ({ size = 90, text }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Pulse animation (scaling and opacity fading together for a premium glowing feel)
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1.0,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrapper, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <Image
          source={LogoIcon}
          style={{ width: size, height: size, resizeMode: 'contain' }}
        />
      </Animated.View>
      
      {text && (
        <Text style={styles.text}>{text}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.medium,
    color: COLORS.secondary,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default Preloader;
