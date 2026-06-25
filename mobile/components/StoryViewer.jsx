import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  Animated,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Alert,
  TextInput,
  FlatList
} from 'react-native'
import COLORS from '../constants/colors'
import TYPOGRAPHY from '../constants/typography'
import { Ionicons } from '@expo/vector-icons'
import { formatPostTime } from '../utils/timeFormat'
import { supabase } from '../lib/supabase'
import { auth } from '../config/firebase'

const StoryViewer = ({
  visible,
  storyGroups = [],
  initialGroupIndex = 0,
  onClose,
  onStoryDeleted
}) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  
  // Pause states
  const [isHolding, setIsHolding] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isViewersModalOpen, setIsViewersModalOpen] = useState(false)
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false)

  // Interactive states
  const [viewers, setViewers] = useState([])
  const [commentText, setCommentText] = useState('')

  const progressAnim = useRef(new Animated.Value(0)).current
  const progressVal = useRef(0)
  const animRef = useRef(null)
  const lastStoryIdRef = useRef(null)

  const isPlaybackPaused = isHolding || isInputFocused || isViewersModalOpen || isOptionsSheetOpen

  // Track progress value safely
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      progressVal.current = value
    })
    return () => {
      progressAnim.removeListener(listenerId)
    }
  }, [])

  // Setup current group & story indices when modal becomes visible or initialGroupIndex changes
  useEffect(() => {
    if (visible) {
      setCurrentGroupIndex(initialGroupIndex)
      setCurrentStoryIndex(0)
      setIsHolding(false)
      setIsInputFocused(false)
      setIsViewersModalOpen(false)
      setIsOptionsSheetOpen(false)
      setCommentText('')
    }
  }, [visible, initialGroupIndex])

  // Reset holding state if any overlay/input is active to prevent getting stuck when components unmount
  useEffect(() => {
    if (isOptionsSheetOpen || isViewersModalOpen || isInputFocused) {
      setIsHolding(false)
    }
  }, [isOptionsSheetOpen, isViewersModalOpen, isInputFocused])

  // Get active group and story
  const activeGroup = storyGroups[currentGroupIndex]
  const activeStory = activeGroup?.stories?.[currentStoryIndex]
  const currentUid = auth.currentUser?.uid

  // Record view if viewing someone else's story
  useEffect(() => {
    if (visible && activeStory && activeStory.user_id !== currentUid) {
      recordStoryView(activeStory.id)
    }
  }, [visible, activeStory?.id])

  // Fetch viewers if viewing own story
  useEffect(() => {
    if (visible && activeStory && activeStory.user_id === currentUid) {
      fetchViewers(activeStory.id)
    } else {
      setViewers([])
    }
  }, [visible, activeStory?.id])

  const recordStoryView = async (storyId) => {
    const user = auth.currentUser
    if (!user) return
    try {
      await supabase
        .from('story_views')
        .insert({ story_id: storyId, viewer_id: user.uid })
    } catch (e) {
      console.log('View already recorded or conflict:', e)
    }
  }

  const fetchViewers = async (storyId) => {
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select(`
          id,
          viewer_id,
          viewer:viewer_id (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('story_id', storyId)
      if (!error && data) {
        setViewers(data)
      }
    } catch (err) {
      console.error('Error fetching viewers:', err)
    }
  }

  // Play animation whenever group, story, or play state changes
  useEffect(() => {
    if (!visible || !activeGroup || !activeStory) return

    const segmentChanged = lastStoryIdRef.current !== activeStory.id
    lastStoryIdRef.current = activeStory.id

    if (segmentChanged) {
      setCommentText('')
    }

    if (isPlaybackPaused) {
      if (animRef.current) {
        animRef.current.stop()
      }
    } else {
      if (segmentChanged) {
        playTimer(0)
      } else {
        playTimer(progressVal.current)
      }
    }

    return () => {
      if (animRef.current) {
        animRef.current.stop()
      }
    }
  }, [visible, currentGroupIndex, currentStoryIndex, isPlaybackPaused])

  const playTimer = (startFrom = 0) => {
    progressAnim.setValue(startFrom)
    
    // Video gets 10s, photo/text gets 5s
    const duration = activeStory.media_type === 'video' ? 10000 : 5000
    const remainingDuration = duration * (1 - startFrom)

    if (animRef.current) {
      animRef.current.stop()
    }

    if (isPlaybackPaused) {
      return
    }

    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingDuration,
      useNativeDriver: false, // Animating width of progress bars
    })

    animRef.current.start(({ finished }) => {
      if (finished) {
        handleNextStory()
      }
    })
  }

  const handleNextStory = () => {
    if (!activeGroup) return

    if (currentStoryIndex < activeGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1)
    } else {
      // Move to next user's group
      if (currentGroupIndex < storyGroups.length - 1) {
        setCurrentGroupIndex(prev => prev + 1)
        setCurrentStoryIndex(0)
      } else {
        // Last story of last user, close viewer
        onClose()
      }
    }
  }

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1)
    } else {
      // Move to previous user's group
      if (currentGroupIndex > 0) {
        const prevGroupIndex = currentGroupIndex - 1
        const prevGroup = storyGroups[prevGroupIndex]
        setCurrentGroupIndex(prevGroupIndex)
        setCurrentStoryIndex(prevGroup.stories.length - 1)
      } else {
        // Already at very first story, restart it
        playTimer(0)
      }
    }
  }

  const handlePressIn = () => {
    setIsHolding(true)
  }

  const handlePressOut = () => {
    setIsHolding(false)
  }



  const handleSendReaction = async (emoji) => {
    const user = auth.currentUser
    if (!user) return
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          receiver_id: activeStory.user_id,
          sender_id: user.uid,
          type: 'story_reaction',
          story_id: activeStory.id,
          story_reaction: emoji,
          is_read: false
        })
      if (error) throw error
      Alert.alert('Reaction Sent', `You reacted ${emoji} to their story!`)
    } catch (err) {
      console.error('Failed to send reaction:', err)
      Alert.alert('Error', 'Could not send reaction.')
    }
  }

  const handleSendComment = async (commentText) => {
    if (!commentText.trim()) return
    const user = auth.currentUser
    if (!user) return

    const recipientId = activeStory.user_id

    try {
      // 1. Check connection
      const { data: connData } = await supabase
        .from('connections')
        .select('status')
        .or(`and(user_id.eq.${user.uid},friend_id.eq.${recipientId}),and(user_id.eq.${recipientId},friend_id.eq.${user.uid})`)
        .eq('status', 'accepted')
        .maybeSingle()
      const isConnected = !!connData

      // 2. Find or create conversation
      let conversationId = null
      let conversation = null

      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user_1.eq.${user.uid},user_2.eq.${recipientId}),and(user_1.eq.${recipientId},user_2.eq.${user.uid})`)
        .maybeSingle()

      if (convData) {
        conversationId = convData.id
        conversation = convData
      } else {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_1: user.uid,
            user_2: recipientId,
            status: isConnected ? 'accepted' : 'pending',
            last_message: commentText.trim(),
            last_sender_id: user.uid,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) throw createError
        conversationId = newConv.id
        conversation = newConv
      }

      // 3. Format message content with story reply metadata JSON wrapper
      const storyMetadata = {
        type: activeStory.media_type,
        bg: activeStory.background_color || '',
        text: activeStory.caption || '',
        url: activeStory.media_url || ''
      }
      const messageContent = `[StoryReplyJson:${JSON.stringify(storyMetadata)}] ${commentText.trim()}`

      // 4. Insert message
      const { data: insertedMsg, error: msgInsertErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.uid,
          content: messageContent,
          is_read: false
        })
        .select()
        .single()

      if (msgInsertErr) throw msgInsertErr

      // 5. Update parent conversation metadata
      let nextStatus = 'pending'
      if (isConnected || (conversation && conversation.status === 'accepted')) {
        nextStatus = 'accepted'
      }

      await supabase
        .from('conversations')
        .update({
          status: nextStatus,
          last_message: commentText.trim(),
          last_sender_id: user.uid,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      // 6. Send broadcasts
      try {
        const chatRoomChannel = supabase.channel(`chat-room-${conversationId}`)
        chatRoomChannel.send({
          type: 'broadcast',
          event: 'message_sent',
          payload: insertedMsg
        })

        const userInboxChannel = supabase.channel(`user-inbox-${recipientId}`)
        userInboxChannel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: { conversation_id: conversationId }
        })
      } catch (broadcastErr) {
        console.error('Error sending realtime broadcasts:', broadcastErr.message)
      }

      Alert.alert('Reply Sent', 'Your reply has been sent as a direct message.')
    } catch (err) {
      console.error('Failed to send comment:', err)
      Alert.alert('Error', 'Could not send story reply: ' + err.message)
    }
  }

  const handleOpenDeleteMenu = () => {
    setIsOptionsSheetOpen(true)
  }

  if (!activeGroup || !activeStory) {
    return null
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" translucent />

        {/* STORY DISPLAY */}
        {/* STORY DISPLAY CANVAS */}
        <View style={styles.mediaWrapper}>
          {activeStory.media_type === 'text' ? (
            // Text Story Layout
            <View style={[styles.textStoryCanvas, { backgroundColor: activeStory.background_color || COLORS.accent }]}>
              <Text style={styles.textStoryContent}>{activeStory.caption}</Text>
            </View>
          ) : activeStory.media_type === 'video' ? (
            // Video Story mockup Layout
            <View style={styles.mediaContainer}>
              <Image
                source={{ uri: activeStory.media_url }}
                style={styles.mediaImage}
                resizeMode="contain"
              />
              <View style={styles.videoPlayIndicator}>
                <Ionicons name="play" size={48} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
          ) : (
            // Photo Story Layout
            <View style={styles.mediaContainer}>
              <Image
                source={{ uri: activeStory.media_url }}
                style={styles.mediaImage}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        {/* NAVIGATION & PAUSE GESTURE ZONES */}
        {!isOptionsSheetOpen && !isViewersModalOpen && (
          <>
            {/* Left Nav Zone (Tap to go back) */}
            <Pressable 
              style={styles.leftNavZone} 
              onPress={handlePrevStory} 
            />

            {/* Right Nav Zone (Tap to go forward) */}
            <Pressable 
              style={styles.rightNavZone} 
              onPress={handleNextStory} 
            />

            {/* Center Hold Zone (Touch & Hold to pause) */}
            <Pressable 
              style={styles.centerHoldZone}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            />
          </>
        )}

        {/* OVERLAY INTERFACE (Header, Progress bars, Footer) */}
        {!isHolding && (
          <KeyboardAvoidingView
            style={styles.interfaceContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            pointerEvents="box-none"
          >
            {/* Top section: Progress bars + Creator Info */}
            <View style={styles.topContainer}>
              {/* PROGRESS BARS */}
              <View style={styles.progressBarContainer}>
                {activeGroup.stories.map((story, index) => {
                  let barWidth = '0%'
                  if (index < currentStoryIndex) {
                    barWidth = '100%'
                  } else if (index === currentStoryIndex) {
                    barWidth = progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp'
                    })
                  }

                  return (
                    <View key={story.id} style={styles.progressTrack}>
                      <Animated.View style={[styles.progressBar, { width: barWidth }]} />
                    </View>
                  )
                })}
              </View>

              {/* CREATOR INFO */}
              <View style={styles.header}>
                <View style={styles.creatorRow}>
                  <Image
                    source={
                      activeGroup.user.avatar_url
                        ? { uri: activeGroup.user.avatar_url }
                        : require('../assets/images/default.png')
                    }
                    style={styles.creatorAvatar}
                  />
                  <View>
                    <Text style={styles.creatorName}>{activeGroup.user.full_name}</Text>
                    <Text style={styles.storyTime}>
                      {formatPostTime(activeStory.created_at)}
                    </Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  {activeStory.user_id === currentUid && (
                    <View style={styles.actionMenuContainer}>
                      <Pressable style={styles.actionMenuButton} onPress={handleOpenDeleteMenu}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                      </Pressable>
                      {isOptionsSheetOpen && (
                        <>
                          <Pressable 
                            style={styles.dropdownBackdrop}
                            onPress={() => {
                              setIsOptionsSheetOpen(false)
                            }}
                          />
                          <View style={styles.optionsDropdown}>
                            <Pressable 
                              style={styles.optionItem}
                              onPress={async () => {
                                try {
                                  const { error } = await supabase
                                    .from("stories")
                                    .delete()
                                    .eq("id", activeStory.id)

                                  if (error) throw error
                                  
                                  setIsOptionsSheetOpen(false)
                                  if (onStoryDeleted) {
                                    onStoryDeleted()
                                  } else {
                                    onClose()
                                  }
                                } catch (err) {
                                  console.error("Failed to delete story:", err)
                                  Alert.alert("Error", "Could not delete story.")
                                  setIsOptionsSheetOpen(false)
                                }
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color="red" />
                              <Text style={[styles.optionText, { color: "red" }]}>Delete Story</Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                  <Pressable style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Bottom section: Caption + Reactions/Input */}
            <View style={styles.bottomSectionContainer} pointerEvents="box-none">
              {/* CAPTION (Bottom caption overlay for photos/videos) */}
              {activeStory.media_type !== 'text' && activeStory.caption ? (
                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>{activeStory.caption}</Text>
                </View>
              ) : null}

              {/* REACTIONS / DM INPUT OR VIEWS PILL */}
              {activeStory.user_id !== currentUid ? (
                <View style={styles.bottomInteractiveContainer}>
                  {/* Emoji Reactions Row */}
                  <View style={styles.reactionsRow}>
                    {['👍', '❤️', '😆', '😮', '😢', '😡'].map((emoji) => (
                      <Pressable
                        key={emoji}
                        onPress={() => handleSendReaction(emoji)}
                        style={styles.emojiCircle}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Comment Input Bar */}
                  <View style={styles.commentInputRow}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder={`Reply to ${activeGroup.user.full_name}...`}
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      value={commentText}
                      onChangeText={setCommentText}
                      onFocus={() => {
                        setIsInputFocused(true)
                      }}
                      onBlur={() => {
                        setIsInputFocused(false)
                      }}
                      onSubmitEditing={async () => {
                        if (!commentText.trim()) return
                        const text = commentText
                        setCommentText('')
                        await handleSendComment(text)
                      }}
                      returnKeyType="send"
                    />
                    {commentText.trim().length > 0 && (
                      <Pressable 
                        style={styles.sendCommentBtn}
                        onPress={async () => {
                          const text = commentText
                          setCommentText('')
                          await handleSendComment(text)
                        }}
                      >
                        <Ionicons name="send" size={18} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : (
                /* Own story: show views summary pill */
                <View style={styles.ownStoryBottomContainer}>
                  <Pressable style={styles.viewsIndicatorPill} onPress={() => setIsViewersModalOpen(true)}>
                    <Ionicons name="eye-outline" size={16} color="#fff" />
                    <Text style={styles.viewsIndicatorText}>
                      {viewers.length} {viewers.length === 1 ? 'view' : 'views'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        )}

        {/* VIEWERS LIST OVERLAY */}
        {isViewersModalOpen && (
          <View style={styles.viewersOverlay}>
            <View style={styles.viewersContent}>
              <View style={styles.viewersHeader}>
                <Text style={styles.viewersTitle}>
                  Story Viewers ({viewers.length})
                </Text>
                <Pressable 
                  onPress={() => setIsViewersModalOpen(false)}
                  style={styles.closeViewersBtn}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
              </View>

              <FlatList
                data={viewers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.viewersList}
                renderItem={({ item }) => {
                  const vUser = item.viewer || {}
                  return (
                    <View style={styles.viewerItem}>
                      <Image
                        source={
                          vUser.avatar_url
                            ? { uri: vUser.avatar_url }
                            : require('../assets/images/default.png')
                        }
                        style={styles.viewerAvatar}
                      />
                      <View style={styles.viewerDetails}>
                        <Text style={styles.viewerName}>{vUser.full_name || 'Anonymous'}</Text>
                        <Text style={styles.viewerUsername}>@{vUser.username || 'user'}</Text>
                      </View>
                    </View>
                  )
                }}
                ListEmptyComponent={
                  <View style={styles.emptyViewersContainer}>
                    <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.emptyViewersText}>No views yet</Text>
                  </View>
                }
              />
            </View>
          </View>
        )}


      </SafeAreaView>
    </Modal>
  )
}

export default StoryViewer

const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  leftNavZone: {
    position: 'absolute',
    left: 0,
    width: width * 0.15,
    top: 100,
    bottom: 150,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  rightNavZone: {
    position: 'absolute',
    right: 0,
    width: width * 0.15,
    top: 100,
    bottom: 150,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  centerHoldZone: {
    position: 'absolute',
    left: width * 0.15,
    right: width * 0.15,
    top: 100,
    bottom: 150,
    zIndex: 9,
    backgroundColor: 'transparent',
  },
  mediaContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  videoPlayIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Text story full screen
  textStoryCanvas: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textStoryContent: {
    color: '#fff',
    fontSize: 28,
    fontFamily: TYPOGRAPHY.bold,
    textAlign: 'center',
    lineHeight: 36,
  },

  // Overlaid UI Components
  topContainer: {
    width: '100%',
  },
  interfaceContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 24,
    justifyContent: 'space-between',
    zIndex: 20,
  },
  progressBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creatorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  creatorName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.bold,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  storyTime: {
    color: '#D1D5DB',
    fontSize: 11,
    fontFamily: TYPOGRAPHY.regular,
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionMenuButton: {
    padding: 4,
  },

  // Bottom section positioning
  bottomSectionContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  captionContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: width - 40,
    marginBottom: 12,
  },
  captionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    textAlign: 'center',
  },

  // Interactions and Comments panel
  bottomInteractiveContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    width: '100%',
    backgroundColor: 'transparent',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  emojiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emojiText: {
    fontSize: 22,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    height: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 23,
    paddingHorizontal: 20,
    color: '#fff',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sendCommentBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Own story bottom styles
  ownStoryBottomContainer: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewsIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewsIndicatorText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  // Viewers list bottom sheet
  viewersOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  viewersContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    padding: 20,
  },
  viewersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
  },
  viewersTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: TYPOGRAPHY.bold,
  },
  closeViewersBtn: {
    padding: 4,
  },
  viewersList: {
    paddingBottom: 20,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  viewerDetails: {
    flex: 1,
  },
  viewerName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.semiBold,
  },
  viewerUsername: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    marginTop: 2,
  },
  emptyViewersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyViewersText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.medium,
    marginTop: 8,
  },

  // Story Options Floating Dropdown
  actionMenuContainer: {
    position: 'relative',
    zIndex: 1002,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: -500,
    bottom: -1000,
    left: -500,
    right: -500,
    zIndex: 1000,
  },
  optionsDropdown: {
    position: "absolute",
    top: 35,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 5,
    width: 140,
    zIndex: 1001,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  optionText: {
    fontSize: 14,
    color: "#333",
    fontFamily: TYPOGRAPHY.medium,
  },
})
