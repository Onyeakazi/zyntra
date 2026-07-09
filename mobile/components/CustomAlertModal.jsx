import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, Platform, StyleSheet } from 'react-native';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { registerAlertCallback } from '../utils/alertManager';


const CustomAlertModal = () => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState([]);
  const [options, setOptions] = useState(null);
  
  // Animation refs
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerAlertCallback(({ title, message, buttons, options }) => {
      setTitle(title || 'Alert');
      setMessage(message || '');
      setButtons(buttons || []);
      setOptions(options || null);
      setVisible(true);

      // Spring entry animation
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        })
      ]).start();
    });
  }, []);

  const handleButtonPress = (onPress) => {
    // Exit animations
    Animated.parallel([
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setVisible(false);
      if (onPress) {
        onPress();
      }
    });
  };

  if (!visible) return null;

  // Determine matching alert context icon and accent color based on title keywords
  let iconName = 'information-circle-outline';
  let iconColor = COLORS.accent;
  const lowerTitle = title.toLowerCase();
  const lowerMessage = message.toLowerCase();

  if (lowerTitle.includes('success') || lowerMessage.includes('successful') || lowerTitle.includes('copied') || lowerMessage.includes('copied')) {
    iconName = 'checkmark-circle-outline';
    iconColor = '#10B981'; // Green
  } else if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('incorrect')) {
    iconName = 'alert-circle-outline';
    iconColor = '#EF4444'; // Red
  } else if (lowerTitle.includes('warning') || lowerTitle.includes('not logged in')) {
    iconName = 'warning-outline';
    iconColor = '#F59E0B'; // Amber
  } else if (lowerTitle.includes('delete') || lowerTitle.includes('remove') || lowerTitle.includes('cancel')) {
    iconName = 'trash-outline';
    iconColor = '#EF4444'; // Red
  } else if (lowerTitle.includes('confirm') || lowerTitle.includes('sure') || lowerTitle.includes('accept')) {
    iconName = 'help-circle-outline';
    iconColor = COLORS.accent;
  }

  // Fallback to OK button if no buttons array is supplied
  const alertButtons = buttons && buttons.length > 0 
    ? buttons 
    : [{ text: 'OK', onPress: () => {} }];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        // Only allow request close if cancelable option is true or cancel button is found
        const hasCancel = alertButtons.some(b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');
        if (options?.cancelable || hasCancel) {
          const cancelBtn = alertButtons.find(b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');
          handleButtonPress(cancelBtn?.onPress);
        }
      }}
    >
      <View style={styles.overlay}>
        {/* Backdrop overlay */}
        <Animated.View style={[styles.backdrop, { opacity: opacityValue }]} />

        {/* Modal content dialog wrapper */}
        <Animated.View style={[
          styles.dialog, 
          { 
            opacity: opacityValue,
            transform: [{ scale: scaleValue }] 
          }
        ]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
              <Ionicons name={iconName} size={36} color={iconColor} />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.message}>{message}</Text>
          </View>

          <View style={[
            styles.footer, 
            alertButtons.length > 2 ? styles.footerVertical : styles.footerHorizontal
          ]}>
            {alertButtons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive' || btn.text?.toLowerCase() === 'delete';
              const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel';

              let btnBg = COLORS.primary;
              let btnText = '#FFFFFF';
              let btnBorderWidth = 0;
              let btnBorderColor = 'transparent';

              if (isDestructive) {
                btnBg = '#EF4444';
              } else if (isCancel) {
                btnBg = '#F3F4F6';
                btnText = '#4B5563';
                btnBorderWidth = 1;
                btnBorderColor = '#E5E7EB';
              } else if (index === alertButtons.length - 1 && alertButtons.length > 1) {
                btnBg = COLORS.accent;
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  style={[
                    styles.button,
                    alertButtons.length > 2 ? styles.buttonFullWidth : styles.buttonFlex,
                    { 
                      backgroundColor: btnBg,
                      borderWidth: btnBorderWidth,
                      borderColor: btnBorderColor
                    }
                  ]}
                  onPress={() => handleButtonPress(btn.onPress)}
                >
                  <Text style={[styles.buttonLabel, { color: btnText }]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = createResponsiveStyleSheet({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 11, 14, 0.45)', // Premium dark overlay color
  },
  dialog: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0A0E1A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.bold,
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  body: {
    marginBottom: 24,
  },
  message: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 6,
  },
  footer: {
    gap: 10,
  },
  footerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonLabel: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.semiBold,
  },
});

export default CustomAlertModal;
