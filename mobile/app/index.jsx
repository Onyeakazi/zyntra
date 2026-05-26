import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../config/firebase";

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkNavigation = async () => {
      try {
        // Wait for Firebase Auth persistence to fully load from AsyncStorage
        await auth.authStateReady();

        const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");

        if (hasSeenOnboarding !== "true") {
          router.replace("/onboarding");
        } else if (auth.currentUser) {
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)/login");
        }
      } catch (err) {
        console.log("Auth check error:", err);
        router.replace("/(auth)/login");
      } finally {
        setLoading(false);
      }
    };

    checkNavigation();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}