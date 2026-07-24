import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { auth } from '../config/firebase';
import Constants from 'expo-constants';

// Configure foreground notifications handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers this device for Expo Push Notifications.
 * Requests OS permissions, sets up Android channels, and retrieves the token.
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notifications: Permission not granted');
      return null;
    }
    
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 'a8871662-bb54-423d-81ca-a81675b13e73';
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('[Push] Registered Expo Token:', token);
    } catch (e) {
      console.error('[Push] Error fetching Expo push token, trying fallback:', e);
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      } catch (fallbackErr) {
        console.error('[Push] Fallback token retrieval failed:', fallbackErr);
      }
    }
  } else {
    console.log('[Push] Must use a physical device for Push Notifications');
    return null;
  }

  return token;
}

/**
 * Saves/Upserts the push token to the database under user_push_tokens.
 * Supports multiple devices per user.
 */
export async function savePushTokenToDB(token) {
  const user = auth.currentUser;
  if (!user || !token) return;

  const deviceName = `${Platform.OS} (${Device.modelName || 'Unknown Device'})`;

  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: user.uid,
          push_token: token,
          device_name: deviceName,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,push_token' }
      );

    if (error) {
      console.error('[Push] Error upserting token to Supabase:', error.message);
    } else {
      console.log('[Push] Token successfully saved/updated in Supabase');
    }
  } catch (err) {
    console.error('[Push] Exception in savePushTokenToDB:', err);
  }
}

/**
 * Triggers a request to our Express backend server to send a push notification.
 */
export async function sendPushNotificationTrigger(receiverId, senderId, body, title = '', data = {}) {
  if (!receiverId || !senderId) {
    console.warn('[Push] sendPushNotificationTrigger called without receiverId or senderId');
    return;
  }

  // Avoid notifying self
  if (receiverId === senderId) return;

  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${backendUrl}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiverId,
        senderId,
        title,
        body,
        data
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Push] Backend failed to trigger notification:', errText);
    } else {
      const resJson = await response.json();
      console.log('[Push] Backend trigger successful:', resJson);
    }
  } catch (err) {
    console.error('[Push] Exception in sendPushNotificationTrigger:', err);
  }
}
