import { Dimensions, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import ScreenWrapper from "../../components/ScreenWrapper";
import Search from "../../assets/vectors/search.svg";
import Notification from "../../assets/vectors/bell.svg";
import Message from "../../assets/vectors/send.svg";
import Img from "../../assets/vectors/img.svg";
import Vid from "../../assets/vectors/videos.svg";
import Att from "../../assets/vectors/link.svg";
import COLORS from "../../constants/colors";
import TYPOGRAPHY from "../../constants/typography";
import Story from "../../components/Story";
import Feed from "../../components/Feed";
import { moderateScale, scale, verticalScale } from "../../utils/scale";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { auth } from "../../config/firebase";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

export default function Index() {
  const [avatar, setAvatar] = useState(null);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch avatar on mount
  useEffect(() => {
    const fetchAvatar = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", user.uid)
        .single();

      if (!error && data?.avatar_url) {
        setAvatar(data.avatar_url);
      }
    };

    fetchAvatar();
  }, []);

  // Fetch feed dynamic data
  const fetchFeed = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log("Fetching home feed posts...");
      const { data, error } = await supabase
        .from("home_feed")
        .select("*")
        .eq("viewer_id", user.uid)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Feed fetched successfully, count:", data?.length || 0);

      // Map the database View columns to feed item properties
      const formattedFeeds = (data || []).map((post) => ({
        id: post.post_id.toString(),
        author_id: post.author_id,
        user: {
          name: post.author_name || "User",
          profilePic:
            post.author_avatar && post.author_avatar.trim() !== ""
              ? { uri: post.author_avatar }
              : require("../../assets/images/prof.jpeg"),
        },
        content: post.content,
        time: new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: post.media_url ? { uri: post.media_url } : null,
        likes: "0",
        comments: "0",
      }));

      setFeeds(formattedFeeds);
    } catch (err) {
      console.error("Error fetching home feed:", err?.message || err);
      if (err && typeof err === 'object') {
        console.error("Error details:", JSON.stringify(err, null, 2));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Automatically refresh feed when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchFeed(feeds.length === 0);
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed(false);
  };

  const { width } = Dimensions.get("screen");
  const logoWidth = width * 0.4;

  const stories = [
    { id: "1", name: "John Berry", image: require("../../assets/images/profile.png") },
    { id: "2", name: "David", image: require("../../assets/images/profile.png") },
    { id: "3", name: "Sarah", image: require("../../assets/images/profile.png") },
    { id: "4", name: "Daniel", image: require("../../assets/images/profile.png") },
    { id: "5", name: "Daniel", image: require("../../assets/images/profile.png") },
  ];

  const Header = () => (
    <View>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/brand.png")}
          style={{ width: logoWidth, height: logoWidth * 0.3, resizeMode: "contain" }}
        />
        <View style={styles.logoIcons}>
          <Pressable><Search width={24} height={24} /></Pressable>
          <Pressable><Notification width={24} height={24} /></Pressable>
          <Pressable><Message width={24} height={24} /></Pressable>
        </View>
      </View>

      {/* Upload Container */}
      <Pressable
        style={styles.uploadContainer}
        onPress={() => router.push("/create-post")}
      >
        <View style={styles.imgCont}>
          <Image 
            source={
              avatar
                ? { uri: avatar }
                : require("../../assets/images/default.png")
            }
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
            }}
          />
          <Text style={{ fontFamily: TYPOGRAPHY.regular, fontSize: 18 }}>What's on your mind?</Text>
        </View>

        <View style={styles.uploads}>
          <Pressable style={styles.links} onPress={() => router.push("/create-post")}>
            <Img width={19.5} height={19.5} />
            <Text style={styles.linkText}>Image</Text>
          </Pressable>
          <View style={styles.linkLine} />
          <Pressable style={styles.links} onPress={() => router.push("/create-post")}>
            <Vid width={19.5} height={19.5} />
            <Text style={styles.linkText}>Videos</Text>
          </Pressable>
          <View style={styles.linkLine} />
          <Pressable style={styles.links} onPress={() => router.push("/create-post")}>
            <Att width={19.5} height={19.5} />
            <Text style={styles.linkText}>Attachment</Text>
          </Pressable>
        </View>
      </Pressable>

      {/* Stories */}
      <View style={styles.storyWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center", paddingVertical: 5 }}
        >
          <Story image={require("../../assets/images/story.png")} name="Your Story" isOwnStory />
          {stories.map((item) => (
            <Story key={item.id} image={item.image} name={item.name} />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  // Full screen loading indicator on first boot
  if (loading && feeds.length === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <FlatList
        data={feeds}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Feed item={item} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Header />}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet!</Text>
            <Text style={styles.emptySubText}>Create a post or add connections to populate your feed.</Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: scale(10),
  },

  logoIcons: {
    flexDirection: "row",
    gap: 16,
  },

  storyWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: scale(-8),
  },

  uploadContainer: {
    borderWidth: 1,
    borderStyle: "dotted",
    borderRadius: 10,
    borderColor: COLORS.accent,
    marginVertical: scale(25),
    padding: scale(25),
  },

  imgCont: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  uploads: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 7,
    backgroundColor: "#ecf8ff",
    borderColor: "#D0EEFF",
    marginTop: scale(20),
    paddingVertical: scale(12),
    gap: scale(10),
  },

  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
  },

  linkText: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: moderateScale(14),
  },

  linkLine: {
    backgroundColor: "#a0a0a0",
    width: scale(2),
    height: verticalScale(16),
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 16,
    color: COLORS.primary,
  },

  emptyContainer: {
    paddingVertical: 60,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#444",
  },

  emptySubText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
});