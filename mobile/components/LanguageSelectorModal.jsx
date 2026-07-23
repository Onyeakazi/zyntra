import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const LANGUAGES = [
  { code: 'en', name: 'English', flagUrl: 'https://flagcdn.com/w40/gb.png' },
  { code: 'es', name: 'Español', flagUrl: 'https://flagcdn.com/w40/es.png' },
  { code: 'fr', name: 'Français', flagUrl: 'https://flagcdn.com/w40/fr.png' },
  { code: 'pt', name: 'Português', flagUrl: 'https://flagcdn.com/w40/pt.png' },
];

export default function LanguageSelectorModal({ visible, onClose }) {
  const { i18n, t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const selectLanguage = async (code) => {
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('user-language', code);
      closeModal();
    } catch (err) {
      console.error('Error changing language:', err);
    }
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const currentLanguage = i18n.language || 'en';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={closeModal}
    >
      <View style={styles.container}>
        {/* Backdrop overlay */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
        </Animated.View>

        {/* Slide up content */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header handle */}
          <View style={styles.headerHandle} />

          {/* Modal Title */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('settings.selectLanguage')}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#FAFAFA" />
            </TouchableOpacity>
          </View>

          {/* Languages list */}
          <View style={styles.list}>
            {LANGUAGES.map((lang) => {
              const isSelected = currentLanguage.startsWith(lang.code);
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langRow,
                    isSelected && styles.langRowSelected,
                  ]}
                  onPress={() => selectLanguage(lang.code)}
                >
                  <View style={styles.langLeft}>
                    <Image
                      source={{ uri: lang.flagUrl }}
                      style={styles.flagImage}
                    />
                    <Text
                      style={[
                        styles.langName,
                        isSelected && styles.langNameSelected,
                      ]}
                    >
                      {lang.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={22} color="#5096F1" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 15, 0.65)',
  },
  sheet: {
    backgroundColor: 'rgba(10, 14, 26, 0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 40,
    paddingTop: 12,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 20,
  },
  headerHandle: {
    width: 48,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 12,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  langRowSelected: {
    backgroundColor: 'rgba(80, 150, 241, 0.08)',
    borderColor: 'rgba(80, 150, 241, 0.3)',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flagImage: {
    width: 28,
    height: 20,
    borderRadius: 4,
    resizeMode: 'cover',
  },
  langName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  langNameSelected: {
    color: '#5096F1',
    fontWeight: '600',
  },
  checkmark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
