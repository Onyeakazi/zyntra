import {
  Text,
  View,
  FlatList,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  DeviceEventEmitter,
  Alert,
  StyleSheet
} from 'react-native';
import createResponsiveStyleSheet from '../../utils/responsiveStyleSheet';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTranslation } from 'react-i18next';
import StoryViewer from '../../components/StoryViewer';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { auth } from '../../config/firebase';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import TYPOGRAPHY from '../../constants/typography';
import COLORS from '../../constants/colors';
import { scale } from '../../utils/scale';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

// Custom inline SVG icons
const SearchIcon = ({ color = "#888", size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="11" cy="11" r="8" />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);

const EmptyChatIcon = ({ color = "#6B7280", size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
);

const SentCheckIcon = ({ color = "#B9BFC9", size = 14, filled = false }) => {
  if (filled) {
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#111111',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Svg width={size - 6} height={size - 6} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="20 6 9 17 4 12" />
        </Svg>
      </View>
    );
  }
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1.5,
      borderColor: color,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Svg width={size - 6} height={size - 6} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="20 6 9 17 4 12" />
      </Svg>
    </View>
  );
};

const MessageScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [activeTab, setActiveTab] = useState("Inbox"); // "Inbox" or "Requests"
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [presentUserIds, setPresentUserIds] = useState([]);
  const [connections, setConnections] = useState([]);

  // Vibe/Status note state
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [myStatusNote, setMyStatusNote] = useState("");
  const [onlineUserNotes, setOnlineUserNotes] = useState({});
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusInputText, setStatusInputText] = useState("");
  const [activeStatusEnabled, setActiveStatusEnabled] = useState(true);

  // Story viewer states
  const [activeStoryGroups, setActiveStoryGroups] = useState([]);
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);
  const [selectedStoryGroupIndex, setSelectedStoryGroupIndex] = useState(0);

  const presenceChannelRef = useRef(null);

  const fetchCurrentUserProfile = async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .eq("id", currentUserId)
        .single();
      if (!error && data) {
        setCurrentUserProfile(data);
      }

      const savedNote = await AsyncStorage.getItem(`status_note_${currentUserId}`);
      if (savedNote) {
        setMyStatusNote(savedNote);
        setStatusInputText(savedNote);
      }
    } catch (err) {
      console.error("Error fetching current user profile:", err.message);
    }
  };

  const fetchConnections = async () => {
    if (!currentUserId) return;
    try {
      const { data: myConns, error: connErr } = await supabase
        .from("connections")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (!connErr && myConns) {
        const friendIds = myConns.map(c => c.user_id === currentUserId ? c.friend_id : c.user_id);
        if (friendIds.length > 0) {
          const { data: friendsData } = await supabase
            .from("users")
            .select("id, full_name, username, avatar_url")
            .in("id", friendIds);
          setConnections(friendsData || []);
        } else {
          setConnections([]);
        }
      }
    } catch (err) {
      console.error("Error fetching connections for presence:", err.message);
    }
  };

  const fetchConversations = async () => {
    if (!currentUserId) return;
    try {
      // 1. Fetch conversations where user is user_1 or user_2
      const { data: convs, error } = await supabase
        .from("conversations")
        .select(`
          id,
          user_1,
          user_2,
          status,
          last_message,
          last_sender_id,
          updated_at,
          user1:users!conversations_user_1_fkey (
            id,
            full_name,
            avatar_url,
            username
          ),
          user2:users!conversations_user_2_fkey (
            id,
            full_name,
            avatar_url,
            username
          ),
          messages (
            id,
            sender_id,
            is_read,
            created_at
          )
        `)
        .or(`user_1.eq.${currentUserId},user_2.eq.${currentUserId}`)
        .order("updated_at", { ascending: false })
        .order("created_at", { foreignTable: "messages", ascending: false })
        .limit(1, { foreignTable: "messages" });

      if (error) throw error;

      // 2. Fetch unread counts for messages
      const { data: unreadMsgs } = await supabase
        .from("messages")
        .select("conversation_id")
        .neq("sender_id", currentUserId)
        .eq("is_read", false);

      const counts = {};
      if (unreadMsgs) {
        unreadMsgs.forEach(m => {
          counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
        });
      }

      setConversations(convs || []);
      setUnreadCounts(counts);
    } catch (err) {
      console.error("Error fetching conversations:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActiveStories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const grouped = {};
      (data || []).forEach((story) => {
        const userId = story.user_id;
        if (!grouped[userId]) {
          grouped[userId] = {
            userId,
            user: story.user || {
              full_name: "User",
              avatar_url: null,
              username: "user"
            },
            stories: [],
          };
        }
        grouped[userId].stories.push(story);
      });

      const sorted = Object.values(grouped).sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        
        const aLatest = a.stories && a.stories.length > 0 ? a.stories[a.stories.length - 1]?.created_at : null;
        const bLatest = b.stories && b.stories.length > 0 ? b.stories[b.stories.length - 1]?.created_at : null;
        
        if (!aLatest && !bLatest) return 0;
        if (!aLatest) return 1;
        if (!bLatest) return -1;
        
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });

      setActiveStoryGroups(sorted);
    } catch (err) {
      console.error("Error fetching active stories in MessageScreen:", err);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchConversations();
        fetchConnections();
        fetchActiveStories();
      }
    }, [currentUserId, fetchActiveStories])
  );

  useEffect(() => {
    fetchConversations();
    fetchConnections();
    fetchCurrentUserProfile();
    fetchActiveStories();

    // Set initial presence from global cache
    if (global.latestPresenceState) {
      const state = global.latestPresenceState;
      const allPresentIds = Object.keys(state).filter(id => id !== currentUserId);
      setPresentUserIds(allPresentIds);

      const onlineIds = Object.keys(state).filter(id => {
        if (id === currentUserId) return false;
        const presences = state[id];
        if (presences && presences.length > 0) {
          const sorted = [...presences].sort((a, b) => new Date(b.online_at || 0) - new Date(a.online_at || 0));
          if (sorted[0] && sorted[0].hide_active === true) return false;
        }
        return true;
      });
      setOnlineUserIds(onlineIds);

      const notes = {};
      Object.keys(state).forEach(id => {
        const presences = state[id];
        if (presences && presences.length > 0) {
          const sorted = [...presences].sort((a, b) => new Date(b.online_at || 0) - new Date(a.online_at || 0));
          const latestPresence = sorted[0];
          if (latestPresence && latestPresence.status_note) {
            notes[id] = latestPresence.status_note;
          }
        }
      });
      setOnlineUserNotes(notes);
    }

    // Subscribe to presence sync events emitted by TabLayout
    const presenceSub = DeviceEventEmitter.addListener('presence_sync', (state) => {
      const allPresentIds = Object.keys(state).filter(id => id !== currentUserId);
      setPresentUserIds(allPresentIds);

      const onlineIds = Object.keys(state).filter(id => {
        if (id === currentUserId) return false;
        const presences = state[id];
        if (presences && presences.length > 0) {
          const sorted = [...presences].sort((a, b) => new Date(b.online_at || 0) - new Date(a.online_at || 0));
          if (sorted[0] && sorted[0].hide_active === true) return false;
        }
        return true;
      });
      setOnlineUserIds(onlineIds);

      const notes = {};
      Object.keys(state).forEach(id => {
        const presences = state[id];
        if (presences && presences.length > 0) {
          const sorted = [...presences].sort((a, b) => new Date(b.online_at || 0) - new Date(a.online_at || 0));
          const latestPresence = sorted[0];
          if (latestPresence && latestPresence.status_note) {
            notes[id] = latestPresence.status_note;
          }
        }
      });
      setOnlineUserNotes(notes);
    });

    // Setup live subscription for conversations and connections changes
    const uniqueChannelName = `conversations-realtime-${currentUserId}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections'
        },
        (payload) => {
          console.log("[MessageScreen Debug] Connection change detected:", payload.eventType);
          const record = payload.new || payload.old;
          if (payload.eventType === 'DELETE' || (record && (record.friend_id === currentUserId || record.user_id === currentUserId))) {
            fetchConnections();
          }
        }
      )
      .subscribe();

    // Subscribe to personal inbox broadcasts (to sync conversation previews instantly)
    const userInboxChannelName = `user-inbox-${currentUserId}`;
    const userInboxChannel = supabase
      .channel(userInboxChannelName)
      .on(
        'broadcast',
        { event: 'new_message' },
        () => {
          console.log("[Broadcast Debug] MessageScreen received new_message broadcast");
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(userInboxChannel);
      presenceSub.remove();
    };
  }, [currentUserId]);

  useEffect(() => {
    const loadActiveStatusSetting = async () => {
      try {
        const val = await AsyncStorage.getItem('privacy_active_status');
        setActiveStatusEnabled(val !== 'false');
      } catch (err) {
        console.error("Error loading active status setting:", err);
      }
    };
    loadActiveStatusSetting();
    const sub = DeviceEventEmitter.addListener('privacy_settings_changed', loadActiveStatusSetting);
    return () => sub.remove();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
    fetchConnections();
    fetchCurrentUserProfile();
    fetchActiveStories();
  };

  const handleMarkAsRead = async (conversationId) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .eq("is_read", false);

      if (error) throw error;
      fetchConversations();
    } catch (err) {
      console.error("Error marking conversation as read:", err.message);
    }
  };

  const handleMarkAsUnread = async (conversationId) => {
    try {
      // Find the latest message in this conversation sent by the other user
      const { data: latestReceivedMsg, error: fetchErr } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (latestReceivedMsg) {
        const { error: updateErr } = await supabase
          .from("messages")
          .update({ is_read: false })
          .eq("id", latestReceivedMsg.id);

        if (updateErr) throw updateErr;
        fetchConversations();
      }
    } catch (err) {
      console.error("Error marking conversation as unread:", err.message);
    }
  };

  const showChatOptions = (conv) => {
    const recipient = conv.user_1 === currentUserId ? conv.user2 : conv.user1;
    if (!recipient) return;

    const unreadCount = unreadCounts[conv.id] || 0;
    const isUnread = unreadCount > 0;

    const options = [];
    if (isUnread) {
      options.push({
        text: "Mark as Read",
        onPress: () => handleMarkAsRead(conv.id)
      });
    } else {
      options.push({
        text: "Mark as Unread",
        onPress: () => handleMarkAsUnread(conv.id)
      });
    }
    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert(
      recipient.full_name || "Chat Options",
      "Manage this conversation thread",
      options
    );
  };

  const getRelativeTime = (isoString) => {
    if (!isoString) return "";
    const now = new Date();
    const created = new Date(isoString);
    const diffMs = now - created;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    return `${diffDay}d`;
  };

  // Filter conversations based on current tab and search query
  const filteredConversations = conversations.filter(conv => {
    // 1. Tab filter
    if (activeTab === "Inbox") {
      // Inbox contains accepted conversations OR pending conversations where the current user is user_1 (the sender)
      if (conv.status !== "accepted" && conv.user_2 === currentUserId) return false;
    } else {
      // Requests contains pending conversations where the current user is user_2 (the receiver)
      if (conv.status !== "pending" || conv.user_1 === currentUserId) return false;
    }

    // 2. Search query filter
    const recipient = conv.user_1 === currentUserId ? conv.user2 : conv.user1;
    if (!recipient) return false;

    const fullName = recipient.full_name?.toLowerCase() || "";
    const username = recipient.username?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    return fullName.includes(query) || username.includes(query);
  });

  // Count total pending requests for badge indicator
  const pendingRequestsCount = conversations.filter(
    conv => conv.status === "pending" && conv.user_2 === currentUserId
  ).length;

  const renderConversationItem = ({ item }) => {
    const recipient = item.user_1 === currentUserId ? item.user2 : item.user1;
    if (!recipient) return null;

    const unreadCount = unreadCounts[item.id] || 0;
    const isUnread = unreadCount > 0;

    return (
      <View style={styles.chatCard}>
        <Pressable
          onPress={() => {
            const userGroupIndex = activeStoryGroups.findIndex(g => g.userId === recipient.id);
            if (userGroupIndex !== -1) {
              setSelectedStoryGroupIndex(userGroupIndex);
              setIsStoryViewerVisible(true);
            } else {
              router.push({
                pathname: "/chat",
                params: { conversationId: item.id }
              });
            }
          }}
          style={styles.avatarContainer}
        >
          <Image
            source={
              recipient.avatar_url && recipient.avatar_url.trim() !== ""
                ? { uri: recipient.avatar_url }
                : require("../../assets/images/default.png")
            }
            style={[
              fixedMessageStyles.avatar,
              activeStoryGroups.some(g => g.userId === recipient.id) ? styles.activeAvatarWithStory : null
            ]}
          />
          {activeStatusEnabled && onlineUserIds.includes(recipient.id) && (
            <View style={styles.greenDotIndicatorList} />
          )}
        </Pressable>

        <Pressable
          onPress={() => router.push({
            pathname: "/chat",
            params: { conversationId: item.id }
          })}
          onLongPress={() => showChatOptions(item)}
          style={styles.cardContentWrapper}
        >
          <View style={styles.cardContent}>
            <Text style={[styles.nameText, isUnread ? styles.unreadTextBold : null]}>
              {recipient.full_name || "User"}
            </Text>
            <Text
              style={[styles.messageText, isUnread ? styles.unreadTextBold : null]}
              numberOfLines={1}
            >
              {item.last_message
                ? (item.last_sender_id === currentUserId ? `You: ${item.last_message}` : item.last_message)
                : "No messages yet"
              }
            </Text>
          </View>

          <View style={styles.cardRight}>
            <Text style={styles.timeText}>
              {getRelativeTime(item.updated_at)}
            </Text>
            {isUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : (
              item.last_sender_id === currentUserId && item.messages && item.messages.length > 0 && (
                <View style={styles.readStatusContainerCard}>
                  {item.messages[0].is_read ? (
                    <Image
                      source={
                        recipient.avatar_url && recipient.avatar_url.trim() !== ""
                          ? { uri: recipient.avatar_url }
                          : require("../../assets/images/default.png")
                      }
                      style={fixedMessageStyles.tinyReadAvatarCard}
                    />
                  ) : (
                    <SentCheckIcon size={12} filled={recipient && onlineUserIds.includes(recipient.id)} />
                  )}
                </View>
              )
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  const activeSliderData = [];
  if (currentUserProfile) {
    activeSliderData.push({
      id: currentUserId,
      full_name: t('settings.selectLanguage') === 'Select Language' ? 'My Status' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Mi estado' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Mon statut' : 'Meu status',
      avatar_url: currentUserProfile.avatar_url,
      isCurrentUser: true,
      status_note: myStatusNote
    });
  }
  // Combine connections and conversation recipients into a unique list of contacts by ID
  const allContactsMap = new Map();
  connections.forEach(c => allContactsMap.set(c.id, c));
  conversations.forEach(conv => {
    const recipient = conv.user_1 === currentUserId ? conv.user2 : conv.user1;
    if (recipient && !allContactsMap.has(recipient.id)) {
      allContactsMap.set(recipient.id, {
        id: recipient.id,
        full_name: recipient.full_name,
        avatar_url: recipient.avatar_url,
        username: recipient.username
      });
    }
  });
  const allContacts = Array.from(allContactsMap.values());
  const onlineConnections = allContacts.filter(c => onlineUserIds.includes(c.id) || !!onlineUserNotes[c.id]);
  onlineConnections.forEach(c => {
    activeSliderData.push({
      id: c.id,
      full_name: c.full_name,
      avatar_url: c.avatar_url,
      isCurrentUser: false,
      status_note: onlineUserNotes[c.id] || ""
    });
  });

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('chat.messages')}</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <SearchIcon color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('feed.searchPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Active Users Horizontal Slider */}
        {activeSliderData.length > 0 && (
          <View style={styles.activeUsersContainer}>
            <Text style={styles.activeSectionTitle}>{t('chat.online')} ({onlineConnections.length})</Text>
            <FlatList
              horizontal
              data={activeSliderData}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeListContent}
              renderItem={({ item }) => {
                const isMe = item.isCurrentUser;
                const userGroupIndex = activeStoryGroups.findIndex(g => g.userId === item.id);
                const hasActiveStory = userGroupIndex !== -1;
                return (
                  <Pressable
                    onPress={() => {
                      if (isMe) {
                        if (hasActiveStory) {
                          setSelectedStoryGroupIndex(userGroupIndex);
                          setIsStoryViewerVisible(true);
                        } else {
                          setStatusModalVisible(true);
                        }
                      } else {
                        if (hasActiveStory) {
                          setSelectedStoryGroupIndex(userGroupIndex);
                          setIsStoryViewerVisible(true);
                        } else {
                          router.push({
                            pathname: "/chat",
                            params: { recipientId: item.id }
                          });
                        }
                      }
                    }}
                    style={styles.activeUserCard}
                  >
                    <View style={styles.activeAvatarWrapper}>
                      <Image
                        source={
                          item.avatar_url && item.avatar_url.trim() !== ""
                            ? { uri: item.avatar_url }
                            : require("../../assets/images/default.png")
                        }
                        style={[
                          fixedMessageStyles.activeAvatar,
                          isMe ? styles.myActiveAvatar : null,
                          hasActiveStory ? styles.activeAvatarWithStory : null
                        ]}
                      />
                      {isMe ? (
                        activeStatusEnabled && <View style={styles.greenDotIndicator} />
                      ) : (
                        onlineUserIds.includes(item.id) && <View style={styles.greenDotIndicator} />
                      )}
                      {isMe && (
                        <View style={styles.plusIconBadge}>
                          <Text style={styles.plusIconBadgeText}>+</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.activeName} numberOfLines={1}>
                      {isMe ? (t('settings.selectLanguage') === 'Select Language' ? 'My Status' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Mi estado' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Mon statut' : 'Meu status') : item.full_name.split(" ")[0]}
                    </Text>
                    {item.status_note ? (
                      <Text style={styles.statusNoteText} numberOfLines={1}>
                        {item.status_note}
                      </Text>
                    ) : isMe ? (
                      <Text style={styles.statusNotePlaceholder} numberOfLines={1}>
                        {/* Set status */}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* Sub-Tabs Selector */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === "Inbox" && styles.activeTab]}
            onPress={() => setActiveTab("Inbox")}
          >
            <Text style={[styles.tabText, activeTab === "Inbox" && styles.activeTabText]}>
              {t('chat.messages')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === "Requests" && styles.activeTab]}
            onPress={() => setActiveTab("Requests")}
          >
            <View style={styles.tabWithBadge}>
              <Text style={[styles.tabText, activeTab === "Requests" && styles.activeTabText]}>
                {t('connections.requests')}
              </Text>
              {pendingRequestsCount > 0 && (
                <View style={styles.requestCountBadge}>
                  <Text style={styles.requestCountBadgeText}>{pendingRequestsCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/* Conversations List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.accent]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <EmptyChatIcon color="#9CA3AF" size={42} />
                <Text style={styles.emptyTitle}>
                  {t('chat.empty')}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {t('chat.empty')}
                </Text>
              </View>
            }
          />
        )}
        {/* Custom Vibe Status Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={statusModalVisible}
          onRequestClose={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('settings.selectLanguage') === 'Select Language' ? 'Set Status Note' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Establecer nota de estado' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Définir une note de statut' : 'Definir nota de status'}</Text>
                <Pressable onPress={() => setStatusModalVisible(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.modalSubtitle}>{t('feed.whatsOnYourMind')}</Text>

              <TextInput
                style={styles.statusInput}
                placeholder={t('feed.whatsOnYourMind')}
                placeholderTextColor="#9CA3AF"
                value={statusInputText}
                onChangeText={setStatusInputText}
                maxLength={30}
                autoFocus
              />

              <Text style={styles.presetLabel}>{t('settings.selectLanguage') === 'Select Language' ? 'Select Preset' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Seleccionar predeterminado' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Choisir un préréglage' : 'Selecionar predefinição'}</Text>
              <View style={styles.presetsContainer}>
                {[
                  { 
                    text: t('settings.selectLanguage') === 'Select Language' ? 'Available 💬' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Disponible 💬' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Disponible 💬' : 'Disponível 💬',
                    val: "Available 💬"
                  },
                  { 
                    text: t('settings.selectLanguage') === 'Select Language' ? 'Working 💻' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Trabajando 💻' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Au travail 💻' : 'Trabalhando 💻',
                    val: "Working 💻"
                  },
                  { 
                    text: t('settings.selectLanguage') === 'Select Language' ? 'At gym 🏋️' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'En el gimnasio 🏋️' : t('settings.selectLanguage') === 'Choisir la langue' ? 'À la salle de sport 🏋️' : 'Na academia 🏋️',
                    val: "At gym 🏋️"
                  },
                  { 
                    text: t('settings.selectLanguage') === 'Select Language' ? 'Chilling 🍹' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Relajándome 🍹' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Détente 🍹' : 'Relaxando 🍹',
                    val: "Chilling 🍹"
                  },
                  { 
                    text: t('settings.selectLanguage') === 'Select Language' ? 'In meeting 🚫' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'En reunión 🚫' : t('settings.selectLanguage') === 'Choisir la langue' ? 'En réunion 🚫' : 'Em reunião 🚫',
                    val: "In meeting 🚫"
                  },
                  { 
                    text: t('settings.selectLanguage') === 'Select Language' ? 'Out for lunch 🍔' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Almorzando 🍔' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Déjeuner dehors 🍔' : 'Almoçando 🍔',
                    val: "Out for lunch 🍔"
                  },
                ].map((preset) => (
                  <Pressable
                    key={preset.val}
                    onPress={() => setStatusInputText(preset.text)}
                    style={[
                      styles.presetBubble,
                      statusInputText === preset.text && styles.activePresetBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        statusInputText === preset.text && styles.activePresetText,
                      ]}
                    >
                      {preset.text}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalActionRow}>
                {myStatusNote ? (
                  <Pressable
                    onPress={async () => {
                      try {
                        await AsyncStorage.setItem(`status_note_${currentUserId}`, "");
                        setMyStatusNote("");
                        setStatusInputText("");

                        if (presenceChannelRef.current) {
                          await presenceChannelRef.current.track({
                            user_id: currentUserId,
                            online_at: new Date().toISOString(),
                            status_note: "",
                          });
                        }

                        setStatusModalVisible(false);
                      } catch (err) {
                        console.error("Error clearing status note:", err);
                      }
                    }}
                    style={styles.clearStatusButton}
                  >
                    <Text style={styles.clearStatusButtonText}>{t('settings.selectLanguage') === 'Select Language' ? 'Clear Status' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Borrar estado' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Effacer le statut' : 'Limpar status'}</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={async () => {
                    try {
                      const cleanNote = statusInputText.trim().substring(0, 30);
                      await AsyncStorage.setItem(`status_note_${currentUserId}`, cleanNote);
                      setMyStatusNote(cleanNote);

                      if (presenceChannelRef.current) {
                        await presenceChannelRef.current.track({
                          user_id: currentUserId,
                          online_at: new Date().toISOString(),
                          status_note: cleanNote,
                        });
                      }

                      setStatusModalVisible(false);
                    } catch (err) {
                      console.error("Error saving status note:", err);
                    }
                  }}
                  style={styles.saveStatusButton}
                >
                  <Text style={styles.saveStatusButtonText}>{t('settings.selectLanguage') === 'Select Language' ? 'Save' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Guardar' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Enregistrer' : 'Salvar'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* STORY PLAYBACK VIEWER */}
        {activeStoryGroups.length > 0 && (
          <StoryViewer
            visible={isStoryViewerVisible}
            storyGroups={activeStoryGroups}
            initialGroupIndex={selectedStoryGroupIndex}
            initialStoryIndex={0}
            onClose={() => setIsStoryViewerVisible(false)}
            onStoryDeleted={() => {
              setIsStoryViewerVisible(false);
              fetchActiveStories();
            }}
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

export default MessageScreen;

const styles = createResponsiveStyleSheet({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },

  header: {
    height: 56,
    justifyContent: 'center',
    marginTop: 10,
  },

  headerTitle: {
    fontSize: 28,
    fontFamily: TYPOGRAPHY.bold,
    color: '#111111',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: '#111111',
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },

  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },

  tabText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.medium,
    color: '#6B7280',
  },

  activeTabText: {
    color: '#111111',
    fontFamily: TYPOGRAPHY.semiBold,
  },

  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  requestCountBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  requestCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.bold,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContainer: {
    paddingBottom: 24,
  },

  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    backgroundColor: '#FFFFFF',
  },

  cardContentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },



  cardContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },

  nameText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#111111',
  },

  messageText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
    marginTop: 4,
  },

  unreadTextBold: {
    fontFamily: TYPOGRAPHY.bold,
    color: '#111111',
  },

  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },

  timeText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.regular,
    color: '#9CA3AF',
  },

  unreadBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },

  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.bold,
  },

  readStatusContainerCard: {
    marginTop: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },



  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 100,
  },

  emptyTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#374151',
    marginTop: 14,
  },

  emptySubtitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  activeUsersContainer: {
    marginBottom: 20,
  },

  activeSectionTitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  activeListContent: {
    gap: 16,
    paddingRight: 16,
  },

  activeUserCard: {
    alignItems: 'center',
    width: 60,
  },

  avatarContainer: {
    position: 'relative',
  },



  greenDotIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  greenDotIndicatorList: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  activeName: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.medium,
    color: '#4B5563',
    marginTop: 6,
    textAlign: 'center',
  },

  activeAvatarWrapper: {
    position: 'relative',
    marginBottom: 2,
  },

  myActiveAvatar: {
    borderColor: '#E5E7EB',
    borderWidth: 1.5,
  },

  activeAvatarWithStory: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },

  plusIconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  plusIconBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: TYPOGRAPHY.bold,
    lineHeight: 12,
  },

  statusNoteText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.regular,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },

  statusNotePlaceholder: {
    fontSize: 9,
    fontFamily: TYPOGRAPHY.medium,
    color: COLORS.accent,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.85,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.bold,
    color: '#111111',
  },

  modalSubtitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
    marginBottom: 16,
  },

  modalCloseButton: {
    fontSize: 18,
    color: '#9CA3AF',
    fontFamily: TYPOGRAPHY.semiBold,
    padding: 4,
  },

  statusInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: '#111111',
    marginBottom: 20,
  },

  presetLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },

  presetBubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  activePresetBubble: {
    backgroundColor: '#E5F2FF',
    borderColor: '#99CCFF',
  },

  presetText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.medium,
    color: '#4B5563',
  },

  activePresetText: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
  },

  clearStatusButton: {
    flex: 1,
    backgroundColor: '#FFF1F2',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },

  clearStatusButtonText: {
    color: '#E11D48',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  saveStatusButton: {
    flex: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveStatusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.semiBold,
  },
});

const fixedMessageStyles = StyleSheet.create({
  avatar: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    resizeMode: 'cover',
  },
  activeAvatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    resizeMode: 'cover',
  },
  tinyReadAvatarCard: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    resizeMode: 'cover',
  },
});
