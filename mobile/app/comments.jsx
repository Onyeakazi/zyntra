import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { auth } from '../config/firebase';
import ScreenWrapper from '../components/ScreenWrapper';
import { renderTextWithMentions, handleMentionPress } from '../utils/mentions';
import Back from '../assets/vectors/back.svg';
import TYPOGRAPHY from '../constants/typography';
import COLORS from '../constants/colors';
import { StatusBar } from 'expo-status-bar';

export default function Comments() {
  const { postId } = useLocalSearchParams();
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [comments, setComments] = useState([]);
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [isSuggestingMentions, setIsSuggestingMentions] = useState(false);

  // Replies and reactions states
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeReactionsMenuId, setActiveReactionsMenuId] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});

  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // Reaction Helpers
  const getReactionEmoji = (type) => {
    switch (type) {
      case 'like': return '👍';
      case 'love': return '❤️';
      case 'care': return '🥰';
      case 'haha': return '😂';
      case 'wow': return '😮';
      case 'sad': return '😢';
      case 'angry': return '😡';
      default: return '👍';
    }
  };

  const getReactionColor = (type) => {
    switch (type) {
      case 'like': return '#438def'; // Blue
      case 'love': return '#f33d45'; // Red
      case 'haha':
      case 'wow':
      case 'care': return '#f5b50a'; // Gold/Yellow
      case 'sad': return '#f5b50a';
      case 'angry': return '#e1523c'; // Dark Orange
      default: return '#6B7280';
    }
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Fetch current user avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!currentUserId) return;
      const { data, error } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", currentUserId)
        .single();
      if (!error && data?.avatar_url) {
        setCurrentUserAvatar(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [currentUserId]);

  // Fetch all users for auto-complete suggestions
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, username, avatar_url");
        if (!error && data) {
          setAllUsers(data);
        }
      } catch (err) {
        console.error("Error fetching users for comments autocomplete:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleCommentTextChange = (text) => {
    setCommentText(text);

    // Check if typing a mention at the end of the text
    const mentionMatch = text.match(/@([a-zA-Z0-9_]*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setIsSuggestingMentions(true);

      const filtered = allUsers.filter(u =>
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.full_name && u.full_name.toLowerCase().includes(query))
      ).slice(0, 5);

      setSuggestedUsers(filtered);
    } else {
      setIsSuggestingMentions(false);
      setSuggestedUsers([]);
    }
  };

  const handleSelectSuggestedUser = (suggestedUsername) => {
    const updated = commentText.replace(/@([a-zA-Z0-9_]*)$/, `@${suggestedUsername} `);
    setCommentText(updated);
    setIsSuggestingMentions(false);
    setSuggestedUsers([]);
    inputRef.current?.focus();
  };

  const fetchComments = async (scrollToEnd = false) => {
    if (!postId) return;
    try {
      // 1. Fetch comments and nested replies
      const { data, error } = await supabase
        .from("post_comments")
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          parent_id,
          users (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const fetchedComments = data || [];

      // 2. Fetch reactions for these comments
      const commentIds = fetchedComments.map(c => c.id);
      let reactionsList = [];

      if (commentIds.length > 0) {
        const { data: reacts, error: reactErr } = await supabase
          .from("comment_reactions")
          .select("comment_id, reaction_type, user_id")
          .in("comment_id", commentIds);

        if (!reactErr && reacts) {
          reactionsList = reacts;
        }
      }

      // 3. Map reactions metadata to comment records
      const processedComments = fetchedComments.map(comment => {
        const commentReacts = reactionsList.filter(r => r.comment_id === comment.id);
        const myReactObj = commentReacts.find(r => r.user_id === currentUserId);
        const counts = {};

        commentReacts.forEach(r => {
          counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        });

        const sortedEmojis = Object.entries(counts)
          .filter(([_, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([type]) => getReactionEmoji(type))
          .slice(0, 3);

        return {
          ...comment,
          totalReactions: commentReacts.length,
          myReaction: myReactObj ? myReactObj.reaction_type : null,
          reactionCounts: counts,
          topReactionEmojis: sortedEmojis
        };
      });

      // 4. Split and nest replies inside parent comments
      const parents = processedComments.filter(c => !c.parent_id);
      const replies = processedComments.filter(c => c.parent_id);

      const commentsWithReplies = parents.map(parent => ({
        ...parent,
        replies: replies.filter(r => r.parent_id === parent.id)
      }));

      setComments(commentsWithReplies);

      if (scrollToEnd && commentsWithReplies.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err) {
      console.error("Error fetching comments/replies:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Setup queries and real-time subscription
  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-realtime-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions'
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handlePostComment = async () => {
    if (!commentText.trim() || submitting || !currentUserId || !postId) return;
    setSubmitting(true);

    try {
      const insertData = {
        post_id: postId,
        user_id: currentUserId,
        content: commentText.trim()
      };

      if (replyingTo) {
        insertData.parent_id = replyingTo.id;
      }

      const { error } = await supabase
        .from("post_comments")
        .insert(insertData);

      if (error) throw error;

      setCommentText("");
      setReplyingTo(null);
      fetchComments(true);
    } catch (err) {
      console.error("Error posting comment/reply:", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartReply = (parentComment) => {
    setReplyingTo(parentComment);
    // Auto expand the parent replies list so they can see their reply being typed
    setExpandedComments(prev => ({
      ...prev,
      [parentComment.id]: true
    }));
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleToggleCommentLike = async (commentId, myReactionType) => {
    if (!currentUserId) return;

    try {
      if (myReactionType) {
        const { error } = await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comment_reactions")
          .upsert({
            comment_id: commentId,
            user_id: currentUserId,
            reaction_type: 'like'
          }, { onConflict: 'comment_id,user_id' });

        if (error) throw error;
      }
      fetchComments();
    } catch (err) {
      console.error("Error toggling comment like:", err.message);
    }
  };

  const handleSelectCommentReaction = async (commentId, type) => {
    setActiveReactionsMenuId(null);
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("comment_reactions")
        .upsert({
          comment_id: commentId,
          user_id: currentUserId,
          reaction_type: type
        }, { onConflict: 'comment_id,user_id' });

      if (error) throw error;
      fetchComments();
    } catch (err) {
      console.error("Error setting comment reaction:", err.message);
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const formatCommentTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + " at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderReplyItem = (reply, parent, isLast) => {
    const replyUser = reply.users || {};
    const name = replyUser.full_name || "User";
    const username = replyUser.username || "username";
    const avatar = replyUser.avatar_url;

    return (
      <View key={reply.id} style={styles.replyRow}>
        {/* Left column drawing the thread line segment */}
        <View style={styles.replyLeftColumn}>
          {/* Upper vertical line */}
          <View style={styles.verticalLineUpper} />
          {/* Lower vertical line */}
          {!isLast && <View style={styles.verticalLineLower} />}
          {/* Horizontal branch line */}
          <View style={styles.horizontalBranchLine} />
        </View>

        <Image
          source={
            avatar && avatar.trim() !== ""
              ? { uri: avatar }
              : require("../assets/images/default.png")
          }
          style={styles.replyAvatar}
        />

        <View style={styles.commentBubbleContainer}>
          <View style={styles.commentBubble}>
            <Text style={styles.commentAuthorName}>{name}</Text>
            {/* <Text style={styles.commentAuthorUsername}>@{username}</Text> */}
            <Text style={styles.commentContent}>
              <Text
                style={styles.replyMention}
                onPress={() => handleMentionPress(parent.users?.username)}
              >
                @{parent.users?.username}{' '}
              </Text>
              {renderTextWithMentions(reply.content, styles.mentionLink, {})}
            </Text>

            {/* Reactions count on bubble */}
            {reply.totalReactions > 0 && (
              <View style={styles.commentReactionsBadge}>
                <View style={styles.badgeEmojis}>
                  {reply.topReactionEmojis.map((emoji, idx) => (
                    <Text key={idx} style={styles.badgeEmoji}>{emoji}</Text>
                  ))}
                </View>
                <Text style={styles.badgeCount}>{reply.totalReactions}</Text>
              </View>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.commentActions}>
            <Pressable
              onPress={() => handleToggleCommentLike(reply.id, reply.myReaction)}
              onLongPress={() => setActiveReactionsMenuId(reply.id)}
              delayLongPress={250}
              style={styles.actionButton}
            >
              <Text style={[
                styles.actionButtonText,
                reply.myReaction ? { color: getReactionColor(reply.myReaction), fontWeight: 'bold' } : null
              ]}>
                {reply.myReaction ? capitalize(reply.myReaction) : "Like"}
              </Text>
            </Pressable>

            <Pressable onPress={() => handleStartReply(parent)} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Reply</Text>
            </Pressable>

            <Text style={styles.commentTime}>{formatCommentTime(reply.created_at)}</Text>

            {/* Floating reactions bar */}
            {activeReactionsMenuId === reply.id && (
              <View style={styles.reactionsPanel}>
                {['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'].map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => handleSelectCommentReaction(reply.id, type)}
                    style={styles.reactionPanelEmojiWrapper}
                  >
                    <Text style={styles.reactionPanelEmoji}>{getReactionEmoji(type)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderCommentItem = ({ item }) => {
    const userProfile = item.users || {};
    const name = userProfile.full_name || "User";
    const username = userProfile.username || "username";
    const avatar = userProfile.avatar_url;
    const isExpanded = !!expandedComments[item.id];

    return (
      <View style={styles.commentRowContainer}>
        <View style={styles.commentRow}>
          {item.replies && item.replies.length > 0 && isExpanded && (
            <View style={styles.parentVerticalLine} />
          )}
          <Image
            source={
              avatar && avatar.trim() !== ""
                ? { uri: avatar }
                : require("../assets/images/default.png")
            }
            style={styles.commentAvatar}
          />

          <View style={styles.commentBubbleContainer}>
            <View style={styles.commentBubble}>
              <Text style={styles.commentAuthorName}>{name}</Text>
              {/* <Text style={styles.commentAuthorUsername}>@{username}</Text> */}
              <Text style={styles.commentContent}>
                {renderTextWithMentions(item.content, styles.mentionLink, {})}
              </Text>

              {/* Reactions count on bubble */}
              {item.totalReactions > 0 && (
                <View style={styles.commentReactionsBadge}>
                  <View style={styles.badgeEmojis}>
                    {item.topReactionEmojis.map((emoji, idx) => (
                      <Text key={idx} style={styles.badgeEmoji}>{emoji}</Text>
                    ))}
                  </View>
                  <Text style={styles.badgeCount}>{item.totalReactions}</Text>
                </View>
              )}
            </View>

            {/* Action Row */}
            <View style={styles.commentActions}>
              <Pressable
                onPress={() => handleToggleCommentLike(item.id, item.myReaction)}
                onLongPress={() => setActiveReactionsMenuId(item.id)}
                delayLongPress={250}
                style={styles.actionButton}
              >
                <Text style={[
                  styles.actionButtonText,
                  item.myReaction ? { color: getReactionColor(item.myReaction), fontWeight: 'bold' } : null
                ]}>
                  {item.myReaction ? capitalize(item.myReaction) : "Like"}
                </Text>
              </Pressable>

              <Pressable onPress={() => handleStartReply(item)} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Reply</Text>
              </Pressable>

              <Text style={styles.commentTime}>{formatCommentTime(item.created_at)}</Text>

              {/* Floating reactions bar */}
              {activeReactionsMenuId === item.id && (
                <View style={styles.reactionsPanel}>
                  {['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'].map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => handleSelectCommentReaction(item.id, type)}
                      style={styles.reactionPanelEmojiWrapper}
                    >
                      <Text style={styles.reactionPanelEmoji}>{getReactionEmoji(type)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Indented Replies Section */}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesSection}>
            {isExpanded && <View style={styles.toggleVerticalLine} />}
            <Pressable onPress={() => toggleReplies(item.id)} style={styles.toggleRepliesButton}>
              <View style={styles.toggleRepliesLine} />
              <Text style={styles.toggleRepliesText}>
                {isExpanded
                  ? "Hide replies"
                  : `View ${item.replies.length} ${item.replies.length === 1 ? "reply" : "replies"}`
                }
              </Text>
            </Pressable>

            {isExpanded && (
              <View style={styles.repliesList}>
                {item.replies.map((reply, idx) => 
                  renderReplyItem(reply, item, idx === item.replies.length - 1)
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 45}
      >
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.headerLeft}>
              <Back width={24} height={24} />
              <Text style={styles.headerTitle}>Comments</Text>
            </Pressable>
          </View>

          {/* Loader or Comments List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderCommentItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              onScroll={() => setActiveReactionsMenuId(null)}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubText}>Be the first to share your thoughts!</Text>
                </View>
              }
            />
          )}

          {/* Replying Status Banner */}
          {replyingTo && (
            <View style={styles.replyingBanner}>
              <Text style={styles.replyingBannerText}>
                Replying to <Text style={{ fontWeight: 'bold', color: COLORS.accent }}>@{replyingTo.users?.username}</Text>
              </Text>
              <Pressable onPress={handleCancelReply} style={styles.replyingBannerClose}>
                <Text style={styles.replyingBannerCloseText}>✕</Text>
              </Pressable>
            </View>
          )}

          {/* Autocomplete Suggestions Popup */}
          {isSuggestingMentions && suggestedUsers.length > 0 && (
            <View style={[
              styles.suggestionsContainer,
              { bottom: replyingTo ? 105 : 65 }
            ]}>
              {suggestedUsers.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => handleSelectSuggestedUser(user.username)}
                  style={styles.suggestionItem}
                >
                  <Image
                    source={
                      user.avatar_url && user.avatar_url.trim() !== ""
                        ? { uri: user.avatar_url }
                        : require("../assets/images/default.png")
                    }
                    style={styles.suggestionAvatar}
                  />
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionFullName}>{user.full_name}</Text>
                    {/* <Text style={styles.suggestionUsername}>@{user.username}</Text> */}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Input Footer */}
          <View style={styles.footer}>
            <Image
              source={
                currentUserAvatar
                  ? { uri: currentUserAvatar }
                  : require("../assets/images/default.png")
              }
              style={styles.footerAvatar}
            />
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={handleCommentTextChange}
                multiline
                maxLength={1000}
              />
              <Pressable
                onPress={handlePostComment}
                disabled={!commentText.trim() || submitting}
                style={[
                  styles.sendButton,
                  (!commentText.trim() || submitting) ? styles.sendButtonDisabled : null
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.sendButtonText}>Post</Text>
                )}
              </Pressable>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  listContainer: {
    padding: 15,
    paddingBottom: 40,
  },

  commentRowContainer: {
    marginBottom: 20,
  },

  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    position: 'relative',
  },

  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  commentBubbleContainer: {
    flex: 1,
    marginLeft: 12,
    position: "relative",
  },

  commentBubble: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
    position: "relative",
  },

  commentAuthorName: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
  },

  commentAuthorUsername: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.regular,
    color: "#6B7280",
    marginTop: 1,
  },

  commentContent: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    color: "#1F2937",
    marginTop: 6,
    lineHeight: 18,
  },

  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 12,
    marginLeft: 4,
    position: "relative",
  },

  actionButton: {
    paddingVertical: 2,
  },

  actionButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.semiBold,
  },

  commentTime: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.regular,
    color: "#9CA3AF",
  },

  commentReactionsBadge: {
    position: "absolute",
    bottom: -10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    zIndex: 10,
  },

  badgeEmojis: {
    flexDirection: "row",
    alignItems: "center",
  },

  badgeEmoji: {
    fontSize: 10,
    marginHorizontal: 0.5,
  },

  badgeCount: {
    fontSize: 10,
    color: "#6B7280",
    marginLeft: 3,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  repliesSection: {
    marginTop: 6,
    position: 'relative',
  },

  toggleRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 8,
    marginLeft: 48,
  },

  toggleRepliesLine: {
    width: 20,
    height: 1,
    backgroundColor: "#D1D5DB",
  },

  toggleRepliesText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.semiBold,
  },

  repliesList: {
    marginTop: 8,
  },

  parentVerticalLine: {
    position: 'absolute',
    left: 18,
    top: 36,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#E5E7EB',
    zIndex: -1,
  },

  toggleVerticalLine: {
    position: 'absolute',
    left: 18,
    top: -6,
    height: 36,
    width: 1.5,
    backgroundColor: '#E5E7EB',
  },

  replyLeftColumn: {
    width: 36,
    alignSelf: 'stretch',
    position: 'relative',
  },

  verticalLineUpper: {
    position: 'absolute',
    left: 18,
    top: 0,
    height: 14,
    width: 1.5,
    backgroundColor: '#E5E7EB',
  },

  verticalLineLower: {
    position: 'absolute',
    left: 18,
    top: 14,
    bottom: -15, // bridges the replyRow margin gap
    width: 1.5,
    backgroundColor: '#E5E7EB',
  },

  horizontalBranchLine: {
    position: 'absolute',
    left: 18,
    top: 14,
    width: 18,
    height: 1.5,
    backgroundColor: '#E5E7EB',
  },

  replyRow: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-start",
  },

  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  replyMention: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.bold,
  },

  mentionLink: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.bold,
  },

  suggestionsContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },

  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  suggestionTextContainer: {
    marginLeft: 12,
  },

  suggestionFullName: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#111111',
  },

  suggestionUsername: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
    marginTop: 1,
  },

  reactionsPanel: {
    position: "absolute",
    bottom: 25,
    left: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    gap: 6,
    zIndex: 9999,
  },

  reactionPanelEmojiWrapper: {
    transform: [{ scale: 1 }],
  },

  reactionPanelEmoji: {
    fontSize: 18,
  },

  replyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  replyingBannerText: {
    fontSize: 12,
    color: "#4B5563",
    fontFamily: TYPOGRAPHY.regular,
  },

  replyingBannerClose: {
    padding: 4,
  },

  replyingBannerCloseText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "bold",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },

  emptyText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#4B5563",
  },

  emptySubText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.regular,
    color: "#9CA3AF",
    marginTop: 4,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },

  footerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },

  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    color: "#1F2937",
    maxHeight: 100,
    paddingVertical: 4,
  },

  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
  },
});
