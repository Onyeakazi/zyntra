import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  Image, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Keyboard
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { auth } from '../config/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import Svg, { Path, Rect, Circle, Polyline, Line, Polygon } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom inline SVG Icons for premium aesthetics
const BackIcon = ({ color = "#111", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5" />
    <Path d="M12 19l-7-7 7-7" />
  </Svg>
);

const ImageIcon = ({ color = "#5096F1", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <Circle cx="8.5" cy="8.5" r="1.5" />
    <Polyline points="21 15 16 10 5 21" />
  </Svg>
);

const SendIcon = ({ color = "#FFFFFF", size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
    <Line x1="22" y1="2" x2="11" y2="13" />
    <Polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Svg>
);

const InfoIcon = ({ color = "#6B7280", size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="16" x2="12" y2="12" />
    <Line x1="12" y1="8" x2="12.01" y2="8" />
  </Svg>
);

const ChatRoom = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUserId = auth.currentUser?.uid;

  const conversationIdParam = params.conversationId;
  const recipientIdParam = params.recipientId;

  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [conversationId, setConversationId] = useState(conversationIdParam);
  const [conversation, setConversation] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    // Set initial presence from global cache
    if (global.latestPresenceState) {
      const state = global.latestPresenceState;
      const onlineIds = Object.keys(state).filter(id => id !== currentUserId);
      setOnlineUserIds(onlineIds);
    }

    // Subscribe to presence sync events emitted by TabLayout
    const presenceSub = DeviceEventEmitter.addListener('presence_sync', (state) => {
      const onlineIds = Object.keys(state).filter(id => id !== currentUserId);
      setOnlineUserIds(onlineIds);
    });

    return () => {
      presenceSub.remove();
    };
  }, [currentUserId]);

  // Setup dynamic details
  useEffect(() => {
    fetchConversationAndRecipient();
  }, [conversationIdParam, recipientIdParam]);

  // Handle Supabase Real-time messages subscription
  useEffect(() => {
    if (!conversationId) return;

    const uniqueChannelName = `chat-room-${conversationId}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${conversationId}` 
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [payload.new, ...prev]; // Inverted FlatList: prepend new messages
          });
          
          // Mark as read if the recipient of the message is the current user
          if (payload.new.sender_id !== currentUserId) {
            markMessageAsRead(payload.new.id);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'message_sent' },
        (payload) => {
          const newMsg = payload.payload;
          console.log("[Broadcast Debug] Real-time message broadcast received in chat:", newMsg);
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
          
          if (newMsg.sender_id !== currentUserId) {
            markMessageAsRead(newMsg.id);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime ChatRoom] Status for ${uniqueChannelName}: ${status}`, err || "");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const fetchConversationAndRecipient = async () => {
    setLoading(true);
    try {
      if (!currentUserId) return;

      let activeConvId = conversationId;
      let activeRecipientId = recipientIdParam;

      // 1. If we don't have conversation ID but have recipient ID, check if one exists in database
      if (!activeConvId && activeRecipientId) {
        const { data: convData } = await supabase
          .from("conversations")
          .select("*")
          .or(`and(user_1.eq.${currentUserId},user_2.eq.${activeRecipientId}),and(user_1.eq.${activeRecipientId},user_2.eq.${currentUserId})`)
          .maybeSingle();

        if (convData) {
          activeConvId = convData.id;
          setConversationId(activeConvId);
          setConversation(convData);
        }
      }

      // 2. Fetch conversation row if it exists
      if (activeConvId) {
        const { data: convRow } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", activeConvId)
          .single();
        
        if (convRow) {
          setConversation(convRow);
          activeRecipientId = convRow.user_1 === currentUserId ? convRow.user_2 : convRow.user_1;
        }
      }

      // 3. Fetch recipient details
      if (activeRecipientId) {
        const { data: recipientData } = await supabase
          .from("users")
          .select("id, full_name, username, avatar_url")
          .eq("id", activeRecipientId)
          .single();
        
        setRecipient(recipientData);
      }

      // 4. Fetch messages in conversation
      if (activeConvId) {
        const { data: messagesData, error: msgErr } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", activeConvId)
          .order("created_at", { ascending: false });

        if (msgErr) throw msgErr;
        setMessages(messagesData || []);

        // Mark unread received messages as read
        const unreadIds = (messagesData || [])
          .filter(m => m.sender_id !== currentUserId && !m.is_read)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }
    } catch (err) {
      console.error("Error loading chat context:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (msgId) => {
    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", msgId);
    } catch (err) {
      console.error("Error marking message as read:", err.message);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const uploadToCloudinary = async (uri) => {
    try {
      const formData = new FormData();
      
      let extension = "jpg";
      let filename = uri.split("/").pop() || "upload";
      if (!filename.includes(".")) {
        filename = `${filename}.${extension}`;
      }

      const mimeType = "image/jpeg";

      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append("file", blob, filename);
      } else {
        formData.append("file", {
          uri: uri,
          type: mimeType,
          name: filename,
        });
      }
      formData.append("upload_preset", "avatar");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dcazbfdaw/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (!data.secure_url) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }
      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      throw err;
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;
    if (!currentUserId || !recipient) return;

    setSending(true);
    let activeConvId = conversationId;

    try {
      // 1. If conversation does not exist yet, create it
      if (!activeConvId) {
        // Check if users are connected
        const { data: connData } = await supabase
          .from("connections")
          .select("status")
          .or(`and(user_id.eq.${currentUserId},friend_id.eq.${recipient.id}),and(user_id.eq.${recipient.id},friend_id.eq.${currentUserId})`)
          .eq("status", "accepted")
          .maybeSingle();

        const isConnected = !!connData;

        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert({
            user_1: currentUserId,
            user_2: recipient.id,
            status: isConnected ? 'accepted' : 'pending',
            last_message: inputText.trim() || "Sent an image",
            last_sender_id: currentUserId,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;

        activeConvId = newConv.id;
        setConversationId(activeConvId);
        setConversation(newConv);
      }

      // 2. Upload image if selected
      let uploadedImageUrl = null;
      if (selectedImage) {
        setUploadingImage(true);
        uploadedImageUrl = await uploadToCloudinary(selectedImage);
        setUploadingImage(false);
      }

      const messageContent = inputText.trim();

      // 3. Insert new message row and return the inserted row
      const { data: insertedMsg, error: msgInsertErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConvId,
          sender_id: currentUserId,
          content: messageContent || "Sent an image",
          image_url: uploadedImageUrl,
          is_read: false
        })
        .select()
        .single();

      if (msgInsertErr) throw msgInsertErr;

      // Optimistically append the sent message locally so it shows immediately
      if (insertedMsg) {
        setMessages((prev) => {
          if (prev.some(m => m.id === insertedMsg.id)) return prev;
          return [insertedMsg, ...prev]; // Prepend new message since flatlist is inverted
        });

        try {
          // Broadcast the message to the active chat room channel in real-time
          const chatRoomChannel = supabase.channel(`chat-room-${activeConvId}`);
          chatRoomChannel.send({
            type: 'broadcast',
            event: 'message_sent',
            payload: insertedMsg
          });

          // Broadcast to the recipient's personal user channel to trigger layout/badge updates
          const userInboxChannel = supabase.channel(`user-inbox-${recipient.id}`);
          userInboxChannel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: { conversation_id: activeConvId }
          });
          console.log("[Broadcast Debug] Message broadcast sent successfully!");
        } catch (broadcastErr) {
          console.error("[Broadcast Debug] Error sending realtime broadcasts:", broadcastErr.message);
        }
      }

      // 4. Update parent conversation info
      await supabase
        .from("conversations")
        .update({
          last_message: messageContent || "Sent an image",
          last_sender_id: currentUserId,
          updated_at: new Date().toISOString()
        })
        .eq("id", activeConvId);

      setInputText("");
      setSelectedImage(null);
    } catch (err) {
      console.error("Failed to send message:", err.message);
      Alert.alert("Error", "Could not deliver message: " + err.message);
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!conversationId) return;
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ status: 'accepted' })
        .eq("id", conversationId);
      
      if (error) throw error;
      setConversation(prev => ({ ...prev, status: 'accepted' }));
    } catch (err) {
      console.error("Error accepting request:", err.message);
      Alert.alert("Error", "Could not accept message request.");
    }
  };

  const handleDeclineRequest = async () => {
    if (!conversationId) return;
    Alert.alert(
      "Decline Request",
      "Are you sure you want to delete this chat request? The conversation will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("conversations")
                .delete()
                .eq("id", conversationId);
              
              if (error) throw error;
              router.back();
            } catch (err) {
              console.error("Error declining request:", err.message);
              Alert.alert("Error", "Could not delete request.");
            }
          }
        }
      ]
    );
  };

  const renderMessageItem = ({ item }) => {
    const isMyMessage = item.sender_id === currentUserId;
    
    return (
      <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}>
        {!isMyMessage && recipient && (
          <Image
            source={
              recipient.avatar_url && recipient.avatar_url.trim() !== ""
                ? { uri: recipient.avatar_url }
                : require("../assets/images/default.png")
            }
            style={styles.bubbleAvatar}
          />
        )}
        <View style={styles.bubbleContainer}>
          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.bubbleImage} />
          )}
          {item.content && item.content !== "Sent an image" && (
            <View style={[styles.bubble, isMyMessage ? styles.myBubble : styles.theirBubble]}>
              <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}>
                {item.content}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const isRequestRecipient = conversation && conversation.status === 'pending' && conversation.user_2 === currentUserId;

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={insets.top}
      >
        {/* Chat Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <BackIcon size={24} />
          </Pressable>
          
          {recipient && (() => {
            const isOnline = onlineUserIds.includes(recipient.id);
            return (
              <View style={styles.recipientInfo}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={
                      recipient.avatar_url && recipient.avatar_url.trim() !== ""
                        ? { uri: recipient.avatar_url }
                        : require("../assets/images/default.png")
                    }
                    style={styles.avatar}
                  />
                  {isOnline && (
                    <View style={styles.greenDotHeader} />
                  )}
                </View>
                <View style={styles.nameContainer}>
                  <Text style={styles.fullName} numberOfLines={1}>
                    {recipient.full_name || "User"}
                  </Text>
                  <Text style={[styles.statusText, isOnline ? styles.activeStatus : null]} numberOfLines={1}>
                    {isOnline ? "Active now" : `@${recipient.username || "username"}`}
                  </Text>
                </View>
              </View>
            );
          })()}
          
          <Pressable style={styles.infoBtn}>
            <InfoIcon size={22} />
          </Pressable>
        </View>

        {/* Messages Body */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Bar or Message Request controls */}
        {!loading && recipient && (
          isRequestRecipient ? (
            /* Action Banner for Message Requests */
            <View style={[styles.requestBanner, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
              <Text style={styles.requestTitle}>Do you want to chat with {recipient.full_name}?</Text>
              <Text style={styles.requestSubtitle}>
                {"They won't know you've read their message request until you Accept."}
              </Text>
              <View style={styles.requestActions}>
                <Pressable onPress={handleAcceptRequest} style={styles.acceptBtn}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable onPress={handleDeclineRequest} style={styles.declineBtn}>
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* Normal Message Input Box */
            <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? 8 : (insets.bottom > 0 ? insets.bottom : 8) }]}>
              <Pressable onPress={pickImage} style={styles.mediaBtn}>
                <ImageIcon size={26} color={COLORS.accent} />
              </Pressable>

              <View style={styles.inputOuterContainer}>
                {selectedImage && (
                  <View style={styles.imageInputPreview}>
                    <Image source={{ uri: selectedImage }} style={styles.previewThumb} />
                    <Pressable onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
                      <Text style={styles.removeImageText}>✕</Text>
                    </Pressable>
                  </View>
                )}
                <TextInput
                  style={styles.textInput}
                  placeholder="Message..."
                  placeholderTextColor="#9CA3AF"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={1000}
                />
              </View>

              <Pressable 
                onPress={handleSendMessage} 
                disabled={sending || uploadingImage || (!inputText.trim() && !selectedImage)}
                style={[
                  styles.sendBtn, 
                  (inputText.trim() || selectedImage) ? styles.sendBtnActive : null
                ]}
              >
                {sending || uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <SendIcon size={18} />
                )}
              </Pressable>
            </View>
          )
        )}
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

export default ChatRoom;

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },

  backBtn: {
    padding: 6,
  },

  recipientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    marginRight: 10,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  avatarContainer: {
    position: 'relative',
  },

  greenDotHeader: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  nameContainer: {
    marginLeft: 10,
    flex: 1,
  },

  fullName: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#111111',
  },

  username: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
    marginTop: 1,
  },

  statusText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
    marginTop: 1,
  },

  activeStatus: {
    color: '#10B981',
    fontFamily: TYPOGRAPHY.medium,
  },

  infoBtn: {
    padding: 6,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    maxWidth: '80%',
  },

  myMessageRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },

  theirMessageRow: {
    alignSelf: 'flex-start',
  },

  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  bubbleContainer: {
    alignItems: 'flex-start',
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },

  myBubble: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 3,
  },

  theirBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 3,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.regular,
  },

  myMessageText: {
    color: '#FFFFFF',
  },

  theirMessageText: {
    color: '#1F2937',
  },

  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 14,
    marginBottom: 4,
    resizeMode: 'cover',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },

  mediaBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  inputOuterContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    maxHeight: 120,
  },

  imageInputPreview: {
    position: 'relative',
    marginTop: 8,
    marginBottom: 4,
    width: 56,
    height: 56,
  },

  previewThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },

  removeImageBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#374151',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  removeImageText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.bold,
  },

  textInput: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: '#111111',
    paddingVertical: 6,
    lineHeight: 20,
  },

  sendBtn: {
    backgroundColor: '#E5E7EB',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },

  sendBtnActive: {
    backgroundColor: COLORS.accent,
  },

  requestBanner: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  requestTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#111111',
    textAlign: 'center',
  },

  requestSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    paddingHorizontal: 20,
  },

  requestActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 16,
    marginTop: 18,
  },

  acceptBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    maxWidth: 160,
  },

  acceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  declineBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    maxWidth: 160,
  },

  declineText: {
    color: '#4B5563',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.semiBold,
  },
});
