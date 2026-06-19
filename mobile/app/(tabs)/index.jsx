import { Dimensions, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, RefreshControl, TextInput, Keyboard } from "react-native";
import { StatusBar } from "expo-status-bar";
import ScreenWrapper from "../../components/ScreenWrapper";
import Search from "../../assets/vectors/search.svg";
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { formatPostTime } from "../../utils/timeFormat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";

const BackIcon = ({ color = "#111", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5" />
    <Path d="M12 19l-7-7 7-7" />
  </Svg>
);

export default function Index() {
  const [avatar, setAvatar] = useState(null);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const navigation = useNavigation();

  // Hide parent tab bar when search overlay is active
  useEffect(() => {
    // 1. Set on the screen itself so parent Tab navigator reads it
    navigation.setOptions({
      tabBarStyle: isSearchActive ? { display: 'none' } : {
        backgroundColor: COLORS.bg,
        height: 85,
        paddingTop: 18,
        paddingBottom: 15,
      }
    });

    // 2. Also set on parent as fallback
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: isSearchActive ? { display: 'none' } : {
          backgroundColor: COLORS.bg,
          height: 85,
          paddingTop: 18,
          paddingBottom: 15,
        }
      });
    }
  }, [isSearchActive, navigation]);

  // Load recent searches from AsyncStorage on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await AsyncStorage.getItem("recent_searches");
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Error loading recent searches:", err);
      }
    };
    loadRecentSearches();
  }, []);

  const [isSearchSubmitted, setIsSearchSubmitted] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleExitSearch = () => {
    Keyboard.dismiss();
    setIsSearchActive(false);
    setSearchQuery("");
    setIsSearchSubmitted(false);
  };

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    setIsSearchSubmitted(false);
  };

  const handleSearchSubmit = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    
    setIsSearchSubmitted(true);

    let matchedUser = searchResults.find(user => {
      const name = (user.full_name || "").toLowerCase();
      const username = (user.username || "").toLowerCase();
      const q = trimmed.toLowerCase();
      return name.includes(q) || username.includes(q);
    });

    if (!matchedUser) {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, username, avatar_url, bio")
          .or(`full_name.ilike.%${trimmed}%,username.ilike.%${trimmed}%`)
          .limit(1);
        if (!error && data && data.length > 0) {
          matchedUser = data[0];
          setSearchResults(prev => {
            if (prev.some(u => u.id === matchedUser.id)) return prev;
            return [matchedUser, ...prev];
          });
        }
      } catch (err) {
        console.error("Error matching user on submit:", err);
      }
    }

    let itemToAdd;
    if (matchedUser) {
      itemToAdd = {
        type: 'profile',
        id: matchedUser.id,
        name: matchedUser.full_name || "User",
        username: matchedUser.username,
        avatar_url: matchedUser.avatar_url
      };
    } else {
      itemToAdd = trimmed;
    }

    const cleanRecent = recentSearches.filter(s => {
      if (matchedUser) {
        if (s && typeof s === 'object' && s.type === 'profile') {
          return s.id !== matchedUser.id;
        }
        if (typeof s === 'string') {
          const sLower = s.toLowerCase().trim();
          return sLower !== trimmed.toLowerCase() &&
                 sLower !== (matchedUser.full_name || "").toLowerCase().trim() &&
                 sLower !== (matchedUser.username || "").toLowerCase().trim();
        }
      } else {
        if (typeof s === 'string') {
          return s.toLowerCase().trim() !== trimmed.toLowerCase();
        }
      }
      return true;
    });

    const updated = [itemToAdd, ...cleanRecent].slice(0, 10);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem("recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.error("Error saving recent searches:", err);
    }
  };

  const handleSelectRecentSearch = (query) => {
    setSearchQuery(query);
    setIsSearchSubmitted(true);
  };

  const handleSelectUserProfile = async (user) => {
    const profileItem = {
      type: 'profile',
      id: user.id,
      name: user.full_name || "User",
      username: user.username,
      avatar_url: user.avatar_url
    };

    const cleanRecent = recentSearches.filter(s => {
      if (s && typeof s === 'object' && s.type === 'profile') {
        return s.id !== user.id;
      }
      if (typeof s === 'string') {
        const sLower = s.toLowerCase().trim();
        return sLower !== (user.full_name || "").toLowerCase().trim() &&
               sLower !== (user.username || "").toLowerCase().trim() &&
               sLower !== searchQuery.toLowerCase().trim();
      }
      return true;
    });

    const updated = [profileItem, ...cleanRecent].slice(0, 10);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem("recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.error("Error saving recent searches:", err);
    }

    router.push({
      pathname: "/(tabs)/profile",
      params: { userId: user.id }
    });
  };

  const handleSelectRecentSearchItem = (item) => {
    if (typeof item === 'string') {
      handleSelectRecentSearch(item);
    } else if (item && typeof item === 'object' && item.type === 'profile') {
      handleSelectUserProfile({
        id: item.id,
        full_name: item.name,
        username: item.username,
        avatar_url: item.avatar_url
      });
    }
  };

  const handleDeleteRecentSearch = async (itemToDelete) => {
    const updated = recentSearches.filter(s => {
      if (typeof s === 'string' && typeof itemToDelete === 'string') {
        return s !== itemToDelete;
      }
      if (s && typeof s === 'object' && itemToDelete && typeof itemToDelete === 'object') {
        return s.id !== itemToDelete.id;
      }
      return true;
    });
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem("recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.error("Error deleting recent search:", err);
    }
  };

  // Search user profiles based on searchQuery (debounced)
  useEffect(() => {
    const searchProfiles = async () => {
      const query = searchQuery.trim();
      if (!query) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, username, avatar_url, bio")
          .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(20);

        if (!error && data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Error searching profiles:", err);
      } finally {
        setSearchLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      searchProfiles();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchAvatar = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", user.uid)
        .single();

      if (!error && data?.avatar_url) {
        setAvatar(data.avatar_url);
      }
    } catch (err) {
      console.error("Error fetching avatar:", err);
    }
  }, []);

  // Fetch avatar on mount
  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

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
          username: post.author_username || "username",
          profilePic:
            post.author_avatar && post.author_avatar.trim() !== ""
              ? { uri: post.author_avatar }
              : require("../../assets/images/prof.jpeg"),
        },
        content: post.content,
        time: formatPostTime(post.created_at),
        image: post.media_url ? { uri: post.media_url } : null,
        repost_id: post.repost_id,
        original_post: post.repost_id ? {
          id: post.repost_id,
          author_id: post.original_author_id,
          content: post.original_content,
          image: post.original_media_url ? { uri: post.original_media_url } : null,
          media_type: post.original_media_type,
          created_at: post.original_created_at,
          time: formatPostTime(post.original_created_at),
          user: {
            name: post.original_author_name || "User",
            username: post.original_author_username || "username",
            profilePic:
              post.original_author_avatar && post.original_author_avatar.trim() !== ""
                ? { uri: post.original_author_avatar }
                : require("../../assets/images/default.png"),
          }
        } : null,
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
      fetchAvatar();
      
      const loadRecentSearches = async () => {
        try {
          const stored = await AsyncStorage.getItem("recent_searches");
          if (stored) {
            setRecentSearches(JSON.parse(stored));
          }
        } catch (err) {
          console.error("Error loading recent searches on focus:", err);
        }
      };
      loadRecentSearches();

      return () => {
        setIsSearchActive(false);
        setSearchQuery("");
        setIsSearchSubmitted(false);
      };
    }, [feeds.length, fetchAvatar])
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
          <Pressable onPress={() => setIsSearchActive(true)}>
            <Search width={24} height={24} color="#000" />
          </Pressable>
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
              avatar && typeof avatar === 'string' && avatar.trim() !== ""
                ? { uri: avatar }
                : require("../../assets/images/default.png")
            }
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
            }}
          />
          <Text style={{ fontFamily: TYPOGRAPHY.regular, fontSize: 18 }}>{"What's on your mind?"}</Text>
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

  const filteredFeeds = feeds.filter(post => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (post.content && post.content.toLowerCase().includes(query)) ||
      (post.user.name && post.user.name.toLowerCase().includes(query))
    );
  });

  if (isSearchActive) {
    return (
      <ScreenWrapper>
        <StatusBar style="dark" />
        
        {/* Search Header Bar */}
        <View style={styles.searchHeaderBar}>
          <Pressable onPress={handleExitSearch} style={styles.searchBackBtn}>
            <BackIcon size={24} color="#111" />
          </Pressable>
          
          <View style={styles.searchFieldContainer}>
            <TextInput
              style={styles.searchInputActive}
              placeholder="Search posts or users..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleSearchSubmit}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} style={styles.searchFieldClear}>
                <Text style={styles.searchFieldClearText}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Search Body Content */}
        {!searchQuery.trim() ? (
          <View style={styles.recentSearchesContainer}>
            <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
            {recentSearches.length === 0 ? (
              <Text style={styles.noRecentText}>No recent searches</Text>
            ) : (
              <FlatList
                data={recentSearches}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => {
                  const isProfile = item && typeof item === 'object' && item.type === 'profile';
                  return (
                    <View style={styles.recentSearchRow}>
                      {isProfile ? (
                        <Pressable style={styles.recentSearchProfileBtn} onPress={() => handleSelectRecentSearchItem(item)}>
                          <Image
                            source={
                              item.avatar_url && typeof item.avatar_url === 'string' && item.avatar_url.trim() !== ""
                                ? { uri: item.avatar_url }
                                : require("../../assets/images/default.png")
                            }
                            style={styles.recentSearchAvatar}
                          />
                          <View style={styles.recentSearchProfileInfo}>
                            <Text style={styles.recentSearchProfileName}>{item.name}</Text>
                          </View>
                        </Pressable>
                      ) : (
                        <Pressable style={styles.recentSearchTextBtn} onPress={() => handleSelectRecentSearchItem(item)}>
                          <Text style={styles.recentSearchIconText}>🕒</Text>
                          <Text style={styles.recentSearchText}>{item}</Text>
                        </Pressable>
                      )}
                      <Pressable style={styles.deleteRecentBtn} onPress={() => handleDeleteRecentSearch(item)}>
                        <Text style={styles.deleteRecentBtnText}>✕</Text>
                      </Pressable>
                    </View>
                  );
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 50 }}
              />
            )}
          </View>
        ) : isSearchSubmitted ? (
          <FlatList
            data={filteredFeeds}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Feed item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
            ListHeaderComponent={
              searchResults.length > 0 ? (
                <View style={{ marginBottom: 15, marginTop: 10 }}>
                  <Text style={{ fontSize: 16, fontFamily: TYPOGRAPHY.semiBold, color: '#111111', marginBottom: 10 }}>People</Text>
                  {searchResults.slice(0, 3).map((user) => (
                    <Pressable
                      key={user.id}
                      style={styles.searchResultUserRow}
                      onPress={() => handleSelectUserProfile(user)}
                    >
                      <Image
                        source={
                          user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.trim() !== ""
                            ? { uri: user.avatar_url }
                            : require("../../assets/images/default.png")
                        }
                        style={styles.searchResultAvatar}
                      />
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{user.full_name || "User"}</Text>
                        {user.bio ? (
                          <Text style={styles.searchResultBio} numberOfLines={1}>{user.bio}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                  {filteredFeeds.length > 0 && (
                    <Text style={{ fontSize: 16, fontFamily: TYPOGRAPHY.semiBold, color: '#111111', marginTop: 15, marginBottom: 10 }}>Posts</Text>
                  )}
                </View>
              ) : null
            }
            ListEmptyComponent={
              searchResults.length > 0 ? (
                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontFamily: TYPOGRAPHY.regular, color: '#888888' }}>No matching posts found</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No results found</Text>
                  <Text style={styles.emptySubText}>{"We couldn't find any posts or people matching \"" + searchQuery + "\""}</Text>
                </View>
              )
            }
          />
        ) : searchLoading ? (
          <View style={styles.searchLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.searchResultUserRow}
                onPress={() => handleSelectUserProfile(item)}
              >
                <Image
                  source={
                    item.avatar_url && typeof item.avatar_url === 'string' && item.avatar_url.trim() !== ""
                      ? { uri: item.avatar_url }
                      : require("../../assets/images/default.png")
                  }
                  style={styles.searchResultAvatar}
                />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{item.full_name || "User"}</Text>
                  {item.bio ? (
                    <Text style={styles.searchResultBio} numberOfLines={1}>{item.bio}</Text>
                  ) : null}
                </View>
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 10, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No people found</Text>
                <Text style={styles.emptySubText}>{"We couldn't find anyone matching \"" + searchQuery + "\""}</Text>
              </View>
            }
          />
        )}
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <FlatList
        data={filteredFeeds}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Feed item={item} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={Header()}
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
    alignItems: "center",
  },

  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: scale(10),
    marginBottom: scale(5),
    height: 40,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: "#1F2937",
    paddingVertical: 8,
  },

  searchClearButton: {
    padding: 6,
  },

  searchClearText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "bold",
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
    marginVertical: scale(10),
    padding: scale(10),
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
  searchHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  searchBackBtn: {
    padding: 4,
  },
  searchFieldContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInputActive: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    fontFamily: TYPOGRAPHY.regular,
    color: "#111111",
  },
  searchFieldClear: {
    padding: 6,
  },
  searchFieldClearText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "bold",
  },
  recentSearchesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
    backgroundColor: "#FFFFFF",
  },
  recentSearchesTitle: {
    fontSize: 17,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
    marginBottom: 15,
  },
  noRecentText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    color: "#888",
    textAlign: "center",
    marginTop: 30,
  },
  recentSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  recentSearchTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  recentSearchIconText: {
    fontSize: 14,
    color: "#888",
  },
  recentSearchText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: "#333",
  },
  deleteRecentBtn: {
    padding: 8,
  },
  deleteRecentBtnText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "bold",
  },
  recentSearchProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  recentSearchAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  recentSearchProfileInfo: {
    justifyContent: "center",
  },
  recentSearchProfileName: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#333",
  },
  recentSearchProfileUsername: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.secondary,
  },
  searchLoaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  searchResultUserRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  searchResultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchResultInfo: {
    marginLeft: 15,
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
  },
  searchResultUsername: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.secondary,
    marginTop: 1,
  },
  searchResultBio: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: "#6B7280",
    marginTop: 3,
  },
});