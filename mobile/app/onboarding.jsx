import {
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import COLORS from '../constants/colors';
import { onboardingData } from '../data/onboarding';
import { useRef, useState } from 'react';
import Logo from '../assets/images/logo1.png';
import { router } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import LanguageSelectorModal from '../components/LanguageSelectorModal';

const { width, height } = Dimensions.get('window');

const logoWidth = width * 0.4;


export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
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
        style={{ flex: 1 }}
        contentContainerStyle={{ height: '100%' }}
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
            <View style={[styles.slide, { width, height }]}>

              <Animated.View
                style={{
                  transform: [{ scale: imageScale }],
                  alignItems: 'center',
                }}
              >
                {SvgComponent && (
                  <SvgComponent width={width > 400 ? 220 : 180} height={width > 400 ? 220 : 180} />
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
                  <Text style={styles.title}>{t(item.titleKey)}</Text>

                  <Text style={styles.text}>
                    {t(item.descriptionKey)}
                  </Text>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => completeOnboarding("/(auth)/login")}

                  >
                    <Text style={styles.buttonText}>{t('onboarding.joinNow')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.buttonOutline}
                    onPress={() => completeOnboarding("/(auth)/login")}
                  >
                    <Text style={styles.buttonOutlineText}>{t('onboarding.signIn')}</Text>
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

      {/* Floating Language Button */}
      <TouchableOpacity
        style={styles.languageButton}
        onPress={() => setIsLanguageModalVisible(true)}
      >
        <Ionicons name="globe-outline" size={18} color="#FAFAFA" />
        <Text style={styles.languageText}>
          {(i18n.language || 'en').substring(0, 2).toUpperCase()}
        </Text>
      </TouchableOpacity>

      {/* Reusable Selector Modal */}
      <LanguageSelectorModal
        visible={isLanguageModalVisible}
        onClose={() => setIsLanguageModalVisible(false)}
      />
    </View>
  );
}

const styles = createResponsiveStyleSheet({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 0,
  },

  slide: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  textContainer: {
    marginTop: 20,
    alignItems: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.primary,
  },

  text: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },

  button: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 80,
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
    paddingVertical: 14,
    paddingHorizontal: 80,
    borderRadius: 10,
  },

  buttonOutlineText: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  pagination: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    alignSelf: 'center',
  },

  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginHorizontal: 4,
  },

  languageButton: {
    position: 'absolute',
    top: 55,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 26, 0.45)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },

  languageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 0.5,
  },
});