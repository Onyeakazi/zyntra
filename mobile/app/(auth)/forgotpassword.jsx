import { Image, Text, TouchableOpacity, View } from 'react-native';
import createResponsiveStyleSheet from '../../utils/responsiveStyleSheet';
import React, { useState } from 'react';
import { router } from 'expo-router';
import Logo from "../../assets/images/brand.png";
import TYPOGRAPHY from "../../constants/typography";
import COLORS from '../../constants/colors';
import FloatingInput from '../../components/Input';
import Button from '../../components/Button';
import { Ionicons } from "@expo/vector-icons";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    // 1. Validation Checks
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    setError("");
    setLoading(true);

    // 2. Backend API Trigger
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5000";
      
      const response = await fetch(`${backendUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true", // Bypass localtunnel warning reminder
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset link.");
      }

      setSuccess(true);
    } catch (err) {
      console.error("Password Reset Error:", err.message);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!success ? (
        // Input Phase View
        <View style={{ flex: 1 }}>
          <View style={styles.logoContainer}>
            <Image source={Logo} style={styles.logo} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            {"Enter your email address and we'll send you a link to reset your password."}
          </Text>

          <View style={styles.form}>
            <FloatingInput
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ borderColor: error ? "red" : "#ccc" }}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              text="Send Recovery Email"
              action={handleResetPassword}
              bgColor={COLORS.accent}
              textColor="#FFFFFF"
              loading={loading}
              style={{ paddingVertical: 17 }}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerText}>
                Remember password? <Text style={styles.footerLink}>Go back</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Success Phase View
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="mail-open-outline" size={80} color={COLORS.accent} />
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            </View>
          </View>

          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successDescription}>
            We have sent a password reset link to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>.{"\n"}
            Please follow the link in your inbox to set your new password.
          </Text>

          <Button
            text="Back to Login"
            action={() => router.replace("/(auth)/login")}
            bgColor={COLORS.primary}
            textColor="#FFFFFF"
            style={{ width: "100%", paddingVertical: 17 }}
          />
        </View>
      )}
    </View>
  );
};

export default ForgotPassword;

const styles = createResponsiveStyleSheet({
  container: {
    flex: 1,
    paddingTop: 30,
  },
  logoContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  logo: {
    width: "100%",
    height: 90,
    resizeMode: "contain",
  },
  title: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  form: {
    gap: 15,
  },
  errorText: {
    color: 'red',
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 14,
    marginTop: 5,
  },
  buttonContainer: {
    marginTop: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 16,
    color: '#656F78',
  },
  footerLink: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.bold,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIconContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  emailHighlight: {
    fontFamily: TYPOGRAPHY.semiBold,
    color: COLORS.primary,
  },
});