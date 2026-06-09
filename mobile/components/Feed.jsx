import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Pressable, Alert, Share as RNShare } from 'react-native';
import Like from "../assets/vectors/like.svg";
import Message from "../assets/vectors/message.svg";
import Share from "../assets/vectors/share.svg";
import Saved from "../assets/vectors/save.svg";
import LinkIcon from "../assets/vectors/link.svg";
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { auth } from '../config/firebase';
import { supabase } from '../lib/supabase';
import { renderTextWithMentions } from '../utils/mentions';

// Custom inline SVG icons for visual excellence
const EditIcon = ({ color = "#333", size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <Path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Svg>
);

const DeleteIcon = ({ color = "red", size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="3 6 5 6 21 6" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <Line x1="10" y1="11" x2="10" y2="17" />
    <Line x1="14" y1="11" x2="14" y2="17" />
  </Svg>
);

const ReportIcon = ({ color = "red", size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <Line x1="4" y1="22" x2="4" y2="15" />
  </Svg>
);

const BookmarkIcon = ({ color = "#666", size = 24, filled = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Svg>
);

const Feed = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  // Reaction and interaction states
  const [myReaction, setMyReaction] = useState(null);
  const [reactionCounts, setReactionCounts] = useState({});
  const [totalReactions, setTotalReactions] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showReactionsPanel, setShowReactionsPanel] = useState(false);

  const cardWidth = Dimensions.get("window").width - 60;
  const currentUserId = auth.currentUser?.uid;
  const isAuthor = item.author_id === currentUserId;

  // Helpers for reaction calculations
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
      case 'angry': return '#e1523c'; // Dark Orange/Red
      default: return '#666';
    }
  };

  const getTopReactionEmojis = (counts) => {
    const sorted = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => getReactionEmoji(type));
    return sorted.slice(0, 3);
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const fetchReactionsCount = async () => {
    if (!item.id) return;
    const { data, error } = await supabase
      .from("post_reactions")
      .select("reaction_type")
      .eq("post_id", item.id);
    if (!error && data) {
      const counts = {};
      data.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      setReactionCounts(counts);
      setTotalReactions(data.length);
    }
  };

  const fetchCommentsCount = async () => {
    if (!item.id) return;
    const { count, error } = await supabase
      .from("post_comments")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", item.id);
    if (!error && count !== null) {
      setCommentsCount(count);
    }
  };

  const fetchSavesCount = async () => {
    if (!item.id) return;
    const { count, error } = await supabase
      .from("saved_posts")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", item.id);
    if (!error && count !== null) {
      setSavesCount(count);
    }
  };

  const fetchSharesCount = async () => {
    if (!item.id) return;
    const { count, error } = await supabase
      .from("post_shares")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", item.id);
    if (!error && count !== null) {
      setSharesCount(count);
    } else if (error && (error.code === '42P01' || error.message.includes("does not exist"))) {
      // Gracefully handle if post_shares table is not yet created by the user
      console.log("post_shares table does not exist. Ignoring share count.");
    }
  };

  const handleLogShare = async () => {
    if (!item.id) return;
    try {
      const { error } = await supabase
        .from("post_shares")
        .insert({
          post_id: item.id,
          user_id: currentUserId || null
        });
      if (!error) {
        setSharesCount(prev => prev + 1);
      } else if (error && (error.code === '42P01' || error.message.includes("does not exist"))) {
        // Fallback: local increment if table is not created yet
        setSharesCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error logging share:", err.message);
      // Fallback
      setSharesCount(prev => prev + 1);
    }
  };

  // Fetch interactions (reactions, comments, saved status)
  useEffect(() => {
    let active = true;

    const fetchInteractions = async () => {
      if (!currentUserId || !item.id) return;

      try {
        // 1. Fetch user reaction
        const { data: reactData, error: reactError } = await supabase
          .from("post_reactions")
          .select("reaction_type")
          .eq("post_id", item.id)
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (active) {
          if (!reactError && reactData) {
            setMyReaction(reactData.reaction_type);
          } else {
            setMyReaction(null);
          }
        }

        // 2. Fetch counts
        await fetchReactionsCount();
        await fetchCommentsCount();
        await fetchSavesCount();
        await fetchSharesCount();

        // 3. Fetch save status
        const { data: saveDoc, error: saveError } = await supabase
          .from("saved_posts")
          .select("id")
          .eq("post_id", item.id)
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (active) {
          setIsSaved(!!saveDoc);
        }
      } catch (err) {
        console.error("Error loading interactions:", err);
      }
    };

    fetchInteractions();

    // Supabase Real-time updates for reactions and comments on this post
    const channel = supabase
      .channel(`post-realtime-${item.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions', filter: `post_id=eq.${item.id}` },
        () => {
          fetchReactionsCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${item.id}` },
        () => {
          fetchCommentsCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_posts', filter: `post_id=eq.${item.id}` },
        () => {
          fetchSavesCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_shares', filter: `post_id=eq.${item.id}` },
        () => {
          fetchSharesCount();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [item.id, currentUserId]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    setActiveIndex(index);
  };

  const navigateToProfile = () => {
    if (item.author_id) {
      router.push({
        pathname: "/(tabs)/profile",
        params: { userId: item.author_id }
      });
    }
  };

  const handleEditPost = () => {
    setShowOptions(false);
    router.push({
      pathname: "/create-post",
      params: { editId: item.id }
    });
  };

  const handleDeletePost = () => {
    setShowOptions(false);
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", item.id);
              if (error) throw error;
              Alert.alert("Success", "Post deleted successfully!");
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const handleCopyLink = async () => {
    setShowOptions(false);
    const postUrl = `https://zyntra.com/posts/${item.id}`;
    // Support basic react-native copy
    const Clipboard = require('react-native').Clipboard;
    if (Clipboard) {
      Clipboard.setString(postUrl);
      Alert.alert("Link Copied", "Post link copied to clipboard!");
      await handleLogShare();
    } else {
      Alert.alert("Error", "Clipboard is not available.");
    }
  };

  const handleSharePost = () => {
    setShowOptions(false);
    Alert.alert(
      "Share Post",
      "Choose how you want to share this post:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Copy Link", 
          onPress: handleCopyLink
        },
        { 
          text: "Share Outside Platform", 
          onPress: async () => {
            try {
              await RNShare.share({
                message: `${item.content || "Check out this post on Zyntra!"}\n\nRead more on Zyntra!`,
              });
              await handleLogShare();
            } catch (error) {
              console.error(error.message);
            }
          }
        }
      ]
    );
  };

  const handleSavePostToggle = async () => {
    setShowOptions(false);
    if (!currentUserId) return;

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", item.id)
          .eq("user_id", currentUserId);

        if (error) throw error;
        setIsSaved(false);
        setSavesCount(prev => Math.max(0, prev - 1));
        Alert.alert("Removed Bookmark", "Post removed from your bookmarks.");
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .insert({
            post_id: item.id,
            user_id: currentUserId
          });

        if (error) throw error;
        setIsSaved(true);
        setSavesCount(prev => prev + 1);
        Alert.alert("Bookmarked", "Post saved to your bookmarks successfully!");
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err.message);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUserId) {
      Alert.alert("Not logged in", "Please log in to react to posts.");
      return;
    }

    try {
      if (myReaction) {
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", item.id)
          .eq("user_id", currentUserId);

        if (error) throw error;
        setMyReaction(null);
        setReactionCounts(prev => {
          const updated = { ...prev };
          if (updated[myReaction] > 1) {
            updated[myReaction]--;
          } else {
            delete updated[myReaction];
          }
          return updated;
        });
        setTotalReactions(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from("post_reactions")
          .upsert({
            post_id: item.id,
            user_id: currentUserId,
            reaction_type: 'like'
          }, { onConflict: 'post_id,user_id' });

        if (error) throw error;
        setMyReaction('like');
        setReactionCounts(prev => ({
          ...prev,
          like: (prev.like || 0) + 1
        }));
        setTotalReactions(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error toggling like:", err.message);
    }
  };

  const handleSelectReaction = async (type) => {
    setShowReactionsPanel(false);
    if (!currentUserId) return;

    try {
      const oldReaction = myReaction;
      const { error } = await supabase
        .from("post_reactions")
        .upsert({
          post_id: item.id,
          user_id: currentUserId,
          reaction_type: type
        }, { onConflict: 'post_id,user_id' });

      if (error) throw error;

      setMyReaction(type);
      setReactionCounts(prev => {
        const updated = { ...prev };
        if (oldReaction) {
          if (updated[oldReaction] > 1) {
            updated[oldReaction]--;
          } else {
            delete updated[oldReaction];
          }
        }
        updated[type] = (updated[type] || 0) + 1;
        return updated;
      });

      if (!oldReaction) {
        setTotalReactions(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error setting reaction:", err.message);
    }
  };

  const navigateToComments = () => {
    if (!item.id) return;
    router.push({
      pathname: "/comments",
      params: { postId: item.id }
    });
  };

  const handleReportPost = () => {
    setShowOptions(false);
    Alert.alert("Reported", "Thank you. This post has been reported for review.");
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.feedHeader}>
        <Pressable onPress={navigateToProfile} style={styles.headerUser}>
          <Image
            source={item.user.profilePic}
            style={styles.profile}
          />

          <View style={styles.feedInfo}>
            <Text style={styles.name}>{item.user.name}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </Pressable>

        {/* Option Action Menu Dots */}
        <Pressable onPress={() => setShowOptions(!showOptions)} style={styles.moreButton}>
          <Text style={styles.moreText}>•••</Text>
        </Pressable>

        {/* Full screen overlay to catch click away and close options */}
        {showOptions && (
          <Pressable 
            style={styles.overlayClose} 
            onPress={() => setShowOptions(false)}
          />
        )}

        {/* Options Dropdown Overlay */}
        {showOptions && (
          <View style={styles.optionsDropdown}>
            {isAuthor && (
              <>
                <TouchableOpacity onPress={handleEditPost} style={styles.optionItem}>
                  <EditIcon size={16} color="#333" />
                  <Text style={styles.optionText}>Edit Post</Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
              </>
            )}

            <TouchableOpacity onPress={handleCopyLink} style={styles.optionItem}>
              <LinkIcon width={16} height={16} color="#333" />
              <Text style={styles.optionText}>Copy Link</Text>
            </TouchableOpacity>

            <View style={styles.optionDivider} />

            <TouchableOpacity onPress={handleSharePost} style={styles.optionItem}>
              <Share width={16} height={16} color="#333" />
              <Text style={styles.optionText}>Share Post</Text>
            </TouchableOpacity>

            <View style={styles.optionDivider} />

            <TouchableOpacity onPress={handleSavePostToggle} style={styles.optionItem}>
              <BookmarkIcon size={16} color={isSaved ? "#438def" : "#333"} filled={isSaved} />
              <Text style={[styles.optionText, isSaved ? { color: "#438def" } : null]}>
                {isSaved ? "Saved" : "Save Post"}
              </Text>
            </TouchableOpacity>

            {isAuthor && (
              <>
                <View style={styles.optionDivider} />
                <TouchableOpacity onPress={handleDeletePost} style={styles.optionItem}>
                  <DeleteIcon size={16} color="red" />
                  <Text style={[styles.optionText, { color: "red" }]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            )}

            {!isAuthor && (
              <>
                <View style={styles.optionDivider} />
                <TouchableOpacity onPress={handleReportPost} style={styles.optionItem}>
                  <ReportIcon size={16} color="red" />
                  <Text style={[styles.optionText, { color: "red" }]}>Report Post</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.feedContent}>

        <Text
          numberOfLines={expanded ? undefined : 3}
          style={styles.contentText}
          onTextLayout={(e) => {
            if (!expanded && !showMore) {
              setShowMore(e.nativeEvent.lines.length >= 3);
            }
          }}
        >
          {renderTextWithMentions(item.content, styles.mentionLink, styles.contentText)}
        </Text>

        {/* Show button ONLY if text exceeds 3 lines */}
        {showMore && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={styles.seeMore}>
              {expanded ? "see less" : "see more"}
            </Text>
          </TouchableOpacity>
        )}

        {(() => {
          const getImagesList = () => {
            if (!item.image) return [];
            if (Array.isArray(item.image)) return item.image;
            if (item.image.uri && typeof item.image.uri === 'string' && item.image.uri.includes(',')) {
              return item.image.uri.split(',').map(url => ({ uri: url }));
            }
            return [item.image];
          };

          const images = getImagesList();
          if (images.length === 0) return null;

          if (images.length === 1) {
            return (
              <Image
                source={images[0]}
                style={[styles.feedImage, { width: cardWidth }]}
                resizeMode="cover"
              />
            );
          }

          return (
            <View style={styles.carouselContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.carouselScrollView}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {images.map((img, index) => (
                  <Image
                    key={index}
                    source={img}
                    style={[styles.carouselImage, { width: cardWidth, height: 200 }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              <View style={styles.dotsContainer}>
                {images.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.dot, 
                      activeIndex === index ? styles.activeDot : null
                    ]} 
                  />
                ))}
              </View>
            </View>
          );
        })()}

      </View>

      {/* Interaction Counts Info Bar */}
      {(totalReactions > 0 || commentsCount > 0) && (
        <View style={styles.infoBar}>
          <View style={styles.infoReactions}>
            {totalReactions > 0 && (
              <>
                <View style={styles.emojiContainer}>
                  {getTopReactionEmojis(reactionCounts).map((emoji, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.emojiCircle, 
                        { 
                          marginLeft: index > 0 ? -6 : 0, 
                          zIndex: 10 - index 
                        }
                      ]}
                    >
                      <Text style={styles.infoReactionsEmojis}>{emoji}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.infoReactionsText}>
                  {totalReactions}
                </Text>
              </>
            )}
          </View>
          {commentsCount > 0 && (
            <Text style={styles.infoCommentsText}>
              {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
            </Text>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.feedFooter}>

        <View style={styles.reactions}>

          <Pressable 
            onPress={handleToggleLike}
            onLongPress={() => setShowReactionsPanel(true)}
            delayLongPress={250}
            style={styles.likes}
          >
            {myReaction ? (
              <Text style={{ fontSize: 24 }}>{getReactionEmoji(myReaction)}</Text>
            ) : (
              <Like width={24} height={24} color="#666" />
            )}
            {totalReactions > 0 && (
              <Text style={styles.actionText}>{totalReactions}</Text>
            )}
          </Pressable>

          <Pressable onPress={navigateToComments} style={styles.comments}>
            <Message width={24} height={24} color="#666" />
            {commentsCount > 0 && (
              <Text style={styles.actionText}>{commentsCount}</Text>
            )}
          </Pressable>

          <Pressable onPress={handleSharePost} style={styles.share}>
            <Share width={24} height={24} color="#666" />
            {sharesCount > 0 && (
              <Text style={styles.actionText}>{sharesCount}</Text>
            )}
          </Pressable>

        </View>

        <Pressable onPress={handleSavePostToggle} style={styles.save}>
          <BookmarkIcon size={24} color={isSaved ? "#438def" : "#666"} filled={isSaved} />
          {savesCount > 0 && (
            <Text style={[styles.actionText, isSaved ? { color: "#438def" } : null]}>
              {savesCount}
            </Text>
          )}
        </Pressable>

        {/* Floating Reactions Option Panel */}
        {showReactionsPanel && (
          <View style={styles.reactionsPanel}>
            {['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'].map((type) => (
              <Pressable
                key={type}
                onPress={() => handleSelectReaction(type)}
                style={styles.reactionPanelEmojiWrapper}
              >
                <Text style={styles.reactionPanelEmoji}>
                  {getReactionEmoji(type)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

      </View>

    </View>
  );
};

export default Feed;

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 15,
    position: "relative", // Ensure relative layout context for absolute dropdowns
  },

  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    zIndex: 99,
  },

  headerUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  moreButton: {
    padding: 5,
  },

  moreText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "bold",
  },

  optionsDropdown: {
    position: "absolute",
    top: 35,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 5,
    width: 150,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontWeight: "500",
  },

  optionDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },

  profile: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  feedInfo: {
    gap: 3,
  },

  name: {
    fontWeight: "bold",
    fontSize: 14,
  },

  time: {
    fontSize: 12,
    color: "#a0a0a0",
  },

  feedContent: {
    marginBottom: 10,
  },

  contentText: {
    lineHeight: 22,
  },

  mentionLink: {
    color: "#5096F1",
    fontWeight: "bold",
  },

  seeMore: {
    color: "#888",
    marginTop: 4,
  },

  feedImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },

  carouselContainer: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
    position: "relative",
  },

  carouselScrollView: {
    width: "100%",
    height: "100%",
  },

  carouselImage: {
    height: "100%",
  },

  dotsContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginHorizontal: 1,
  },
  activeDot: {
    backgroundColor: "#ffffff",
    width: 12,
  },

  feedFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  reactions: {
    flexDirection: "row",
    gap: 25,
    alignItems: "center",
  },

  likes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  comments: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  share: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  save: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  actionText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },

  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 5,
  },

  infoReactions: {
    flexDirection: "row",
    alignItems: "center",
  },

  emojiContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
  },

  emojiCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },

  infoReactionsEmojis: {
    fontSize: 12,
    lineHeight: 14,
  },

  infoReactionsText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },

  infoCommentsText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },

  reactionsPanel: {
    position: "absolute",
    bottom: 45,
    left: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
    zIndex: 9999,
  },

  reactionPanelEmojiWrapper: {
    transform: [{ scale: 1 }],
  },

  reactionPanelEmoji: {
    fontSize: 26,
  },

  overlayClose: {
    position: "absolute",
    top: -500,
    bottom: -1000,
    left: -100,
    right: -100,
    backgroundColor: "transparent",
    zIndex: 98,
  },
});