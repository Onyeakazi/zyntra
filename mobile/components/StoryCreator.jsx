import React, { useState, useEffect } from 'react'
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native'
import COLORS from '../constants/colors'
import TYPOGRAPHY from '../constants/typography'
import { Ionicons } from '@expo/vector-icons'

const BACKGROUND_COLORS = [
  '#FF5E36', // Coral
  '#007AFF', // Ocean Blue
  '#FF9500', // Sunset Orange
  '#5856D6', // Royal Purple
  '#00A86B', // Forest Green
  '#E040FB', // Neon Pink
  '#2C3E50', // Dark Charcoal
]

const StoryCreator = ({
  visible,
  mediaUri,
  mediaType = 'image', // 'image', 'video', 'text'
  onCancel,
  onShare,
  sharing = false
}) => {
  const [caption, setCaption] = useState('')
  const [selectedBgColor, setSelectedBgColor] = useState(BACKGROUND_COLORS[0])

  // Reset inputs when opening/closing
  useEffect(() => {
    if (visible) {
      setCaption('')
      setSelectedBgColor(BACKGROUND_COLORS[0])
    }
  }, [visible])

  const handleShare = () => {
    if (mediaType === 'text' && !caption.trim()) {
      alert('Please enter some text for your story!')
      return
    }
    
    onShare({
      mediaUri,
      mediaType,
      caption: caption.trim(),
      backgroundColor: mediaType === 'text' ? selectedBgColor : null
    })
  }

  const renderContent = () => {
    if (mediaType === 'text') {
      return (
        <View style={[styles.textStoryCanvas, { backgroundColor: selectedBgColor }]}>
          <TextInput
            placeholder="Type your story..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            multiline
            maxLength={250}
            value={caption}
            onChangeText={setCaption}
            style={styles.textStoryInput}
            autoFocus
          />
        </View>
      )
    }

    // Photo or Video previews
    return (
      <View style={styles.mediaPreviewContainer}>
        {mediaType === 'video' ? (
          // Video preview placeholder (with play overlay)
          <View style={styles.videoPlaceholder}>
            <Image
              source={require('../assets/images/image placeholder.jpeg')}
              style={styles.mediaImage}
              resizeMode="contain"
            />
            <View style={styles.videoOverlay}>
              <Ionicons name="play-circle-outline" size={80} color="#fff" />
              <Text style={styles.videoLabel}>Video Story Selected</Text>
            </View>
          </View>
        ) : (
          // Photo preview
          <Image
            source={{ uri: mediaUri }}
            style={styles.mediaImage}
            resizeMode="contain"
          />
        )}

        {/* Floating caption input for photos/videos */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.captionInputWrapper}
        >
          <View style={styles.captionBoxContainer}>
            <TextInput
              placeholder="Add a caption..."
              placeholderTextColor="#9CA3AF"
              value={caption}
              onChangeText={setCaption}
              style={styles.captionInput}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* HEADER BAR */}
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onCancel} disabled={sharing}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {mediaType === 'text' ? 'Text Story' : mediaType === 'video' ? 'Video Story' : 'Photo Story'}
          </Text>
          <Pressable
            style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareBtnText}>Share</Text>
            )}
          </Pressable>
        </View>

        {/* CANVAS BODY */}
        <View style={styles.canvasBody}>
          {renderContent()}
        </View>

        {/* BOTTOM COLOR PALETTE (For text stories) */}
        {mediaType === 'text' && !sharing && (
          <View style={styles.paletteContainer}>
            <Text style={styles.paletteLabel}>Select Background Color</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paletteScroll}
            >
              {BACKGROUND_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorBubble,
                    { backgroundColor: color },
                    selectedBgColor === color && styles.colorBubbleSelected
                  ]}
                  onPress={() => setSelectedBgColor(color)}
                >
                  {selectedBgColor === color && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

export default StoryCreator

const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: TYPOGRAPHY.bold,
  },
  shareBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnDisabled: {
    backgroundColor: '#4B5563',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.bold,
  },
  canvasBody: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photo/Video Preview styles
  mediaPreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  videoLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: TYPOGRAPHY.bold,
    marginTop: 12,
  },
  captionInputWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  captionBoxContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  captionInput: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.primary,
    padding: 0, // Reset default Android padding
  },

  // Text Story Canvas styles
  textStoryCanvas: {
    width: width - 32,
    height: height * 0.6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  textStoryInput: {
    color: '#fff',
    fontSize: 24,
    fontFamily: TYPOGRAPHY.bold,
    textAlign: 'center',
    width: '100%',
    maxHeight: '100%',
  },

  // Bottom Palette style
  paletteContainer: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#2C2C2E',
  },
  paletteLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: TYPOGRAPHY.medium,
    marginLeft: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  paletteScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  colorBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBubbleSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
})
