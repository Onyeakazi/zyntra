import { Image, Pressable, Text, View, StyleSheet } from 'react-native'
import React from 'react'
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet'
import COLORS from '../constants/colors'
import TYPOGRAPHY from '../constants/typography'
import { Ionicons } from '@expo/vector-icons'

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
  // Parse shared post payload or direct media URL if applicable
  let sharedPayload = null;
  let directMediaUrl = null;

  if (image && image.uri && typeof image.uri === 'string') {
    const trimmed = image.uri.trim();
    if (trimmed.startsWith('{')) {
      try {
        sharedPayload = JSON.parse(trimmed);
      } catch (e) {}
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      directMediaUrl = trimmed;
    }
  }

  let effectiveMediaUrl = sharedPayload?.media_url || directMediaUrl;
  if (effectiveMediaUrl && typeof effectiveMediaUrl === 'string' && effectiveMediaUrl.includes(',')) {
    effectiveMediaUrl = effectiveMediaUrl.split(',')[0].trim();
  }

  // Create Story Button (isOwnStory)
  if (isOwnStory) {
    let ownStoryBgSource = avatar;
    if (effectiveMediaUrl) {
      ownStoryBgSource = { uri: effectiveMediaUrl };
    } else if (image && image.uri && typeof image.uri === 'string' && !image.uri.trim().startsWith('{')) {
      ownStoryBgSource = image;
    }

    return (
      <Pressable style={styles.card} onPress={onclick}>
        <Image
          source={ownStoryBgSource && ownStoryBgSource.uri ? ownStoryBgSource : require('../assets/images/default.png')}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <View style={styles.frostedOverlay}>
          <View style={styles.glowingPlusContainer}>
            <View style={styles.plusIconCircle}>
              <Ionicons name="add" size={20} color="#fff" />
            </View>
          </View>
          <Text style={styles.ownStoryText}>{name || "Your story"}</Text>
        </View>
      </Pressable>
    )
  }

  const displayName = name || 'User';

  return (
    <Pressable style={styles.card} onPress={onclick}>
      {/* Background Content */}
      {mediaType === 'shared_post' ? (
        effectiveMediaUrl ? (
          /* Facebook Post Reshare with Image Card */
          <View style={styles.facebookSharedImageCanvas}>
            {/* Blurred / Dimmed Background Image */}
            <Image
              source={{ uri: effectiveMediaUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              blurRadius={12}
            />
            <View style={styles.darkBlurOverlay} />

            {/* Inner Floating Post Image Card (Facebook Style!) */}
            <View style={styles.facebookInnerPostCard}>
              <Image
                source={{ uri: effectiveMediaUrl }}
                style={styles.facebookInnerPostImage}
                resizeMode="cover"
              />
            </View>
          </View>
        ) : (
          /* Facebook Post Reshare Text Only */
          <View style={[styles.storyBackgroundCanvas, { backgroundColor: backgroundColor || '#007AFF' }]}>
            <Text style={styles.facebookTextStoryPreview} numberOfLines={6}>
              {sharedPayload?.content || caption || 'Shared Post'}
            </Text>
          </View>
        )
      ) : mediaType === 'text' ? (
        /* Text Story (Facebook Style) */
        <View style={[styles.storyBackgroundCanvas, { backgroundColor: backgroundColor || '#007AFF' }]}>
          <Text style={styles.facebookTextStoryPreview} numberOfLines={6}>
            {caption || ''}
          </Text>
        </View>
      ) : (
        /* Photo or Video Story */
        <Image
          source={image && image.uri ? image : require('../assets/images/story.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      )}

      {/* Top Left - Circular Creator Avatar with Blue Ring (Facebook Style) */}
      <View style={styles.facebookAvatarRing}>
        <Image
          source={avatar && avatar.uri ? avatar : require('../assets/images/default.png')}
          style={styles.facebookAvatarImage}
        />
      </View>

      {/* Bottom Left Name Label (100% Transparent Background!) */}
      <View style={styles.bottomNameContainer} pointerEvents="none">
        <Text style={styles.facebookCreatorName} numberOfLines={2}>
          {displayName}
        </Text>
      </View>
    </Pressable>
  )
}

export default Story

const styles = createResponsiveStyleSheet({
  card: {
    width: 104,
    height: 168,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
    position: 'relative',
    marginRight: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  // Create Story Frosted Overlay
  frostedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  glowingPlusContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(80, 150, 241, 0.25)',
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
    fontSize: 12,
    fontFamily: TYPOGRAPHY.bold,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },

  // Normal Story Layouts
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  storyBackgroundCanvas: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 36,
    paddingBottom: 30,
  },
  facebookTextStoryPreview: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: TYPOGRAPHY.bold,
    textAlign: 'center',
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  facebookSharedImageCanvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  facebookInnerPostCard: {
    width: '84%',
    height: '62%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 2,
  },
  facebookInnerPostImage: {
    width: '100%',
    height: '100%',
  },
  miniPostCardContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  miniPostCardText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.medium,
    textAlign: 'center',
    marginBottom: 4,
  },
  miniPostCardImage: {
    width: '100%',
    height: 70,
    borderRadius: 6,
  },

  // Top Left Avatar with Blue Ring (Facebook Style!)
  facebookAvatarRing: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#007AFF', // Facebook Blue Ring
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 12,
    zIndex: 12,
  },
  facebookAvatarImage: {
    width: '100%',
    height: '100%',
  },

  // Bottom Shadow & Name Label (Facebook Style!)
  bottomShadowGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 10,
    elevation: 10,
  },
  bottomNameContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    zIndex: 11,
    elevation: 11,
  },
  facebookCreatorName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: TYPOGRAPHY.bold,
    lineHeight: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
})