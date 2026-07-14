import { Image, Pressable, Text, View, StyleSheet } from 'react-native'
import React from 'react'
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet'
import COLORS from '../constants/colors'
import TYPOGRAPHY from '../constants/typography'
import { AntDesign } from '@expo/vector-icons'

const Story = ({
  image,
  avatar,
  name,
  onclick,
  isOwnStory = false,
  mediaType = 'image',
  backgroundColor,
  caption
}) => {
  if (isOwnStory) {
    return (
      <Pressable style={styles.card} onPress={onclick}>
        {/* Full Card Background - User Avatar */}
        <Image
          source={image && image.uri ? image : require('../assets/images/default.png')}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        
        {/* Glassmorphism Frosted Dark Overlay */}
        <View style={styles.frostedOverlay}>
          {/* Centered Glowing Plus Icon Wrapper */}
          <View style={styles.glowingPlusContainer}>
            <View style={styles.plusIconCircle}>
              <AntDesign name="plus" size={16} color="#fff" />
            </View>
          </View>
          <Text style={styles.ownStoryText}>{name || "Add Story"}</Text>
        </View>
      </Pressable>
    )
  }

  // Get first name or short name for the floating pill
  const displayName = name ? name.split(' ')[0] : 'User'

  // Normal user story card
  return (
    <Pressable style={styles.card} onPress={onclick}>
      {/* Background: Image/Video thumbnail or Solid Color for text story */}
      {mediaType === 'text' ? (
        <View style={[styles.textStoryBackground, { backgroundColor: backgroundColor || COLORS.accent }]}>
          <Text style={styles.textStoryPreview} numberOfLines={5}>
            {caption || ''}
          </Text>
        </View>
      ) : (
        <Image
          source={image && image.uri ? image : require('../assets/images/story.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      )}

      {/* Top Left - Creator Profile Avatar (Squircle style!) */}
      <View style={styles.avatarContainer}>
        <Image
          source={avatar && avatar.uri ? avatar : require('../assets/images/default.png')}
          style={styles.creatorAvatar}
        />
      </View>

      {/* Bottom overlay - modern floating pill container */}
      <View style={styles.pillContainer} pointerEvents="none">
        <View style={styles.floatingPill}>
          <Text style={styles.creatorName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

export default Story

const styles = createResponsiveStyleSheet({
  card: {
    width: 100,
    height: 155,
    borderRadius: 16, // Rounder card corners for capsule look
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
    marginRight: 10,
  },

  // Premium Create Story (Glassmorphism) Layout
  frostedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Translucent overlay
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  glowingPlusContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(80, 150, 241, 0.25)', // Glow outer ring
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  plusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  ownStoryText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },

  // Normal Story Layout
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  textStoryBackground: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  textStoryPreview: {
    color: '#fff',
    fontSize: 9,
    fontFamily: TYPOGRAPHY.bold,
    textAlign: 'center',
    lineHeight: 12,
  },

  // Squircle Creator Avatar (Modern iOS style!)
  avatarContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 9, // Squircle corner
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  creatorAvatar: {
    width: '100%',
    height: '100%',
  },

  // Floating pill layout at bottom
  pillContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Semi-transparent glass bubble
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    maxWidth: '85%',
  },
  creatorName: {
    color: '#fff',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.medium,
    textAlign: 'center',
  },
})