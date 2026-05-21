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
import { router } from "expo-router";
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

const Profile = () => {
  const [active, setActive] = useState("Posts");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feeds, setFeeds] = useState([]);
  const [error, setError] = useState("");
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const user = auth.currentUser;

    setIsAuthChecked(true);

    if (user) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;

      if (user) {
        fetchUserData();
      }
    }, [])
  );

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

      console.log("Fetching user profile...");

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.uid)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setUserData(data);

      console.log("User data fetched");
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

      console.log("Fetching posts...");

      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.uid)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      console.log("Posts fetched");

      // FIXED:
      // Added safe fallback for undefined data
      const formattedFeeds = (data || []).map((post) => ({
        id: post.id.toString(),
        user: {
          name: userData?.full_name || "User",
          profilePic:
            userData?.avatar_url &&
            userData.avatar_url.trim() !== ""
              ? { uri: userData.avatar_url }
              : require("../../assets/images/prof.jpeg"),
          },
          content: post.content,
          time: new Date(post.created_at).toLocaleTimeString(),
          image: post.image_url ? { uri: post.image_url } : null,
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
            <Feed item={item} />
          ) : (
            <DetailsCard
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
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
      : require("../../assets/images/WhatsApp Image 2026-03-16 at 8.33.31 AM.jpeg")
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
      : require("../../assets/images/prof.jpeg")
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

              {/* SETTINGS */}
              <View style={styles.settings}>
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

                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>
                      {userData?.followers_count || 0}
                    </Text>

                    <Text style={styles.statText}>Followers</Text>
                  </View>

                  <View style={styles.lines} />

                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>
                      {userData?.following_count || 0}
                    </Text>

                    <Text style={styles.statText}>Following</Text>
                  </View>
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