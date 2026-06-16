import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  Pressable, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { auth } from '../../config/firebase';
import { useRouter } from 'expo-router';
import TYPOGRAPHY from '../../constants/typography';
import COLORS from '../../constants/colors';
import Back from '../../assets/vectors/back.svg';
import Notification from '../../assets/vectors/bell.svg';

const NotificationScreen = () => {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          receiver_id,
          sender_id,
          type,
          post_id,
          comment_id,
          is_read,
          created_at,
          sender:users!notifications_sender_id_fkey (
            full_name,
            avatar_url,
            username
          ),
          posts (
            content,
            repost_id
          ),
          post_comments (
            content
          )
        `)
        .eq("receiver_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Setup realtime subscription for new incoming notifications
    const uniqueChannelName = `notifications-realtime-${currentUserId}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications', 
          filter: `receiver_id=eq.${currentUserId}` 
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error("Error marking notification as read:", err.message);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUserId || notifications.length === 0) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("receiver_id", currentUserId)
        .eq("is_read", false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err.message);
    }
  };

  const handleNotificationPress = async (item) => {
    if (!item.is_read) {
      await handleMarkAsRead(item.id);
    }

    // Navigation based on notification type
    if (item.type === 'connection_request' || item.type === 'connection_accepted') {
      router.push({
        pathname: "/profile",
        params: { userId: item.sender_id }
      });
    } else if (item.post_id) {
      router.push({
        pathname: "/comments",
        params: { postId: item.post_id }
      });
    }
  };

  const handleAcceptConnection = async (item) => {
    try {
      // 1. Accept pending request
      const { error: connError } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("user_id", item.sender_id)
        .eq("friend_id", currentUserId);

      if (connError) throw connError;

      // 2. Mark this request notification as read
      await handleMarkAsRead(item.id);
      
      fetchNotifications();
    } catch (err) {
      console.error("Error accepting connection:", err.message);
    }
  };

  const handleDeclineConnection = async (item) => {
    try {
      // 1. Delete connection record
      const { error: connError } = await supabase
        .from("connections")
        .delete()
        .eq("user_id", item.sender_id)
        .eq("friend_id", currentUserId);

      if (connError) throw connError;

      // 2. Delete notification card
      const { error: notifError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", item.id);

      if (notifError) throw notifError;
      
      fetchNotifications();
    } catch (err) {
      console.error("Error declining connection:", err.message);
    }
  };

  const getNotificationText = (item) => {
    const senderName = item.sender?.full_name || "Someone";
    
    const renderSender = () => (
      <Text style={styles.boldText}>{senderName}</Text>
    );

    switch (item.type) {
      case 'repost':
        const repostPreview = item.posts?.content 
          ? ` "${item.posts.content.substring(0, 25)}${item.posts.content.length > 25 ? '...' : ''}"` 
          : "";
        return repostPreview ? (
          <>{renderSender()} reposted your post:{repostPreview}</>
        ) : (
          <>{renderSender()} reposted your post</>
        );
      case 'reaction':
        if (item.comment_id) {
          const preview = item.post_comments?.content 
            ? ` "${item.post_comments.content.substring(0, 25)}${item.post_comments.content.length > 25 ? '...' : ''}"` 
            : "";
          return preview ? (
            <>{renderSender()} reacted to your comment:{preview}</>
          ) : (
            <>{renderSender()} reacted to your comment</>
          );
        } else {
          if (item.posts?.repost_id) {
            const preview = item.posts?.content 
              ? ` "${item.posts.content.substring(0, 25)}${item.posts.content.length > 25 ? '...' : ''}"` 
              : "";
            return preview ? (
              <>{renderSender()} reacted to the post you reshared:{preview}</>
            ) : (
              <>{renderSender()} reacted to the post you reshared</>
            );
          }
          const preview = item.posts?.content 
            ? ` "${item.posts.content.substring(0, 25)}${item.posts.content.length > 25 ? '...' : ''}"` 
            : "";
          return preview ? (
            <>{renderSender()} reacted to your post:{preview}</>
          ) : (
            <>{renderSender()} reacted to your post</>
          );
        }
      case 'comment':
        const commentPreview = item.post_comments?.content 
          ? ` "${item.post_comments.content.substring(0, 25)}${item.post_comments.content.length > 25 ? '...' : ''}"` 
          : "";
        if (item.posts?.repost_id) {
          return commentPreview ? (
            <>{renderSender()} commented on the post you reshared:{commentPreview}</>
          ) : (
            <>{renderSender()} commented on the post you reshared</>
          );
        }
        return commentPreview ? (
          <>{renderSender()} commented on your post:{commentPreview}</>
        ) : (
          <>{renderSender()} commented on your post</>
        );
      case 'reply':
        const replyPreview = item.post_comments?.content 
          ? ` "${item.post_comments.content.substring(0, 25)}${item.post_comments.content.length > 25 ? '...' : ''}"` 
          : "";
        return replyPreview ? (
          <>{renderSender()} replied to your comment:{replyPreview}</>
        ) : (
          <>{renderSender()} replied to your comment</>
        );
      case 'connection_request':
        return <>{renderSender()} sent you a connection request.</>;
      case 'connection_accepted':
        return <>{renderSender()} accepted your connection request.</>;
      case 'mention':
        if (item.comment_id) {
          const preview = item.post_comments?.content 
            ? ` "${item.post_comments.content.substring(0, 25)}${item.post_comments.content.length > 25 ? '...' : ''}"` 
            : "";
          return preview ? (
            <>{renderSender()} mentioned you in a comment:{preview}</>
          ) : (
            <>{renderSender()} mentioned you in a comment</>
          );
        } else {
          const preview = item.posts?.content 
            ? ` "${item.posts.content.substring(0, 25)}${item.posts.content.length > 25 ? '...' : ''}"` 
            : "";
          if (item.posts?.repost_id) {
            return preview ? (
              <>{renderSender()} mentioned you in a reshared post:{preview}</>
            ) : (
              <>{renderSender()} mentioned you in a reshared post</>
            );
          }
          return preview ? (
            <>{renderSender()} mentioned you in a post:{preview}</>
          ) : (
            <>{renderSender()} mentioned you in a post</>
          );
        }
      default:
        return <>{renderSender()} interacted with your account.</>;
    }
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
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'reaction':
        return { bg: '#FEE2E2', color: '#EF4444', emoji: '❤️' };
      case 'comment':
      case 'reply':
        return { bg: '#DBEAFE', color: '#3B82F6', emoji: '💬' };
      case 'connection_request':
        return { bg: '#D1FAE5', color: '#10B981', emoji: '👤' };
      case 'connection_accepted':
        return { bg: '#E0F2FE', color: '#0EA5E9', emoji: '🤝' };
      case 'mention':
        return { bg: '#F3E8FF', color: '#A855F7', emoji: '🏷️' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', emoji: '🔔' };
    }
  };

  const renderNotificationItem = ({ item }) => {
    const sender = item.sender || {};
    const avatar = sender.avatar_url;
    const badge = getBadgeStyle(item.type);

    return (
      <Pressable 
        onPress={() => handleNotificationPress(item)}
        style={[
          styles.notificationCard,
          !item.is_read ? styles.unreadCard : null
        ]}
      >
        {/* Profile Avatar & Badge Icon */}
        <View style={styles.avatarContainer}>
          <Image
            source={
              avatar && avatar.trim() !== ""
                ? { uri: avatar }
                : require("../../assets/images/default.png")
            }
            style={styles.avatar}
          />
          <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
          </View>
        </View>

        {/* Content Block */}
        <View style={styles.contentContainer}>
          <Text style={styles.notificationText}>
            {getNotificationText(item)}
          </Text>
          
          <Text style={styles.timeText}>
            {getRelativeTime(item.created_at)}
          </Text>

          {/* Action Row for Connection Requests */}
          {item.type === 'connection_request' && !item.is_read && (
            <View style={styles.actionRow}>
              <Pressable 
                onPress={() => handleAcceptConnection(item)} 
                style={styles.acceptButton}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </Pressable>
              
              <Pressable 
                onPress={() => handleDeclineConnection(item)} 
                style={styles.declineButton}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Unread dot */}
        {!item.is_read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerLeft}>
            <Back width={24} height={24} />
            <Text style={styles.headerTitle}>Notifications</Text>
          </Pressable>
          {notifications.some(n => !n.is_read) && (
            <Pressable onPress={handleMarkAllRead} style={styles.markAllRead}>
              <Text style={styles.markAllReadText}>Mark all as read</Text>
            </Pressable>
          )}
        </View>

        {/* Content Body */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh} 
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}><Notification width={30} height={30} /></Text>
                <Text style={styles.emptyText}>All caught up!</Text>
                <Text style={styles.emptySubText}>
                  {"When other users react, comment, mention or connect with you, they'll show up here."}
                </Text>
              </View>
            }
          />
        )}

      </View>
    </ScreenWrapper>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#111111',
  },

  markAllRead: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  markAllReadText: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContainer: {
    paddingBottom: 20,
  },

  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    backgroundColor: '#FFFFFF',
  },

  unreadCard: {
    backgroundColor: '#F3F8FF', // Soft modern blue unread highlight
  },

  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  badgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  badgeEmoji: {
    fontSize: 10,
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  notificationText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 18,
    fontFamily: TYPOGRAPHY.regular,
  },

  boldText: {
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#111111',
  },

  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: TYPOGRAPHY.regular,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },

  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  declineButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  declineButtonText: {
    color: '#4B5563',
    fontSize: 12,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 12,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 120,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#374151',
  },

  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    fontFamily: TYPOGRAPHY.regular,
  },
});
