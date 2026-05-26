import {
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import COLORS from '../constants/colors';
import { onboardingData } from '../data/onboarding';
import { useRef } from 'react';
import Logo from '../assets/images/logo1.png';
import { router } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get('window');

const logoWidth = width * 0.4;


export default function Onboarding() {
  const scrollX = useRef(new Animated.Value(0)).current;

  const completeOnboarding = async (route) => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");

      router.replace(route);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Animated.FlatList
        data={onboardingData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item, index }) => {
          const SvgComponent = item.image;

          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const imageScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.85, 1, 0.85],
            extrapolate: 'clamp',
          });

          return (
            <View style={styles.slide}>

              <Animated.View
                style={{
                  transform: [{ scale: imageScale }],
                  alignItems: 'center',
                }}
              >
                {SvgComponent && (
                  <SvgComponent width={250} height={250} />
                )}

                {index === 0 && (
                  <View 
                    style={{ 
                      marginTop: 35, padding: 10,
                    }}
                  >
                    <Image
                      source={Logo}
                      style={{
                        width: logoWidth,
                        height: logoWidth * 0.5,
                        resizeMode: 'contain',
                      }}
                    />
                  </View>
                )}
              </Animated.View>

              {/* Skip first */}
              {index !== 0 && (
                <View style={styles.textContainer}>
                  <Text style={styles.title}>{item.title}</Text>

                  <Text style={styles.text}>
                      {item.description}
                  </Text>

                  <TouchableOpacity 
                      style={styles.button}
                      onPress={()=> completeOnboarding("/(auth)/signup")}
                          
                      >
                      <Text style={styles.buttonText}>Join Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                      style={styles.buttonOutline}
                      onPress={()=> completeOnboarding("/(auth)/login")}
                  >
                      <Text style={styles.buttonOutlineText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Pagination */}
      <View style={styles.pagination}>
        {onboardingData.map((_, i) => {
          const inputRange = [
            (i - 1) * width,
            i * width,
            (i + 1) * width,
          ];

          const widthAnim = scrollX.interpolate({
            inputRange,
            outputRange: [6, 22, 6],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: widthAnim }]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  textContainer: {
    marginTop: 40,
    alignItems: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },

  text: {
    fontSize: 15,
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },

  button: {
    marginTop: 30,
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 10,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },

  buttonOutline: {
    marginTop: 10,
    textDecorationLine: 'underline',
    borderColor: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 10,
  },

  buttonOutlineText: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  pagination: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignSelf: 'center',
  },

  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginHorizontal: 4,
  },
});