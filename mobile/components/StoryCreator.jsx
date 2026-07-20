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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native'
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet'
import COLORS from '../constants/colors'
import TYPOGRAPHY from '../constants/typography'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'

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
  mediaType = 'image', // 'image', 'video', 'text', 'shared_post'
  sharedPost = null,
  onCancel,
  onShare,
  sharing = false
}) => {
  const { t } = useTranslation()
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
      backgroundColor: (mediaType === 'text' || mediaType === 'shared_post') ? selectedBgColor : null,
      sharedPost
    })
  }

  const renderContent = () => {
    if (mediaType === 'shared_post' && sharedPost) {
      const authorName = sharedPost.user?.name || sharedPost.user?.full_name || "User"
      const authorUsername = sharedPost.user?.username ? `@${sharedPost.user.username}` : ""
      const avatarUri = sharedPost.user?.profilePic?.uri || sharedPost.user?.avatar_url
      const mediaUrl = sharedPost.image?.uri || (typeof sharedPost.image === 'string' ? sharedPost.image : null)

      return (
        <View style={[styles.textStoryCanvas, { backgroundColor: selectedBgColor }]}>
          <ScrollView
            contentContainerStyle={styles.sharedPostCanvasScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Facebook-style Reshare Card */}
            <View style={styles.sharedPostCard}>
              {/* Header Badge */}
              <View style={styles.sharedPostCardHeader}>
                <View style={styles.sharedPostAuthorRow}>
                  <Image
                    source={
                      avatarUri && typeof avatarUri === 'string' && avatarUri.trim() !== ""
                        ? { uri: avatarUri }
                        : require('../assets/images/default.png')
                    }
                    style={styles.sharedPostAvatar}
                  />
                  <View style={styles.sharedPostAuthorInfo}>
                    <Text style={styles.sharedPostAuthorName} numberOfLines={1}>
                      {authorName}
                    </Text>
                    {authorUsername ? (
                      <Text style={styles.sharedPostAuthorUsername} numberOfLines={1}>
                        {authorUsername}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.sharedPostBadge}>
                  <Text style={styles.sharedPostBadgeText}>Zyntra Feed</Text>
                </View>
              </View>

              {/* Text Snippet */}
              {sharedPost.content ? (
                <Text style={styles.sharedPostContentText} numberOfLines={5}>
                  {sharedPost.content}
                </Text>
              ) : null}

              {/* Attached Media Thumbnail (Image or Video) */}
              {mediaUrl ? (
                <Image
                  source={{ uri: mediaUrl }}
                  style={styles.sharedPostMediaImage}
                  resizeMode="cover"
                />
              ) : null}
            </View>

            {/* Optional Personal Caption below card */}
            <TextInput
              placeholder={t('settings.selectLanguage') === 'Select Language' ? 'Add your thoughts...' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Añade tus pensamientos...' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Ajoutez vos pensées...' : 'Adicione seus pensamentos...'}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={caption}
              onChangeText={setCaption}
              style={styles.sharedPostCaptionInput}
              maxLength={150}
            />
          </ScrollView>
        </View>
      )
    }

    if (mediaType === 'text') {
      return (
        <View style={[styles.textStoryCanvas, { backgroundColor: selectedBgColor }]}>
          <TextInput
            placeholder={t('settings.selectLanguage') === 'Select Language' ? 'Type your story...' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Escribe tu historia...' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Écrivez votre story...' : 'Escreva sua história...'}
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
              <Text style={styles.videoLabel}>{t('settings.selectLanguage') === 'Select Language' ? 'Video Story Selected' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Historia de video seleccionada' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Story vidéo sélectionnée' : 'História de vídeo selecionada'}</Text>
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
              placeholder={t('settings.selectLanguage') === 'Select Language' ? 'Add a caption...' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Añadir un subtítulo...' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Ajouter une légende...' : 'Adicionar uma legenda...'}
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
            {mediaType === 'shared_post' ? (t('settings.selectLanguage') === 'Select Language' ? 'Share Post to Story' : 'Story') : mediaType === 'text' ? t('feed.textStory') : mediaType === 'video' ? t('feed.videoStory') : t('feed.photoStory')}
          </Text>
          <Pressable
            style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareBtnText}>{t('feed.share')}</Text>
            )}
          </Pressable>
        </View>

        {/* CANVAS BODY */}
        <View style={styles.canvasBody}>
          {renderContent()}
        </View>

        {/* BOTTOM COLOR PALETTE (For text and shared post stories) */}
        {(mediaType === 'text' || mediaType === 'shared_post') && !sharing && (
          <View style={styles.paletteContainer}>
            <Text style={styles.paletteLabel}>{t('settings.selectLanguage') === 'Select Language' ? 'Select Background Color' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Seleccionar color de fondo' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Choisir la couleur de fond' : 'Selecionar cor de fundo'}</Text>
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

const styles = createResponsiveStyleSheet({
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
    width: 343,
    height: 487,
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

  // Shared Post Reshare Card styles
  sharedPostCanvasScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    width: '100%',
  },
  sharedPostCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sharedPostCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sharedPostAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sharedPostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sharedPostAuthorInfo: {
    flex: 1,
  },
  sharedPostAuthorName: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#1F2937',
  },
  sharedPostAuthorUsername: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
  },
  sharedPostBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sharedPostBadgeText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.semiBold,
    color: COLORS.primary,
  },
  sharedPostContentText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  sharedPostMediaImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 4,
  },
  sharedPostCaptionInput: {
    width: '100%',
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: TYPOGRAPHY.medium,
    textAlign: 'center',
  },
})
