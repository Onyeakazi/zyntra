import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import ScreenWrapper from "../components/ScreenWrapper";
import FloatingInput from "../components/Input";
import Button from "../components/Button";
import TYPOGRAPHY from "../constants/typography";
import COLORS from "../constants/colors";
import { scale, verticalScale } from "../utils/scale";
import Camera from "../assets/vectors/Camera.svg";
import Back from "../assets/vectors/back.svg";
import { useState, useEffect } from "react";
import { auth } from "../config/firebase";
import { supabase } from "../lib/supabase";
import * as ImagePicker from "expo-image-picker";

const EditProfile = () => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [work, setWork] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [education, setEducation] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [banner, setBanner] = useState(null);
  const [initialAvatar, setInitialAvatar] = useState(null);
  const [initialBanner, setInitialBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.uid)
        .single();

      if (fetchError) throw fetchError;

      // Populate form with user data
      setFullName(data?.full_name || "");
      setUsername(data?.username || "");
      setEmail(data?.email || "");
      setBio(data?.bio || "");
      setWork(data?.work || "");
      setAddress(data?.address || "");
      setPhone(data?.phone || "");
      setEducation(data?.education || "");
      setAvatar(data?.avatar_url || null);
      setBanner(data?.banner_url || null);
      setInitialAvatar(data?.avatar_url || null);
      setInitialBanner(data?.banner_url || null);

      console.log("User data loaded");
    } catch (err) {
      console.error("Error fetching user:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setAvatar(result.assets[0].uri);
      }
    } catch (err) {
      setError("Failed to pick image");
    }
  };

    const pickBannerImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
            });

            if (!result.canceled) {
            setBanner(result.assets[0].uri);
            }
        } catch (err) {
            setError("Failed to pick banner image");
        }
    };

    const uploadImage = async (image) => {
        try {
            // Convert object to actual URI string
            const imageUri = typeof image === "string" ? image : image?.uri;

            if (!imageUri) {
                throw new Error("Invalid image");
            }

            const formData = new FormData();

            let cleanUri = imageUri;
            try {
              let decoded = decodeURIComponent(cleanUri);
              while (decoded !== cleanUri) {
                cleanUri = decoded;
                decoded = decodeURIComponent(cleanUri);
              }
            } catch (e) {
              // Safe fallback
            }

            formData.append("file", {
                uri: cleanUri,
                type: "image/jpeg",
                name: "upload.jpg",
            });

            formData.append("upload_preset", "avatar");

            const response = await fetch(
                "https://api.cloudinary.com/v1_1/dcazbfdaw/image/upload",
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await response.json();

            if (!data.secure_url) {
                throw new Error("Cloudinary upload failed");
            }

            return data.secure_url;
        } catch (error) {
            console.log("UPLOAD ERROR:", error);
            throw error;
        }
    };

    const handleSave = async () => {
        if (!fullName.trim() || !username.trim()) {
            setError("Full name and username are required");
            return;
        }

        setError("");
        setSaving(true);

        try {
            const user = auth.currentUser;

            if (!user) {
                throw new Error("Not authenticated");
            }

            let avatarUrl = avatar;
            let bannerUrl = banner;

            // Upload avatar to Cloudinary
            if (avatar && typeof avatar === "string") {
                avatarUrl = await uploadImage(avatar);
            }

            // Upload banner to Cloudinary
            if (banner && typeof banner === "string") {
                bannerUrl = await uploadImage(banner);
            }

            // Save Cloudinary URLs into Supabase
            const { error: updateError } = await supabase
            .from("users")
            .update({
                full_name: fullName,
                username: username,
                email: email,
                bio: bio,
                work: work,
                address: address,
                phone: phone,
                education: education,
                avatar_url: avatarUrl,
                banner_url: bannerUrl,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.uid);

            if (updateError) {
                throw updateError;
            }

            // Publish update posts to user feed (Facebook parity)
            if (avatarUrl !== initialAvatar && avatarUrl) {
                await supabase.from("posts").insert({
                    user_id: user.uid,
                    content: "updated their profile picture",
                    media_url: avatarUrl,
                    media_type: "image",
                    created_at: new Date().toISOString()
                });
            }

            if (bannerUrl !== initialBanner && bannerUrl) {
                await supabase.from("posts").insert({
                    user_id: user.uid,
                    content: "updated their cover photo",
                    media_url: bannerUrl,
                    media_type: "image",
                    created_at: new Date().toISOString()
                });
            }

            alert("Profile updated successfully!");
            router.back();
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: verticalScale(120),
        }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Back width={24} height={24} />
          </Pressable>

          <Text style={styles.headerTitle}>Edit Profile</Text>

          <View style={{ width: 24 }} />
        </View>

        {/* BANNER */}
        {/* BANNER */}
        <View style={styles.bannerContainer}>
            <Image
                source={
                banner
                    ? { uri: banner }
                    : require("../assets/images/image placeholder.jpeg")
                }
                style={styles.bannerImg}
            />

            <Pressable
                style={styles.bannerEditBtn}
                onPress={pickBannerImage}
            >
                <Camera width={18} height={18} />
            </Pressable>
        </View>

        {/* PROFILE IMAGE */}
        {/* PROFILE IMAGE */}
        <View style={styles.profileSection}>
            <View style={styles.profileWrapper}>
                <Image
                source={
                    avatar
                    ? { uri: avatar }
                    : require("../assets/images/default.png")
                }
                style={styles.profileImg}
                />

                <Pressable
                style={styles.profileEditBtn}
                onPress={pickImage}
                >
                <Camera width={16} height={16} />
                </Pressable>
            </View>
        </View>

        {/* ERROR MESSAGE */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* FORM */}
        <View style={styles.form}>
          {/* FULL NAME */}
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>

            <FloatingInput
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* USERNAME */}
          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>

            <FloatingInput
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          {/* EMAIL */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>

            <FloatingInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* BIO */}
          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>

            <FloatingInput
              value={username}
              onChangeText={setUsername}
            />
          </View>

          {/* BIO */}
          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>

            <FloatingInput
              placeholder="Tell people about yourself"
              value={bio}
              onChangeText={setBio}
              multiline
              style={styles.bioInput}
            />
          </View>

          {/* WORK */}
          <View style={styles.field}>
            <Text style={styles.label}>Work</Text>

            <FloatingInput
              placeholder="Occupation"
              value={work}
              onChangeText={setWork}
            />
          </View>

          {/* LOCATION */}
          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>

            <FloatingInput
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>

            <FloatingInput
              placeholder="Phone"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Education */}
          <View style={styles.field}>
            <Text style={styles.label}>Education</Text>

            <FloatingInput
              placeholder="Education"
              value={education}
              onChangeText={setEducation}
            />
          </View>

          {/* SAVE BUTTON */}
          <View style={{ marginTop: verticalScale(30) }}>
            <Button
              text="Save Changes"
              bgColor={COLORS.primary}
              textColor="#fff"
              action={handleSave}
              loading={saving}
              disabled={saving}
              style={{
                paddingVertical: verticalScale(18),
              }}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    marginBottom: verticalScale(20),
  },

  headerTitle: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(20),
    color: "#000",
  },

  bannerContainer: {
    position: "relative",
    marginHorizontal: scale(15),
  },

  bannerImg: {
    width: "100%",
    height: verticalScale(160),
    borderRadius: scale(25),
    resizeMode: "cover",
  },

  bannerEditBtn: {
    position: "absolute",
    right: scale(15),
    bottom: scale(15),
    backgroundColor: "#ffffffdd",
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    justifyContent: "center",
    alignItems: "center",
  },

  profileSection: {
    alignItems: "center",
    marginTop: -scale(50),
    marginBottom: verticalScale(15),
  },

  profileWrapper: {
    position: "relative",
  },

  profileImg: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    borderWidth: 5,
    borderColor: "#fff",
    resizeMode: "cover",
  },

  profileEditBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.bg,
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },

  form: {
    paddingHorizontal: scale(20),
    marginTop: verticalScale(10),
  },

  field: {
    marginBottom: verticalScale(22),
  },

  label: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(14),
    color: "#606073",
    marginBottom: verticalScale(10),
    marginLeft: scale(5),
  },

  bioInput: {
    minHeight: verticalScale(100),
    textAlignVertical: "top",
    paddingTop: verticalScale(18),
  },

  errorText: {
    color: "red",
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(12),
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(10),
  },
});