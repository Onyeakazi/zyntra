import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

/**
 * Resolves a username to a userId and navigates to the user's profile.
 */
export const handleMentionPress = async (username) => {
  try {
    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", cleanUsername)
      .single();
    
    if (!error && data?.id) {
      router.push({
        pathname: "/(tabs)/profile",
        params: { userId: data.id }
      });
    } else {
      console.log(`User @${cleanUsername} not found`);
    }
  } catch (err) {
    console.error("Error resolving username for mention:", err.message);
  }
};

/**
 * Scans content text for @username mentions, splitting and rendering them
 * with a clickable blue link.
 */
export const renderTextWithMentions = (text, mentionStyle = {}, textStyle = {}) => {
  if (!text) return null;
  
  // Matches '@' followed by word characters (alphanumeric and underscore)
  const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
  const parts = text.split(mentionRegex);
  
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <Text
          key={index}
          style={mentionStyle}
          onPress={() => handleMentionPress(username)}
        >
          {part}
        </Text>
      );
    }
    return <Text key={index} style={textStyle}>{part}</Text>;
  });
};
