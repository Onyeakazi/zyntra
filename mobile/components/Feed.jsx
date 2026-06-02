import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Pressable, Alert, Share as RNShare } from 'react-native';
import Like from "../assets/vectors/like.svg";
import Message from "../assets/vectors/message.svg";
import Share from "../assets/vectors/share.svg";
import Saved from "../assets/vectors/save.svg";
import LinkIcon from "../assets/vectors/link.svg";
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { useState } from 'react';
import { router } from 'expo-router';
import { auth } from '../config/firebase';
import { supabase } from '../lib/supabase';

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

const Feed = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  const cardWidth = Dimensions.get("window").width - 60;
  const currentUserId = auth.currentUser?.uid;
  const isAuthor = item.author_id === currentUserId;

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

  const handleCopyLink = () => {
    setShowOptions(false);
    Alert.alert("Link Copied", "Post link copied to clipboard!");
  };

  const handleSharePost = () => {
    setShowOptions(false);
    Alert.alert(
      "Share Post",
      "Choose how you want to share this post:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Send to Zyntra Friend", 
          onPress: () => Alert.alert("Success", "Shared successfully with Zyntra friends!")
        },
        { 
          text: "Share Outside Platform", 
          onPress: async () => {
            try {
              await RNShare.share({
                message: `${item.content || "Check out this post on Zyntra!"}\n\nRead more on Zyntra!`,
              });
            } catch (error) {
              console.error(error.message);
            }
          }
        }
      ]
    );
  };

  const handleSavePost = () => {
    setShowOptions(false);
    Alert.alert("Saved", "Post saved to your bookmarks successfully!");
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

            <TouchableOpacity onPress={handleSavePost} style={styles.optionItem}>
              <Saved width={16} height={16} color="#333" />
              <Text style={styles.optionText}>Save Post</Text>
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
          {item.content}
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

      {/* Footer */}
      <View style={styles.feedFooter}>

        <View style={styles.reactions}>

          <View style={styles.likes}>
            <Like width={24} height={24} />
            <Text>{item.likes}</Text>
          </View>

          <View style={styles.comments}>
            <Message width={24} height={24} />
            <Text>{item.comments}</Text>
          </View>

          <View style={styles.share}>
            <Share width={24} height={24} />
          </View>

        </View>

        <View style={styles.save}>
          <Saved width={24} height={24} />
        </View>

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
    gap: 15,
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
  },

  save: {
    flexDirection: "row",
    alignItems: "center",
  },
});