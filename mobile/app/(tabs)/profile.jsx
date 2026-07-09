import {
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import createResponsiveStyleSheet from "../../utils/responsiveStyleSheet";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenWrapper from "../../components/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { scale, verticalScale } from "../../utils/scale";
import TYPOGRAPHY from "../../constants/typography";
import About from "../../assets/vectors/about.svg";
import Work from "../../assets/vectors/work.svg";
import Gear from "../../assets/vectors/gear.svg";
import Email from "../../assets/vectors/email.svg";
import Address from "../../assets/vectors/address.svg";
import Education from "../../assets/vectors/education.svg";
import Phone from "../../assets/vectors/phone.svg";
import COLORS from "../../constants/colors";
import { useState, useCallback, useEffect, useRef } from "react";
import Feed from "../../components/Feed";
import DetailsCard from "../../components/DetailsCard";
import Button from "../../components/Button";
import Preloader from "../../components/Preloader";
import { auth } from "../../config/firebase";
import { signOut } from "firebase/auth";
import { supabase } from "../../lib/supabase";
import { acceptConnectionInDB } from "../../utils/connectionHelpers";
import { formatPostTime } from "../../utils/timeFormat";

const Profile = () => {
  const { userId } = useLocalSearchParams();
  const currentUserId = auth.currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUserId;
  const screenWidth = Dimensions.get("window").width;

  const [active, setActive] = useState("Posts");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feeds, setFeeds] = useState([]);
  const [error, setError] = useState("");
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null, 'pending', 'accepted'
  const [connectionInitiator, setConnectionInitiator] = useState(null); // who sent the request
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeViewPost, setActiveViewPost] = useState(null);

  // Viewability configurations for pausing scroll-past videos
  const [activeViewablePostId, setActiveViewablePostId] = useState(null);

  // Settings menu and album history states
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [currentMenuView, setCurrentMenuView] = useState("menu"); // "menu", "folders", "grid"
  const [selectedFolder, setSelectedFolder] = useState("avatar"); // "avatar", "banner"
  const [historyPhotos, setHistoryPhotos] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState(null);
  const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
  const [photoHistoryList, setPhotoHistoryList] = useState([]);
  const [photoHistoryIndex, setPhotoHistoryIndex] = useState(0);

  const filteredPhotos = historyPhotos.filter(p =>
    selectedFolder === "avatar"
      ? p.content === "updated their profile picture"
      : selectedFolder === "banner"
        ? p.content === "updated their cover photo"
        : p.content !== "updated their profile picture" && p.content !== "updated their cover photo"
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveViewablePostId(viewableItems[0].item.id);
    }
  }).current;

  // Fetch connection status if not own profile
  const fetchConnectionStatus = async () => {
    if (isOwnProfile || !currentUserId || !userId) return;
    try {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      if (!error && data) {
        setConnectionStatus(data.status);
        setConnectionInitiator(data.user_id);
      } else {
        setConnectionStatus(null);
        setConnectionInitiator(null);
      }
    } catch (err) {
      console.error("Error fetching connection status:", err);
    }
  };

  const handleToggleConnection = async () => {
    if (isOwnProfile || !currentUserId || !userId) return;
    try {
      if (connectionStatus === "accepted") {
        const { error } = await supabase
          .from("connections")
          .delete()
          .or(`and(user_id.eq.${currentUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUserId})`);
        if (!error) {
          setConnectionStatus(null);
          setConnectionInitiator(null);
          setFollowersCount(prev => Math.max(0, prev - 1));
          setFollowingCount(prev => Math.max(0, prev - 1));
        }
      } else if (connectionStatus === "pending") {
        if (connectionInitiator === currentUserId) {
          // Cancel sent request
          const { error } = await supabase
            .from("connections")
            .delete()
            .eq("user_id", currentUserId)
            .eq("friend_id", userId);
          if (!error) {
            setConnectionStatus(null);
            setConnectionInitiator(null);
          }
        } else {
          // Accept incoming request
          try {
            await acceptConnectionInDB(userId, currentUserId);
            setConnectionStatus("accepted");
            setFollowersCount(prev => prev + 1);
            setFollowingCount(prev => prev + 1);
          } catch (err) {
            console.error("Error accepting request in profile:", err);
          }
        }
      } else {
        // Send a pending connection request
        const { error } = await supabase
          .from("connections")
          .insert({
            user_id: currentUserId,
            friend_id: userId,
            status: "pending",
          });
        if (!error) {
          setConnectionStatus("pending");
          setConnectionInitiator(currentUserId);
        }
      }
    } catch (err) {
      console.error("Error toggling connection:", err);
    }
  };

  const handleViewPhoto = async (imageUrl, isAvatar) => {
    if (!imageUrl || imageUrl.trim() === "") return;
    
    setLoading(true);
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      const contentText = isAvatar ? "updated their profile picture" : "updated their cover photo";
      
      // Fetch all posts matching the content type to enable swiping
      const { data: posts, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("content", contentText)
        .order("created_at", { ascending: false });
        
      if (fetchError) throw fetchError;

      if (posts && posts.length > 0) {
        // Map user object into all posts for Feed viewer compatibility
        const formattedPosts = posts.map(post => ({
          ...post,
          author_id: post.user_id,
          user: {
            name: userData?.full_name || "User",
            username: userData?.username || "username",
            profilePic: userData?.avatar_url && userData.avatar_url.trim() !== ""
              ? { uri: userData.avatar_url }
              : require("../../assets/images/default.png"),
          },
          image: post.media_url ? { uri: post.media_url } : null,
          time: formatPostTime(post.created_at)
        }));

        // Find the index of the clicked image
        let initialIndex = formattedPosts.findIndex(p => p.media_url === imageUrl);
        if (initialIndex === -1) {
          // Fallback in case current avatar/banner url is not in the posts history yet
          const fallbackPost = {
            id: 'temp-' + Date.now(),
            user_id: targetUserId,
            author_id: targetUserId,
            content: contentText,
            media_url: imageUrl,
            media_type: 'image',
            created_at: new Date().toISOString(),
            user: {
              name: userData?.full_name || "User",
              username: userData?.username || "username",
              profilePic: userData?.avatar_url && userData.avatar_url.trim() !== ""
                ? { uri: userData.avatar_url }
                : require("../../assets/images/default.png"),
            },
            image: { uri: imageUrl },
            time: formatPostTime(new Date().toISOString())
          };
          formattedPosts.unshift(fallbackPost);
          initialIndex = 0;
        }

        setPhotoHistoryList(formattedPosts);
        setPhotoHistoryIndex(initialIndex);
        setActiveViewPost(formattedPosts[initialIndex]);
      } else {
        // Fallback if no posts exist at all
        const fallbackPost = {
          id: 'temp-' + Date.now(),
          user_id: targetUserId,
          author_id: targetUserId,
          content: contentText,
          media_url: imageUrl,
          media_type: 'image',
          created_at: new Date().toISOString(),
          user: {
            name: userData?.full_name || "User",
            username: userData?.username || "username",
            profilePic: userData?.avatar_url && userData.avatar_url.trim() !== ""
              ? { uri: userData.avatar_url }
              : require("../../assets/images/default.png"),
          },
          image: { uri: imageUrl },
          time: formatPostTime(new Date().toISOString())
        };
        const list = [fallbackPost];
        setPhotoHistoryList(list);
        setPhotoHistoryIndex(0);
        setActiveViewPost(fallbackPost);
      }
    } catch (err) {
      console.error("Error viewing photo post:", err);
    } finally {
      setLoading(false);
    }
  };

  // Check auth on mount or parameter changes
  useEffect(() => {
    const user = auth.currentUser;

    setIsAuthChecked(true);

    if (user) {
      fetchUserData();
      fetchConnectionStatus();
    } else {
      setLoading(false);
    }
  }, [userId]);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;

      if (user) {
        fetchUserData();
        fetchConnectionStatus();
      }
    }, [userId])
  );

  useEffect(() => {
    const targetUserId = userId || auth.currentUser?.uid;
    if (!targetUserId) return;

    console.log("[Profile Debug] Registering real-time listener for targetUser:", targetUserId);
    const uniqueChannelName = `profile-realtime-connections-${targetUserId}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections'
        },
        (payload) => {
          console.log("[Profile Debug] Connection change detected in profile:", payload.eventType);
          const record = payload.new || payload.old;
          if (payload.eventType === 'DELETE' || (record && (record.friend_id === targetUserId || record.user_id === targetUserId))) {
            fetchUserData();
            fetchConnectionStatus();
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[Profile Debug] Unsubscribing real-time listener for profile.");
      supabase.removeChannel(channel);
    };
  }, [userId]);


  // FIXED:
  // Fetch posts ONLY after userData is available
  useEffect(() => {
    if (userData) {
      fetchUserPosts();
    }
  }, [userData]);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      console.log("Fetching user profile for:", userId || user.uid);

      const targetUserId = userId || user.uid;

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setUserData(data);

      // Fetch dynamic stats from connections table symmetrically
      const { count: connCount, error: connError } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);

      if (!connError) {
        setFollowersCount(connCount || 0);
        setFollowingCount(connCount || 0);
      }

      console.log("User data and connections fetched");
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const user = auth.currentUser;

      if (!user) return;

      console.log("Fetching posts for:", userId || user.uid);

      const targetUserId = userId || user.uid;

      const { data, error: fetchError } = await supabase
        .from("posts")
        .select(`
          *,
          original_post:repost_id (
            *,
            user:user_id (
              id,
              full_name,
              avatar_url,
              username
            )
          )
        `)
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      console.log("Posts fetched");

      // Map dynamic columns
      const formattedFeeds = (data || []).map((post) => ({
        id: post.id.toString(),
        author_id: post.user_id,
        user: {
          name: userData?.full_name || "User",
          username: userData?.username || "username",
          profilePic:
            userData?.avatar_url &&
            userData.avatar_url.trim() !== ""
              ? { uri: userData.avatar_url }
              : require("../../assets/images/default.png"),
        },
        content: post.content,
        time: formatPostTime(post.created_at),
        image: post.media_url ? { uri: post.media_url } : null,
        media_type: post.media_type,
        repost_id: post.repost_id,
        original_post: post.original_post ? {
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
          }
        } : null,
        likes: "0",
        comments: "0",
      }));

      setFeeds(formattedFeeds);
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchUserData();
      await fetchConnectionStatus();
      if (userData) {
        await fetchUserPosts();
      }
    } catch (err) {
      console.error("Error refreshing profile data:", err);
    } finally {
      setRefreshing(false);
    }
  }, [userId, userData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setUserData(null);
      setFeeds([]);
      setError("You have been logged out");

      router.replace("/(auth)/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const fetchPhotoHistory = async () => {
    setHistoryLoading(true);
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return;

      const { data, error } = await supabase
        .from("posts")
        .select("id, media_url, media_type, content, created_at")
        .eq("user_id", targetUserId)
        .eq("media_type", "image")
        .not("media_url", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistoryPhotos(data || []);
    } catch (err) {
      console.error("Error fetching photo history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectPastPhoto = async (pastPhotoUrl, isAvatar) => {
    try {
      const targetUserId = auth.currentUser?.uid;
      if (!targetUserId) return;

      setLoading(true);

      const column = isAvatar ? "avatar_url" : "banner_url";
      const { error: updateError } = await supabase
        .from("users")
        .update({ [column]: pastPhotoUrl })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      const contentText = isAvatar ? "updated their profile picture" : "updated their cover photo";
      const { error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: targetUserId,
          content: contentText,
          media_url: pastPhotoUrl,
          media_type: "image"
        });

      if (postError) throw postError;

      Alert.alert("Success", `Your ${isAvatar ? "profile picture" : "cover photo"} has been updated successfully.`);
      setSelectedPreviewPhoto(null);
      setCurrentMenuView("menu");
      setIsMenuVisible(false);
      fetchUserData();
    } catch (err) {
      console.error("Error setting past photo:", err);
      Alert.alert("Error", "Failed to update photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = (photo) => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo from your history? This will delete the corresponding feed post and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const targetUserId = auth.currentUser?.uid;
              if (!targetUserId) return;

              const updates = {};
              if (userData?.avatar_url === photo.media_url) {
                updates.avatar_url = "";
              }
              if (userData?.banner_url === photo.media_url) {
                updates.banner_url = "";
              }

              if (Object.keys(updates).length > 0) {
                const { error: userUpdateError } = await supabase
                  .from("users")
                  .update(updates)
                  .eq("id", targetUserId);
                if (userUpdateError) throw userUpdateError;
              }

              const { error: deleteError } = await supabase
                .from("posts")
                .delete()
                .eq("id", photo.id);

              if (deleteError) throw deleteError;

              Alert.alert("Success", "Photo deleted successfully.");
              setSelectedPreviewPhoto(null);
              fetchPhotoHistory();
              fetchUserData();
            } catch (err) {
              console.error("Error deleting photo:", err);
              Alert.alert("Error", "Failed to delete photo. Please try again.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };



  const details = [
    {
      id: "1",
      icon: <Email width={scale(25.94)} height={scale(25.94)} />,
      title: "Email",
      description: userData?.email || "No email added yet",
    },
    {
      id: "2",
      icon: <About width={scale(25.94)} height={scale(25.94)} />,
      title: "About",
      description: userData?.bio || "No bio added yet",
    },
     {
      id: "3",
      icon: <Phone width={scale(25.94)} height={scale(25.94)} />,
      title: "Phone",
      description: userData?.phone || "No phone added yet",
    },
    {
      id: "4",
      icon: <Work width={scale(25.94)} height={scale(25.94)} />,
      title: "Work",
      description: "Software Engineer",
    },
     {
      id: "5",
      icon: <Education width={scale(25.94)} height={scale(25.94)} />,
      title: "Education",
      description: userData?.education || "No education added yet",
    },
  ];

  const dataToRender = active === "Posts" ? feeds : details;

  if (loading) {
    return <Preloader text="Loading profile..." />;
  }

  // Show error if not logged in
  if (!userData && isAuthChecked && !auth.currentUser) {
    return (
      <ScreenWrapper>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Not Logged In</Text>

          <Text style={styles.errorSubText}>
            Please login to view your profile
          </Text>

          <Button
            text="Go to Login"
            action={() => router.push("/(auth)/login")}
            bgColor={COLORS.primary}
            textColor="#fff"
            style={{ marginTop: 20 }}
          />
        </View>
      </ScreenWrapper>
    );
  }

  // Show error if failed to load profile
  if (!userData && isAuthChecked && auth.currentUser) {
    return (
      <ScreenWrapper>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}> Failed to load profile</Text>

          <Text style={styles.errorSubText}>{error}</Text>

          <Button
            text="Logout"
            action={handleLogout}
            bgColor={COLORS.primary}
            textColor="#fff"
            style={{ marginTop: 20 }}
          />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    
    <ScreenWrapper>
      <StatusBar style="dark" />

      <FlatList
        data={dataToRender}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) =>
          active === "Posts" ? (
            <View style={{ paddingHorizontal: 15 }}>
              <Feed 
                item={item} 
                activePostId={activeViewablePostId} 
              />
            </View>
          ) : (
            <View style={{ paddingHorizontal: 15 }}>
              <DetailsCard
                icon={item.icon}
                title={item.title}
                description={item.description}
              />
            </View>
          )
        }
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListHeaderComponent={
          userData ? (
            <>
              {/* HEADER */}
              <View style={styles.header}>
                <Pressable
                  style={styles.banner}
                  onPress={() => handleViewPhoto(userData?.banner_url, false)}
                >
                  <Image
                    source={
                      userData?.banner_url &&
                      userData.banner_url.trim() !== ""
                        ? { uri: userData.banner_url }
                        : require("../../assets/images/image placeholder.jpeg")
                    }
                    style={styles.bannerImg}
                  />
                </Pressable>

                <Pressable
                  style={styles.profileImageContainer}
                  onPress={() => handleViewPhoto(userData?.avatar_url, true)}
                >
                  <Image
                    source={
                      userData?.avatar_url &&
                      userData.avatar_url.trim() !== ""
                        ? { uri: userData.avatar_url }
                        : require("../../assets/images/default.png")
                    }
                    style={styles.profImg}
                  />
                </Pressable>
              </View>

              {/* DETAILS */}
              <View style={styles.details}>
                <Text style={styles.name}>{userData?.full_name}</Text>

                <Text style={styles.username}>
                  @{userData?.username}
                </Text>

                <Text style={styles.bio}>
                  {userData?.bio || "No bio"}
                </Text>
              </View>

              {/* SETTINGS / SOCIAL ACTIONS */}
              <View style={styles.settings}>
                {isOwnProfile ? (
                  <>
                    <Pressable
                      style={styles.editBtn}
                      onPress={() => router.push("/editprofile")}
                    >
                      <Text style={styles.settingText}>EDIT PROFILE</Text>
                    </Pressable>

                    <Pressable
                      style={styles.settingIcon}
                      onPress={() => {
                        setCurrentMenuView("menu");
                        setIsMenuVisible(true);
                      }}
                    >
                      <Gear width={scale(25.94)} height={scale(25.94)} />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={[
                        styles.editBtn,
                        {
                          backgroundColor: connectionStatus === "accepted" 
                            ? "#F3F4F6" 
                            : connectionStatus === "pending" && connectionInitiator === currentUserId 
                              ? "#F3F4F6" 
                              : COLORS.accent,
                          borderColor: connectionStatus === "accepted" || (connectionStatus === "pending" && connectionInitiator === currentUserId)
                            ? "#E5E7EB" 
                            : COLORS.accent,
                          paddingHorizontal: scale(24),
                          minWidth: scale(110),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }
                      ]}
                      onPress={handleToggleConnection}
                    >
                      <Text
                        style={[
                          styles.settingText,
                          { 
                            color: connectionStatus === "accepted" 
                              ? "#4B5563" 
                              : connectionStatus === "pending" && connectionInitiator === currentUserId 
                                ? "#888888" 
                                : "#FFFFFF" 
                          }
                        ]}
                      >
                        {connectionStatus === "accepted" 
                          ? "CONNECTED" 
                          : connectionStatus === "pending" 
                            ? connectionInitiator === currentUserId 
                              ? "REQUESTED" 
                              : "ACCEPT REQUEST" 
                            : "CONNECT"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.editBtn,
                        {
                          backgroundColor: "#F3F4F6",
                          borderColor: "#E5E7EB",
                          paddingHorizontal: scale(24),
                          minWidth: scale(110),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }
                      ]}
                      onPress={() => router.push({
                        pathname: "/chat",
                        params: { recipientId: userId }
                      })}
                    >
                      <Text style={[styles.settingText, { color: "#4B5563" }]}>
                        MESSAGE
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>

              {/* STATS */}
              <View style={{ paddingHorizontal: 15 }}>
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>
                      {feeds.length}
                    </Text>

                    <Text style={styles.statText}>Post</Text>
                  </View>

                  <View style={styles.lines} />

                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>
                      {feeds.filter(post => post.image && post.media_type !== 'video').length}
                    </Text>

                    <Text style={styles.statText}>Photos</Text>
                  </View>

                  <View style={styles.lines} />

                   <Pressable 
                     style={styles.stat}
                     onPress={() => router.push({
                       pathname: "/connectionsList",
                       params: { userId: userId || currentUserId, initialTab: "Followers" }
                     })}
                   >
                     <Text style={styles.statNumber}>
                       {followersCount}
                     </Text>

                     <Text style={styles.statText}>Followers</Text>
                   </Pressable>

                  <View style={styles.lines} />

                  <Pressable 
                    style={styles.stat}
                    onPress={() => router.push({
                      pathname: "/connectionsList",
                      params: { userId: userId || currentUserId, initialTab: "Following" }
                    })}
                  >
                    <Text style={styles.statNumber}>
                      {followingCount}
                    </Text>

                    <Text style={styles.statText}>Following</Text>
                  </Pressable>
                </View>
              </View>

              {/* TABS */}
              <View style={styles.profileBtns}>
                <Pressable
                  style={styles.tabBtn}
                  onPress={() => setActive("Posts")}
                >
                  <Text
                    style={[
                      styles.btn,
                      active === "Posts" && styles.btnActive,
                    ]}
                  >
                    Posts
                  </Text>

                  {active === "Posts" && (
                    <View style={styles.activeIndicator} />
                  )}
                </Pressable>

                <Pressable
                  style={styles.tabBtn}
                  onPress={() => setActive("Details")}
                >
                  <Text
                    style={[
                      styles.btn,
                      active === "Details" && styles.btnActive,
                    ]}
                  >
                    Details
                  </Text>

                  {active === "Details" && (
                    <View style={styles.activeIndicator} />
                  )}
                </Pressable>
              </View>
            </>
          ) : null
        }
      />

      {activeViewPost && (
        <Feed
          item={activeViewPost}
          postItems={photoHistoryList}
          initialPhotoViewerIndex={photoHistoryIndex}
          initialPhotoViewerVisible={true}
          onClosePhotoViewer={() => {
            setActiveViewPost(null);
            setPhotoHistoryList([]);
            setPhotoHistoryIndex(0);
          }}
          onProfileImageUpdated={fetchUserData}
        />
      )}

      {/* 1. Profile Settings Drawer Modal */}
      <Modal
        visible={isMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <SafeAreaView style={styles.menuDrawerOverlay}>
          <View style={styles.menuDrawerContainer}>
            {/* Header */}
            <View style={styles.menuDrawerHeader}>
              <TouchableOpacity onPress={() => {
                if (currentMenuView === "grid") {
                  setCurrentMenuView("folders");
                } else if (currentMenuView === "folders") {
                  setCurrentMenuView("menu");
                } else {
                  setIsMenuVisible(false);
                }
              }} style={styles.menuCloseBtn}>
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.menuHeaderTitle}>
                {currentMenuView === "menu" ? "Profile Menu" : currentMenuView === "folders" ? "Photos/Videos" : selectedFolder === "avatar" ? "Profile Pictures" : "Cover Photos"}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* User display card */}
            {currentMenuView === "menu" && (
              <View style={styles.menuUserCard}>
                <Image
                  source={
                    userData?.avatar_url && userData.avatar_url.trim() !== ""
                      ? { uri: userData.avatar_url }
                      : require("../../assets/images/default.png")
                  }
                  style={styles.menuUserAvatar}
                />
                <Text style={styles.menuUserFullName}>{userData?.full_name}</Text>
                <Text style={styles.menuUserUsername}>@{userData?.username}</Text>
                <View style={styles.menuDivider} />
              </View>
            )}

            {/* Menu view dispatcher */}
            {(() => {
              if (currentMenuView === "menu") {
                const menuItems = [
                  { label: "Edit Profile", icon: "create-outline", action: () => { setIsMenuVisible(false); router.push("/editprofile"); } },
                  { label: "Network", icon: "people-outline", action: () => { setIsMenuVisible(false); router.push("/connectionsList"); } },
                  { label: "Photos/Videos", icon: "images-outline", action: () => { fetchPhotoHistory(); setCurrentMenuView("folders"); } },
                  { label: "Group", icon: "chatbubbles-outline", action: () => Alert.alert("Groups", "Groups feature coming soon.") },
                  { label: "Your Privacy", icon: "lock-closed-outline", action: () => Alert.alert("Privacy", "Privacy options coming soon.") },
                  { label: "Search Profile", icon: "search-outline", action: () => Alert.alert("Search Profile", "Profile searching is available on the Home tab.") },
                  { label: "Settings", icon: "settings-outline", action: () => Alert.alert("Settings", "General settings coming soon.") },
                  { label: "About Us", icon: "information-circle-outline", action: () => Alert.alert("About Us", "Zyntra is a premium professional networking platform.") },
                  { label: "Language", icon: "globe-outline", action: () => Alert.alert("Language", "English is currently the active language.") },
                  { label: "Log Out", icon: "log-out-outline", action: () => { setIsMenuVisible(false); handleLogout(); }, isRed: true },
                ];

                return (
                  <ScrollView style={styles.menuItemsList} showsVerticalScrollIndicator={false}>
                    {menuItems.map((menuItem, idx) => (
                      <TouchableOpacity key={idx} style={styles.menuItemRow} onPress={menuItem.action}>
                        <View style={styles.menuItemLeft}>
                          <Ionicons name={menuItem.icon} size={20} color={menuItem.isRed ? "red" : "#5096F1"} />
                          <Text style={[styles.menuItemLabel, menuItem.isRed && { color: "red" }]}>{menuItem.label}</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                );
              }

              if (currentMenuView === "folders") {
                const avatarCount = historyPhotos.filter(p => p.content === "updated their profile picture").length;
                const bannerCount = historyPhotos.filter(p => p.content === "updated their cover photo").length;
                const timelineCount = historyPhotos.filter(p => p.content !== "updated their profile picture" && p.content !== "updated their cover photo").length;

                return (
                  <View style={styles.foldersContainer}>
                    <TouchableOpacity
                      style={styles.folderCard}
                      onPress={() => {
                        setSelectedFolder("avatar");
                        setCurrentMenuView("grid");
                      }}
                    >
                      <View style={styles.folderIconBg}>
                        <Ionicons name="folder" size={48} color="#4285F4" />
                      </View>
                      <Text style={styles.folderTitle}>Profile Pictures</Text>
                      <Text style={styles.folderCount}>{avatarCount} items</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.folderCard}
                      onPress={() => {
                        setSelectedFolder("banner");
                        setCurrentMenuView("grid");
                      }}
                    >
                      <View style={styles.folderIconBg}>
                        <Ionicons name="folder" size={48} color="#34A853" />
                      </View>
                      <Text style={styles.folderTitle}>Cover Photos</Text>
                      <Text style={styles.folderCount}>{bannerCount} items</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.folderCard}
                      onPress={() => {
                        setSelectedFolder("timeline");
                        setCurrentMenuView("grid");
                      }}
                    >
                      <View style={styles.folderIconBg}>
                        <Ionicons name="folder" size={48} color="#FBBC05" />
                      </View>
                      <Text style={styles.folderTitle}>Timeline Photos</Text>
                      <Text style={styles.folderCount}>{timelineCount} items</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              if (currentMenuView === "grid") {
                if (filteredPhotos.length === 0) {
                  return (
                    <View style={styles.emptyGridContainer}>
                      <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.emptyGridText}>No past photos found in this folder.</Text>
                    </View>
                  );
                }

                return (
                  <ScrollView style={{ flex: 1 }}>
                    <View style={styles.photosGrid}>
                      {filteredPhotos.map((photo, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.gridImageWrapper}
                          onPress={() => setSelectedPreviewPhoto(photo)}
                        >
                          <Image source={{ uri: photo.media_url }} style={styles.gridImage} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                );
              }
              return null;
            })()}
          </View>
        </SafeAreaView>
      </Modal>

      {/* 2. Fullscreen Preview and Options Modal */}
      <Modal
        visible={selectedPreviewPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsOptionsMenuVisible(false);
          setSelectedPreviewPhoto(null);
        }}
      >
        <Pressable 
          style={styles.previewModalOverlay}
          onPress={() => setIsOptionsMenuVisible(false)}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.previewModalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setIsOptionsMenuVisible(false);
                  setSelectedPreviewPhoto(null);
                }} 
                style={styles.previewCloseBtn}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.previewTitle}>Photo Preview</Text>
              {selectedPreviewPhoto && isOwnProfile ? (
                <TouchableOpacity
                  onPress={() => setIsOptionsMenuVisible(!isOptionsMenuVisible)}
                  style={styles.previewCloseBtn}
                >
                  <Ionicons name="ellipsis-horizontal" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 28 }} />
              )}
            </View>

            <View style={styles.previewImageContainer}>
              {selectedPreviewPhoto && (
                <FlatList
                  data={filteredPhotos}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id.toString()}
                  initialScrollIndex={filteredPhotos.findIndex(p => p.id === selectedPreviewPhoto.id)}
                  getItemLayout={(data, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                  })}
                  onMomentumScrollEnd={(e) => {
                    const offset = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(offset / screenWidth);
                    if (idx >= 0 && idx < filteredPhotos.length) {
                      setSelectedPreviewPhoto(filteredPhotos[idx]);
                    }
                  }}
                  renderItem={({ item }) => (
                    <View style={{ width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                      <Image source={{ uri: item.media_url }} style={styles.previewImage} resizeMode="contain" />
                    </View>
                  )}
                />
              )}
            </View>

            {/* Custom Dropdown Option Overlay */}
            {isOptionsMenuVisible && selectedPreviewPhoto && (
              <>
                <Pressable
                  style={StyleSheet.absoluteFillObject}
                  onPress={() => setIsOptionsMenuVisible(false)}
                />
                <View style={styles.dropdownCard}>
                  {selectedFolder === "avatar" && (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setIsOptionsMenuVisible(false);
                        handleSelectPastPhoto(selectedPreviewPhoto.media_url, true);
                      }}
                    >
                      <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.dropdownItemText}>Set as Profile Picture</Text>
                    </TouchableOpacity>
                  )}

                  {selectedFolder === "banner" && (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setIsOptionsMenuVisible(false);
                        handleSelectPastPhoto(selectedPreviewPhoto.media_url, false);
                      }}
                    >
                      <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.dropdownItemText}>Set as Cover Photo</Text>
                    </TouchableOpacity>
                  )}

                  {isOwnProfile && (
                    <TouchableOpacity
                      style={[styles.dropdownItem, styles.dropdownItemDestructive]}
                      onPress={() => {
                        setIsOptionsMenuVisible(false);
                        handleDeletePhoto(selectedPreviewPhoto);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={[styles.dropdownItemText, { color: '#EF4444' }]}>Delete Photo</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.dropdownDivider} />

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => setIsOptionsMenuVisible(false)}
                  >
                    <Ionicons name="close-outline" size={18} color="#9CA3AF" />
                    <Text style={[styles.dropdownItemText, { color: '#9CA3AF' }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </SafeAreaView>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
};

export default Profile;

const styles = createResponsiveStyleSheet({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(14),
    color: COLORS.primary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  errorText: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(16),
    color: "red",
    marginBottom: 10,
  },

  errorSubText: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(12),
    color: "#999",
    textAlign: "center",
  },

  tabBtn: {
    alignItems: "center",
    paddingBottom: verticalScale(10),
  },

  profileBtns: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(100),
    marginTop: verticalScale(20),
  },

  activeIndicator: {
    height: verticalScale(3),
    backgroundColor: COLORS.primary,
    marginTop: verticalScale(6),
    borderRadius: 10,
    width: scale(120),
  },

  btn: {
    fontFamily: TYPOGRAPHY.medium,
    fontSize: scale(16),
    color: "#808080cc",
  },

  btnActive: {
    color: COLORS.primary,
  },

  stats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    paddingVertical: verticalScale(10),
    gap: scale(20),
    marginVertical: scale(20),
  },

  stat: {
    justifyContent: "center",
    alignItems: "center",
  },

  statNumber: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(18),
    color: "#606073",
  },

  statText: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(12),
    color: "#000000",
  },

  lines: {
    width: scale(2),
    height: verticalScale(23),
    backgroundColor: COLORS.gray,
  },

  settings: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
    marginTop: 20,
    paddingHorizontal: 15,
  },

  editBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingIcon: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingText: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: 14,
    color: "#606073",
  },

  details: {
    justifyContent: "center",
    alignItems: "center",
  },

  name: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(28),
  },

  bio: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(14),
    marginTop: 5,
  },

  username: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(14),
    color: "#888",
  },

  header: {
    position: "relative",
    marginBottom: verticalScale(60),
  },

  banner: {
    width: "100%",
    height: verticalScale(160),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },

  bannerImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  profileImageContainer: {
    position: "absolute",
    bottom: -scale(50),
    left: "50%",
    transform: [{ translateX: -scale(50) }],
    zIndex: 10,
  },

  profImg: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    borderWidth: 4,
    borderColor: "#fff",
    resizeMode: "cover",
  },
  menuDrawerOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  menuDrawerContainer: {
    flex: 1,
  },
  menuDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuCloseBtn: {
    padding: 4,
  },
  menuHeaderTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#1F2937',
  },
  menuUserCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  menuUserAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  menuUserFullName: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.bold,
    color: '#111111',
  },
  menuUserUsername: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  menuDivider: {
    width: '90%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 20,
  },
  menuItemsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.medium,
    color: '#1F2937',
  },
  foldersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingHorizontal: 16,
    gap: 16,
  },
  folderCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  folderIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  folderTitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
  },
  emptyGridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyGridText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.regular,
    color: '#9CA3AF',
    marginTop: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
  },
  gridImageWrapper: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 4,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  previewCloseBtn: {
    padding: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#FFFFFF',
  },
  previewImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  dropdownCard: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    zIndex: 2000,
    padding: 6,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownItemDestructive: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#374151',
    marginTop: 4,
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.medium,
    color: '#FFFFFF',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 4,
  },
});