import { Dimensions, FlatList, Image, Pressable, ScrollView, Text, View, ActivityIndicator, RefreshControl, TextInput, Keyboard, Modal, Platform } from "react-native";
import createResponsiveStyleSheet from "../../utils/responsiveStyleSheet";
import { StatusBar } from "expo-status-bar";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useTranslation } from "react-i18next";
import Search from "../../assets/vectors/search.svg";
import Img from "../../assets/vectors/img.svg";
import Vid from "../../assets/vectors/videos.svg";
import Att from "../../assets/vectors/link.svg";
import COLORS from "../../constants/colors";
import TYPOGRAPHY from "../../constants/typography";
import Story from "../../components/Story";
import Feed from "../../components/Feed";
import { moderateScale, scale, verticalScale } from "../../utils/scale";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { auth } from "../../config/firebase";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { formatPostTime } from "../../utils/timeFormat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import StoryCreator from "../../components/StoryCreator";
import StoryViewer from "../../components/StoryViewer";
import { Ionicons } from "@expo/vector-icons";

const BackIcon = ({ color = "#111", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5" />
    <Path d="M12 19l-7-7 7-7" />
  </Svg>
);

export default function Index() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const [avatar, setAvatar] = useState(null);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const navigation = useNavigation();

  // Stories States
  const [activeStories, setActiveStories] = useState([]);
  const [isStoryTypePickerVisible, setIsStoryTypePickerVisible] = useState(false);
  const [isStoryCreatorVisible, setIsStoryCreatorVisible] = useState(false);
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);
  const [selectedStoryMedia, setSelectedStoryMedia] = useState(null);
  const [selectedStoryMediaType, setSelectedStoryMediaType] = useState("image"); // "image", "video", "text", "shared_post"
  const [selectedSharedPost, setSelectedSharedPost] = useState(null);
  const [isStorySharing, setIsStorySharing] = useState(false);
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState(0);

  const handleOpenShareToStory = (post) => {
    setSelectedSharedPost(post);
    setSelectedStoryMedia(null);
    setSelectedStoryMediaType('shared_post');
    setIsStoryCreatorVisible(true);
  };

  // Viewability configurations for pausing scroll-past videos
  const [activeViewablePostId, setActiveViewablePostId] = useState(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveViewablePostId(viewableItems[0].item.id);
    }
  }).current;

  const checkStoryViewMilestones = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: myStories, error } = await supabase
        .from("stories")
        .select("id, expires_at, created_at")
        .eq("user_id", user.uid)
        .gt("created_at", fortyEightHoursAgo);

      if (error || !myStories) return;

      for (const story of myStories) {
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("receiver_id", user.uid)
          .eq("type", "story_view_milestone")
          .eq("story_id", story.id)
          .maybeSingle();

        if (existingNotif) continue;

        const expiresTime = new Date(story.expires_at).getTime();
        const timeLeftMs = expiresTime - Date.now();

        if (timeLeftMs <= 2 * 60 * 60 * 1000) {
          const { count, error: countErr } = await supabase
            .from("story_views")
            .select("id", { count: "exact", head: true })
            .eq("story_id", story.id);

          if (countErr) continue;

          await supabase
            .from("notifications")
            .insert({
              receiver_id: user.uid,
              sender_id: "system",
              type: "story_view_milestone",
              story_id: story.id,
              story_reaction: String(count || 0),
              is_read: false
            });
        }
      }
    } catch (err) {
      console.error("Error checking story view milestones:", err);
    }
  }, []);

  const fetchActiveStories = useCallback(async () => {
    try {
      console.log("Fetching active stories...");
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

      // Group stories by user_id
      const grouped = {};
      (data || []).forEach((story) => {
        const userId = story.user_id;
        if (!grouped[userId]) {
          grouped[userId] = {
            userId,
            user: story.user || {
              full_name: "Anonymous User",
              avatar_url: null,
              username: "anonymous"
            },
            stories: [],
          };
        }
        grouped[userId].stories.push(story);
      });

      // Sort: logged-in user's stories first, then other stories sorted by latest story time descending
      const currentUid = auth.currentUser?.uid;
      const sortedGroups = Object.values(grouped).sort((a, b) => {
        if (a.userId === currentUid) return -1;
        if (b.userId === currentUid) return 1;
        
        const aLatest = a.stories && a.stories.length > 0 ? a.stories[a.stories.length - 1]?.created_at : null;
        const bLatest = b.stories && b.stories.length > 0 ? b.stories[b.stories.length - 1]?.created_at : null;
        
        if (!aLatest && !bLatest) return 0;
        if (!aLatest) return 1;
        if (!bLatest) return -1;
        
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });

      setActiveStories(sortedGroups);
      
      // Check milestones for user's own stories
      checkStoryViewMilestones();
    } catch (err) {
      console.error("Error fetching active stories detail:", err, err?.message, err?.stack);
    }
  }, [checkStoryViewMilestones]);

  const pickStoryImage = async () => {
    try {
      setIsStoryTypePickerVisible(false);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedStoryMedia(result.assets[0].uri);
        setSelectedStoryMediaType('image');
        setIsStoryCreatorVisible(true);
      }
    } catch (error) {
      console.error("Error picking story image:", error);
      alert("Failed to pick image");
    }
  };

  const pickStoryVideo = async () => {
    try {
      setIsStoryTypePickerVisible(false);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedStoryMedia(result.assets[0].uri);
        setSelectedStoryMediaType('video');
        setIsStoryCreatorVisible(true);
      }
    } catch (error) {
      console.error("Error picking story video:", error);
      alert("Failed to pick video");
    }
  };

  const startTextStory = () => {
    setIsStoryTypePickerVisible(false);
    setSelectedStoryMedia(null);
    setSelectedStoryMediaType('text');
    setIsStoryCreatorVisible(true);
  };

  const uploadStoryToCloudinary = async (uri, type) => {
    try {
      const formData = new FormData();
      let cleanUri = uri;
      try {
        let decoded = decodeURIComponent(cleanUri);
        while (decoded !== cleanUri) {
          cleanUri = decoded;
          decoded = decodeURIComponent(cleanUri);
        }
      } catch (e) {}

      let extension = type === "video" ? "mp4" : "jpg";
      let filename = cleanUri.split("/").pop() || `story.${extension}`;
      if (!filename.includes(".")) {
        filename = `${filename}.${extension}`;
      }

      let mimeType = type === "video" ? "video/mp4" : "image/jpeg";

      if (Platform.OS === "web") {
        const response = await fetch(cleanUri);
        const blob = await response.blob();
        formData.append("file", blob, filename);
      } else {
        formData.append("file", {
          uri: cleanUri,
          type: mimeType,
          name: filename,
        });
      }
      formData.append("upload_preset", "avatar");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dcazbfdaw/${type}/upload`,
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
      console.error("Story Cloudinary upload error:", err);
      throw err;
    }
  };

  const handleShareStory = async ({ mediaUri, mediaType, caption, backgroundColor, sharedPost }) => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to share a story");
      return;
    }

    setIsStorySharing(true);
    try {
      let finalMediaUrl = null;
      if (mediaType === 'shared_post' && sharedPost) {
        let extractedMediaUrl = null;

        // 1. Direct image property
        if (sharedPost.image) {
          if (typeof sharedPost.image === 'string') {
            extractedMediaUrl = sharedPost.image;
          } else if (Array.isArray(sharedPost.image) && sharedPost.image.length > 0) {
            extractedMediaUrl = typeof sharedPost.image[0] === 'string' ? sharedPost.image[0] : sharedPost.image[0]?.uri;
          } else if (sharedPost.image.uri) {
            extractedMediaUrl = sharedPost.image.uri;
          }
        }

        // 2. Direct media_url property
        if (!extractedMediaUrl && sharedPost.media_url) {
          extractedMediaUrl = typeof sharedPost.media_url === 'string' ? sharedPost.media_url : sharedPost.media_url?.uri;
        }

        // 3. Original post property (reposts)
        if (!extractedMediaUrl && sharedPost.original_post) {
          const orig = sharedPost.original_post;
          if (orig.image) {
            if (typeof orig.image === 'string') {
              extractedMediaUrl = orig.image;
            } else if (Array.isArray(orig.image) && orig.image.length > 0) {
              extractedMediaUrl = typeof orig.image[0] === 'string' ? orig.image[0] : orig.image[0]?.uri;
            } else if (orig.image.uri) {
              extractedMediaUrl = orig.image.uri;
            }
          }
          if (!extractedMediaUrl && orig.media_url) {
            extractedMediaUrl = typeof orig.media_url === 'string' ? orig.media_url : orig.media_url?.uri;
          }
        }

        if (extractedMediaUrl && typeof extractedMediaUrl === 'string' && extractedMediaUrl.includes(',')) {
          extractedMediaUrl = extractedMediaUrl.split(',')[0].trim();
        }

        const payload = {
          post_id: sharedPost.id,
          author_name: sharedPost.user?.name || sharedPost.user?.full_name || "User",
          author_username: sharedPost.user?.username || "",
          author_avatar: sharedPost.user?.profilePic?.uri || sharedPost.user?.avatar_url || null,
          content: sharedPost.content || (sharedPost.original_post?.content || ""),
          media_url: extractedMediaUrl,
          created_at: sharedPost.time || sharedPost.created_at || null,
        };
        finalMediaUrl = JSON.stringify(payload);
      } else if (mediaType !== 'text' && mediaUri) {
        finalMediaUrl = await uploadStoryToCloudinary(mediaUri, mediaType);
      }

      const { error } = await supabase
        .from("stories")
        .insert({
          user_id: user.uid,
          media_url: finalMediaUrl,
          media_type: mediaType,
          caption: caption,
          background_color: backgroundColor,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;

      setIsStoryCreatorVisible(false);
      setSelectedSharedPost(null);
      alert("Story shared successfully!");
      fetchActiveStories();
    } catch (err) {
      console.error("Sharing story failed:", err);
      alert("Failed to share story: " + err.message);
    } finally {
      setIsStorySharing(false);
    }
  };

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
          .select("id, full_name, username, avatar_url, bio, is_searchable")
          .or(`full_name.ilike.%${trimmed}%,username.ilike.%${trimmed}%`)
          .limit(1);
        if (!error && data && data.length > 0) {
          const first = data[0];
          if (first.is_searchable !== false) {
            matchedUser = first;
            setSearchResults(prev => {
              if (prev.some(u => u.id === matchedUser.id)) return prev;
              return [matchedUser, ...prev];
            });
          }
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
          .select("id, full_name, username, avatar_url, bio, is_searchable")
          .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(20);

        if (!error && data) {
          const currentUserId = auth.currentUser?.uid;
          const filtered = data.filter(u => {
            if (u.id === currentUserId) return false;
            if (u.is_searchable === false) return false;
            return true;
          });
          setSearchResults(filtered);
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
        .from("posts")
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url,
            username,
            is_searchable
          ),
          original_post:repost_id (
            id,
            user_id,
            content,
            media_url,
            media_type,
            created_at,
            user:user_id (
              id,
              full_name,
              avatar_url,
              username,
              is_searchable
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Feed fetched successfully, count:", data?.length || 0);

      // Map the database posts table columns to feed item properties
      const formattedFeeds = (data || []).map((post) => ({
        id: post.id.toString(),
        author_id: post.user_id,
        user: {
          name: post.user?.full_name || "User",
          username: post.user?.username || "username",
          profilePic:
            post.user?.avatar_url && post.user.avatar_url.trim() !== ""
              ? { uri: post.user.avatar_url }
              : require("../../assets/images/prof.jpeg"),
          is_searchable: post.user?.is_searchable,
        },
        content: post.content,
        time: formatPostTime(post.created_at),
        image: post.media_url ? { uri: post.media_url } : null,
        media_type: post.media_type,
        repost_id: post.repost_id,
        original_post: post.repost_id && post.original_post ? {
          id: post.original_post.id,
          author_id: post.original_post.user_id,
          content: post.original_post.content,
          image: post.original_post.media_url ? { uri: post.original_post.media_url } : null,
          media_type: post.original_post.media_type,
          created_at: post.original_post.created_at,
          time: formatPostTime(post.original_post.created_at),
          user: {
            name: post.original_post.user?.full_name || "User",
            username: post.original_post.user?.username || "username",
            profilePic:
              post.original_post.user?.avatar_url && post.original_post.user.avatar_url.trim() !== ""
                ? { uri: post.original_post.user.avatar_url }
                : require("../../assets/images/default.png"),
            is_searchable: post.original_post.user?.is_searchable,
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
      fetchActiveStories();
      
      const loadRecentSearches = async () => {
        try {
          const stored = await AsyncStorage.getItem("recent_searches");
          if (stored) {
            const parsed = JSON.parse(stored);
            const profileIds = parsed
              .filter(item => item && typeof item === 'object' && item.type === 'profile')
              .map(item => item.id);
            
            if (profileIds.length > 0) {
              const { data: dbProfiles, error } = await supabase
                .from("users")
                .select("id, is_searchable")
                .in("id", profileIds);
              
              if (!error && dbProfiles) {
                const unsearchableIds = new Set(
                  dbProfiles.filter(u => u.is_searchable === false).map(u => u.id)
                );
                const filtered = parsed.filter(item => {
                  if (item && typeof item === 'object' && item.type === 'profile') {
                    return !unsearchableIds.has(item.id);
                  }
                  return true;
                });
                setRecentSearches(filtered);
                await AsyncStorage.setItem("recent_searches", JSON.stringify(filtered));
                return;
              }
            }
            setRecentSearches(parsed);
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
    }, [feeds.length, fetchAvatar, fetchActiveStories])
  );

  // Listen to openSearch query parameter updates
  useEffect(() => {
    if (params?.openSearch === "true") {
      setIsSearchActive(true);
      router.setParams({ openSearch: undefined });
    }
  }, [params?.openSearch]);

  // Listen to postId query parameter updates
  useEffect(() => {
    if (params?.postId) {
      const pid = params.postId;
      router.setParams({ postId: undefined });
      router.push({ pathname: '/comments', params: { postId: pid } });
    }
  }, [params?.postId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed(false);
    fetchActiveStories();
  };

  const { width } = Dimensions.get("screen");
  const logoWidth = width * 0.4;

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
          <Text style={{ fontFamily: TYPOGRAPHY.regular, fontSize: 18 }}>{t('feed.whatsOnYourMind')}</Text>
        </View>

        <View style={styles.uploads}>
          <Pressable style={styles.links} onPress={() => router.push("/create-post")}>
            <Img width={19.5} height={19.5} />
            <Text style={styles.linkText}>{t('feed.photoStory').split(' ')[0]}</Text>
          </Pressable>
          <View style={styles.linkLine} />
          <Pressable style={styles.links} onPress={() => router.push("/create-post")}>
            <Vid width={19.5} height={19.5} />
            <Text style={styles.linkText}>{t('feed.videoStory').split(' ')[0]}</Text>
          </Pressable>
          <View style={styles.linkLine} />
          <Pressable style={styles.links} onPress={() => router.push("/create-post")}>
            <Att width={19.5} height={19.5} />
            <Text style={styles.linkText}>{t('feed.cancel') === 'Cancelar' ? 'Adjunto' : t('feed.cancel') === 'Annuler' ? 'Pièce' : 'Attachment'}</Text>
          </Pressable>
        </View>
      </Pressable>

      {/* Stories */}
      <View style={styles.storyWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center", paddingVertical: 5, paddingHorizontal: 8 }}
        >
          {/* Own Story Card (Create Story) */}
          <Story
            isOwnStory
            image={avatar ? { uri: avatar } : require("../../assets/images/default.png")}
            name={t('feed.createStory')}
            onclick={() => setIsStoryTypePickerVisible(true)}
          />
          
          {/* Active Stories */}
          {activeStories.map((group, index) => {
            const latestStory = group.stories && group.stories.length > 0 ? group.stories[group.stories.length - 1] : {};
            return (
              <Story
                key={group.userId}
                image={latestStory.media_type !== 'text' ? { uri: latestStory.media_url } : null}
                avatar={group.user.avatar_url ? { uri: group.user.avatar_url } : require("../../assets/images/default.png")}
                name={group.userId === auth.currentUser?.uid ? (t('settings.selectLanguage') === 'Select Language' ? 'Your Story' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Tu historia' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Votre Story' : 'Sua história') : group.user.full_name}
                mediaType={latestStory.media_type}
                backgroundColor={latestStory.background_color}
                caption={latestStory.caption}
                onclick={() => {
                  setActiveStoryGroupIndex(index);
                  setIsStoryViewerVisible(true);
                }}
              />
            );
          })}
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
          <Text style={styles.loadingText}>{t('feed.loading')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const filteredFeeds = feeds.filter(post => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    if (post.user.is_searchable === false) return false;
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
              placeholder={t('feed.searchPlaceholder')}
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
            <Text style={styles.recentSearchesTitle}>{t('feed.recentSearches')}</Text>
            {recentSearches.length === 0 ? (
              <Text style={styles.noRecentText}>{t('feed.noRecent')}</Text>
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
                  <Text style={{ fontSize: 16, fontFamily: TYPOGRAPHY.semiBold, color: '#111111', marginBottom: 10 }}>{t('feed.people')}</Text>
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
                    <Text style={{ fontSize: 16, fontFamily: TYPOGRAPHY.semiBold, color: '#111111', marginTop: 15, marginBottom: 10 }}>{t('feed.posts')}</Text>
                  )}
                </View>
              ) : null
            }
            ListEmptyComponent={
              searchResults.length > 0 ? (
                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontFamily: TYPOGRAPHY.regular, color: '#888888' }}>{t('feed.noMatchingPosts')}</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t('feed.noResults')}</Text>
                  <Text style={styles.emptySubText}>{t('feed.noResults') + " \"" + searchQuery + "\""}</Text>
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
        renderItem={({ item }) => (
          <Feed 
            item={item} 
            activePostId={activeViewablePostId} 
            onShareToStory={handleOpenShareToStory}
          />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
            <Text style={styles.emptyText}>{t('feed.emptyFeed')}</Text>
            <Text style={styles.emptySubText}>{t('feed.emptyFeedSub')}</Text>
          </View>
        }
      />

      {/* STORY TYPE SELECTION SHEET (Modal) */}
      <Modal
        visible={isStoryTypePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStoryTypePickerVisible(false)}
      >
        <Pressable
          style={styles.pickerModalBackdrop}
          onPress={() => setIsStoryTypePickerVisible(false)}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeaderBar}>
              <View style={styles.pickerHeaderIndicator} />
              <Text style={styles.pickerTitle}>{t('feed.createStory')}</Text>
            </View>

            <Pressable style={styles.pickerOption} onPress={pickStoryImage}>
              <View style={[styles.pickerIconBg, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="image-outline" size={24} color="#0288D1" />
              </View>
              <Text style={styles.pickerOptionText}>{t('feed.photoStory')}</Text>
            </Pressable>

            <Pressable style={styles.pickerOption} onPress={pickStoryVideo}>
              <View style={[styles.pickerIconBg, { backgroundColor: '#EDE7F6' }]}>
                <Ionicons name="videocam-outline" size={24} color="#5E35B1" />
              </View>
              <Text style={styles.pickerOptionText}>{t('feed.videoStory')}</Text>
            </Pressable>

            <Pressable style={styles.pickerOption} onPress={startTextStory}>
              <View style={[styles.pickerIconBg, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="text-outline" size={24} color="#2E7D32" />
              </View>
              <Text style={styles.pickerOptionText}>{t('feed.textStory')}</Text>
            </Pressable>

            <Pressable
              style={styles.pickerCancelBtn}
              onPress={() => setIsStoryTypePickerVisible(false)}
            >
              <Text style={styles.pickerCancelText}>{t('feed.cancel')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* STORY CREATOR MODAL */}
      <StoryCreator
        visible={isStoryCreatorVisible}
        mediaUri={selectedStoryMedia}
        mediaType={selectedStoryMediaType}
        sharedPost={selectedSharedPost}
        onCancel={() => {
          setIsStoryCreatorVisible(false);
          setSelectedSharedPost(null);
        }}
        onShare={handleShareStory}
        sharing={isStorySharing}
      />

      {/* STORY PLAYBACK VIEWER */}
      {activeStories.length > 0 && (
        <StoryViewer
          visible={isStoryViewerVisible}
          storyGroups={activeStories}
          initialGroupIndex={activeStoryGroupIndex}
          onClose={() => setIsStoryViewerVisible(false)}
          onStoryDeleted={() => {
            setIsStoryViewerVisible(false);
            fetchActiveStories();
          }}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = createResponsiveStyleSheet({
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
  pickerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  pickerHeaderBar: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerHeaderIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  pickerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  pickerOptionText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.medium,
    color: COLORS.primary,
  },
  pickerCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  pickerCancelText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#4B5563',
  },
});