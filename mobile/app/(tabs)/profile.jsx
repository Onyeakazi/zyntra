import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
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
import { useState, useCallback, useEffect } from "react";
import Feed from "../../components/Feed";
import DetailsCard from "../../components/DetailsCard";
import Button from "../../components/Button";
import { auth } from "../../config/firebase";
import { signOut } from "firebase/auth";
import { supabase } from "../../lib/supabase";
import { acceptConnectionInDB } from "../../utils/connectionHelpers";

const Profile = () => {
  const { userId } = useLocalSearchParams();
  const currentUserId = auth.currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUserId;

  const [active, setActive] = useState("Posts");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feeds, setFeeds] = useState([]);
  const [error, setError] = useState("");
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null, 'pending', 'accepted'
  const [connectionInitiator, setConnectionInitiator] = useState(null); // who sent the request
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

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
        time: new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: post.media_url ? { uri: post.media_url } : null,
        repost_id: post.repost_id,
        original_post: post.original_post ? {
          id: post.original_post.id,
          author_id: post.original_post.user_id,
          content: post.original_post.content,
          image: post.original_post.media_url ? { uri: post.original_post.media_url } : null,
          media_type: post.original_post.media_type,
          created_at: post.original_post.created_at,
          time: new Date(post.original_post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  // FIXED:
  // Better loading condition
  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenWrapper>
    );
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
        renderItem={({ item }) =>
          active === "Posts" ? (
            <View style={{ paddingHorizontal: 15 }}>
              <Feed item={item} />
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
        ListHeaderComponent={
          userData ? (
            <>
              {/* HEADER */}
              <View style={styles.header}>
                <View style={styles.banner}>
                  <Image
                    source={
                      userData?.banner_url &&
                      userData.banner_url.trim() !== ""
                        ? { uri: userData.banner_url }
                        : require("../../assets/images/image placeholder.jpeg")
                    }
                    style={styles.bannerImg}
                  />
                </View>

                <View style={styles.profileImageContainer}>
                  <Image
                    source={
                      userData?.avatar_url &&
                      userData.avatar_url.trim() !== ""
                        ? { uri: userData.avatar_url }
                        : require("../../assets/images/default.png")
                    }
                    style={styles.profImg}
                  />
                </View>
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
                      onPress={handleLogout}
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
                      {userData?.posts_count || 0}
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
    </ScreenWrapper>
  );
};

export default Profile;

const styles = StyleSheet.create({
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
    gap: scale(15),
    marginTop: verticalScale(20),
  },

  editBtn: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(80),
  },

  settingIcon: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    paddingVertical: verticalScale(9),
    paddingHorizontal: scale(16),
  },

  settingText: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(14),
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
    height: verticalScale(220),
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
    height: verticalScale(100),
    borderRadius: scale(50),
    borderWidth: 4,
    borderColor: "#fff",
  },
});