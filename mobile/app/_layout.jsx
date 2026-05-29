import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import COLORS from '../constants/colors';
import { Stack as ExpoStack } from 'expo-router';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InterRegular: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
  });

  const [isReady, setIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [user, setUser] = useState(null);
  const [authStateResolved, setAuthStateResolved] = useState(false);

  useEffect(() => {
    if (!fontsLoaded) return;

    let unsubscribe;

    const initialize = async () => {
      try {
        // Check onboarding
        const seen = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(seen === 'true');
        console.log('Onboarding checked:', seen === 'true');

        // Wait for Firebase Auth persistence to fully load from AsyncStorage
        await auth.authStateReady();
        console.log('Auth state ready! Current user:', auth.currentUser?.uid || 'No user');

        setUser(auth.currentUser);
        setAuthStateResolved(true);
        setIsReady(true);

        // Subscribe to future auth updates (like logins/logouts)
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          console.log('Auth event:', currentUser?.uid || 'No user');
          setUser(currentUser);
        });
      } catch (err) {
        console.error('Error initializing:', err);
        setIsReady(true);
      }
    };

    initialize();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fontsLoaded]);

  // Loading screen
  if (!fontsLoaded || !isReady || hasSeenOnboarding === null || !authStateResolved) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // NOT seen onboarding → show onboarding
  if (!hasSeenOnboarding) {
    console.log('📱 Rendering: Onboarding');
    return (
      <ExpoStack screenOptions={{ headerShown: false }}>
        <ExpoStack.Screen name="onboarding" />
      </ExpoStack>
    );
  }

  // NOT logged in → show auth
  if (!user) {
    console.log('📱 Rendering: Auth');
    return (
      <ExpoStack screenOptions={{ headerShown: false }}>
        <ExpoStack.Screen name="(auth)" />
      </ExpoStack>
    );
  }

  // Logged in → show tabs
  console.log('📱 Rendering: Tabs');
  return (
    <ExpoStack screenOptions={{ headerShown: false }}>
      <ExpoStack.Screen name="(tabs)" />
    </ExpoStack>
  );
}