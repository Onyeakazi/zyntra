import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { auth } from "../config/firebase";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import Img from "../assets/vectors/photo.svg";
import Vid from "../assets/vectors/video.svg";
import Att from "../assets/vectors/links.svg";
import Gif from "../assets/vectors/gif.svg";
import Live from "../assets/vectors/live.svg";
import Camera from "../assets/vectors/cameras.svg";
import LinkIcon from "../assets/vectors/link.svg";

export default function CreatePost() {
  const params = useLocalSearchParams();
  const editId = params?.editId;

  const [avatar, setAvatar] = useState(null);
  const [content, setContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState([]); // Array of { uri, type, name, size, isUploaded }
  const [linkInputVisible, setLinkInputVisible] = useState(false);
  const [tempLink, setTempLink] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchUser();
    if (editId) {
      fetchPostToEdit();
    }
  }, [editId]);

  const fetchPostToEdit = async () => {
    try {
      console.log("Pre-loading post to edit, id:", editId);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", editId)
        .single();

      if (error) throw error;

      if (data) {
        setContent(data.content || "");
        if (data.media_url) {
          const urls = data.media_url.split(",");
          const media = urls.map((url) => {
            let type = "image";
            if (url.includes(".mp4") || url.includes(".mov")) type = "video";
            else if (url.startsWith("http") && !url.includes("cloudinary.com") && !url.includes(".jpg") && !url.includes(".png") && !url.includes(".jpeg")) type = "link";
            else if (url.includes(".pdf") || url.includes(".docx") || url.includes(".bin")) type = "document";

            return {
              uri: url,
              type: type,
              name: url.split("/").pop() || "media",
              isUploaded: true,
            };
          });
          setSelectedMedia(media);
        }
      }
    } catch (err) {
      console.error("Error fetching post to edit:", err);
    }
  };

  const fetchUser = async () => {
    const user = auth.currentUser;

    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("avatar_url")
      .eq("id", user.uid)
      .single();

    if (data?.avatar_url) {
      setAvatar(data.avatar_url);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newMedia = result.assets.map(asset => ({
          uri: asset.uri,
          type: "image",
          name: asset.fileName || "image.jpg",
          file: asset.file || null,
        }));
        setSelectedMedia(prev => [...(prev || []), ...newMedia]);
        setLinkInputVisible(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("Failed to pick image");
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newMedia = result.assets.map(asset => ({
          uri: asset.uri,
          type: "video",
          name: asset.fileName || "video.mp4",
          file: asset.file || null,
        }));
        setSelectedMedia(prev => [...(prev || []), ...newMedia]);
        setLinkInputVisible(false);
      }
    } catch (error) {
      console.error("Error picking video:", error);
      alert("Failed to pick video");
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newMedia = result.assets.map(file => ({
          uri: file.uri,
          type: "document",
          name: file.name,
          size: file.size,
          file: file.file || null,
        }));
        setSelectedMedia(prev => [...(prev || []), ...newMedia]);
        setLinkInputVisible(false);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      alert("Failed to pick document");
    }
  };

  const pickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera permissions are required to take photos!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newMedia = {
          uri: result.assets[0].uri,
          type: "image",
          name: "camera_shot.jpg",
        };
        setSelectedMedia(prev => [...(prev || []), newMedia]);
        setLinkInputVisible(false);
      }
    } catch (error) {
      console.error("Error launching camera:", error);
      alert("Failed to launch camera");
    }
  };

  const handleAttachLink = () => {
    if (!tempLink.trim()) {
      alert("Please enter a valid link!");
      return;
    }
    let formattedLink = tempLink.trim();
    if (!/^https?:\/\//i.test(formattedLink)) {
      formattedLink = `https://${formattedLink}`;
    }
    const newMedia = {
      uri: formattedLink,
      type: "link",
      name: formattedLink,
    };
    setSelectedMedia(prev => [...(prev || []), newMedia]);
    setLinkInputVisible(false);
    setTempLink("");
  };

  const uploadToCloudinary = async (mediaInput, resourceType = "image") => {
    console.log("uploadToCloudinary entered with:", mediaInput);
    try {
      // Safeguard: Extract uri and native File/Blob object (for Web) from mediaInput
      let uri = typeof mediaInput === "string" ? mediaInput : mediaInput?.uri;
      let fileObj = typeof mediaInput === "object" ? mediaInput?.file : null;

      if (!uri || typeof uri !== "string") {
        throw new Error("Invalid file URI: " + (mediaInput ? JSON.stringify(mediaInput) : "undefined"));
      }

      const formData = new FormData();
      
      // Deep decode the URI to resolve double-URL-encoded characters in Expo paths (e.g. %2540 -> %40 -> @)
      let cleanUri = uri;
      try {
        let decoded = decodeURIComponent(cleanUri);
        while (decoded !== cleanUri) {
          cleanUri = decoded;
          decoded = decodeURIComponent(cleanUri);
        }
      } catch (e) {
        // Safe fallback
      }

      let extension = "jpg";
      if (resourceType === "video") extension = "mp4";
      else if (resourceType === "raw") extension = "bin";

      let filename = cleanUri.split("/").pop() || "upload";
      if (!filename.includes(".")) {
        filename = `${filename}.${extension}`;
      }

      let mimeType = "image/jpeg";
      if (resourceType === "video") {
        mimeType = "video/mp4";
      } else if (resourceType === "raw") {
        mimeType = "application/octet-stream";
      }

      console.log("Cloudinary Upload - Sending request:", {
        cleanUri: cleanUri,
        filename: filename,
        resourceType: resourceType,
        mimeType: mimeType,
        isWeb: Platform.OS === "web",
        hasFileObj: !!fileObj
      });

      if (Platform.OS === "web") {
        if (fileObj) {
          formData.append("file", fileObj);
        } else {
          // Fetch blob and convert to Blob on Web
          const response = await fetch(cleanUri);
          const blob = await response.blob();
          formData.append("file", blob, filename);
        }
      } else {
        formData.append("file", {
          uri: cleanUri,
          type: mimeType,
          name: filename,
        });
      }
      formData.append("upload_preset", "avatar");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dcazbfdaw/${resourceType}/upload`,
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
      console.error("Cloudinary upload error:", err);
      throw err;
    }
  };

  const handlePost = async () => {
    if (!content.trim() && (!selectedMedia || selectedMedia.length === 0)) {
      alert("Please write something or add media to post!");
      return;
    }

    setPosting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let mediaUrls = [];
      let mediaTypes = [];

      if (selectedMedia && selectedMedia.length > 0) {
        const uploadPromises = selectedMedia.map(async (media) => {
          if (media.type === "link") {
            return { url: media.uri, type: "link" };
          } else if (media.isUploaded) {
            return { url: media.uri, type: media.type };
          } else {
            const resourceType = media.type === "image" ? "image" : media.type === "video" ? "video" : "raw";
            const url = await uploadToCloudinary(media, resourceType);
            return { url, type: media.type };
          }
        });

        const uploadedResults = await Promise.all(uploadPromises);
        mediaUrls = uploadedResults.map(r => r.url);
        mediaTypes = uploadedResults.map(r => r.type);
      }

      const finalMediaUrl = mediaUrls.length > 0 ? mediaUrls.join(",") : null;
      const uniqueTypes = [...new Set(mediaTypes)];
      const finalMediaType = uniqueTypes.length === 1 ? uniqueTypes[0] : uniqueTypes.length > 1 ? "mixed" : null;

      if (editId) {
        // UPDATE MODE
        const { error: postError } = await supabase
          .from("posts")
          .update({
            content: content,
            media_url: finalMediaUrl,
            media_type: finalMediaType,
          })
          .eq("id", editId);

        if (postError) throw postError;
        alert("Post updated successfully!");
      } else {
        // CREATE MODE
        const { error: postError } = await supabase
          .from("posts")
          .insert({
            user_id: user.uid,
            content: content,
            media_url: finalMediaUrl,
            media_type: finalMediaType,
            created_at: new Date().toISOString(),
          });

        if (postError) throw postError;
        alert("Post created successfully!");
      }

      router.back();
    } catch (err) {
      console.error("Post creation failed:", err);
      alert("Failed to save post: " + err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={posting}>
          <Text style={styles.cancel}>✕</Text>
        </Pressable>

        <Text style={styles.title}>{editId ? "Edit Post" : "Create Post"}</Text>

        <Pressable onPress={handlePost} disabled={posting}>
          {posting ? (
            <ActivityIndicator size="small" color="#1877F2" />
          ) : (
            <Text style={styles.post}>{editId ? "Update" : "Post"}</Text>
          )}
        </Pressable>
      </View>

      {/* USER */}
      <View style={styles.userRow}>
        <Image
          source={
            avatar
              ? { uri: avatar }
              : require("../assets/images/default.png")
          }
          style={styles.avatar}
        />

        <View style={styles.privacyBtn}>
          <Text style={styles.privacyText}>Public</Text>
        </View>
      </View>

      {/* SCROLLABLE CONTENT BODY */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        style={styles.scrollBody}
      >
        {/* INPUT */}
        <TextInput
          placeholder="What's on your mind?"
          placeholderTextColor="#777"
          multiline
          value={content}
          onChangeText={setContent}
          style={styles.input}
        />

        {/* LINK ENTRY FIELD */}
        {linkInputVisible && (
          <View style={styles.linkInputContainer}>
            <TextInput
              placeholder="Enter or paste URL (e.g. google.com)"
              value={tempLink}
              onChangeText={setTempLink}
              style={styles.linkTextInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.attachBtn} onPress={handleAttachLink}>
              <Text style={styles.attachBtnText}>Attach</Text>
            </Pressable>
          </View>
        )}

        {/* ATTACHED MEDIA PREVIEWS (Multiple Selection) */}
        {selectedMedia && selectedMedia.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.attachmentsTitle}>Attachments ({selectedMedia.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
            >
              {selectedMedia.map((media, index) => (
                <View key={index} style={styles.mediaPreviewCard}>
                  {media.type === "image" && (
                    <Image source={{ uri: media.uri }} style={styles.squarePreview} />
                  )}

                  {media.type === "video" && (
                    <View style={styles.videoSquareContainer}>
                      <Image
                        source={require("../assets/images/image placeholder.jpeg")}
                        style={styles.squarePreview}
                      />
                      <View style={styles.videoSquareOverlay}>
                        <Text style={styles.playSquareIcon}>▶</Text>
                      </View>
                    </View>
                  )}

                  {media.type === "document" && (
                    <View style={styles.docSquareCard}>
                      <Text style={styles.docSquareIcon}>📄</Text>
                      <Text style={styles.docSquareName} numberOfLines={1}>
                        {media.name}
                      </Text>
                    </View>
                  )}

                  {media.type === "link" && (
                    <View style={styles.linkSquareCard}>
                      <Text style={styles.linkSquareIcon}>🔗</Text>
                      <Text style={styles.linkSquareText} numberOfLines={1}>
                        {media.uri}
                      </Text>
                    </View>
                  )}

                  {/* REMOVE BUTTON */}
                  <Pressable
                    style={styles.cancelSquareBadge}
                    onPress={() => setSelectedMedia(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Text style={styles.cancelSquareText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM SHEET */}
      <View style={styles.bottomSheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Pressable style={styles.option} onPress={pickImage}>
            <Img width={22} height={22} color={"#007AFF"} />
            <Text style={styles.optionText}>Add A Photo</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={pickVideo}>
            <Vid width={22} height={22} color={"#007AFF"} />
            <Text style={styles.optionText}>Add A Video</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={pickDocument}>
            <Att width={22} height={22} color={"#007AFF"} />
            <Text style={styles.optionText}>Add A Document</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={() => setLinkInputVisible(!linkInputVisible)}>
            <LinkIcon width={22} height={22} color={"#007AFF"} />
            <Text style={styles.optionText}>Add A Link</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={pickCamera}>
            <Camera width={22} height={22} />
            <Text style={styles.optionText}>Camera</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cancel: {
    fontSize: 22,
    color: "#444",
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
  },

  post: {
    color: "#1877F2",
    fontSize: 16,
    fontWeight: "600",
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    gap: 10,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
  },

  privacyBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },

  privacyText: {
    fontSize: 13,
  },

  scrollBody: {
    flex: 1,
  },

  input: {
    marginTop: 25,
    fontSize: 20,
    minHeight: 120,
    textAlignVertical: "top",
    color: "#000",
  },

  previewContainer: {
    marginTop: 20,
  },

  attachmentsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
  },

  mediaPreviewCard: {
    width: 130,
    height: 130,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e1e4e8",
    backgroundColor: "#fafafa",
  },

  squarePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  videoSquareContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
    backgroundColor: "#000",
  },

  videoSquareOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  playSquareIcon: {
    fontSize: 24,
    color: "#fff",
  },

  docSquareCard: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    padding: 10,
  },

  docSquareIcon: {
    fontSize: 28,
  },

  docSquareName: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    marginTop: 5,
    textAlign: "center",
    width: "100%",
  },

  linkSquareCard: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8f4fd",
    padding: 10,
  },

  linkSquareIcon: {
    fontSize: 24,
  },

  linkSquareText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
    marginTop: 5,
    textAlign: "center",
    width: "100%",
  },

  cancelSquareBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  cancelSquareText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  linkInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 15,
    backgroundColor: "#fafafa",
  },

  linkTextInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },

  attachBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },

  attachBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 25,
    paddingTop: 15,
    paddingBottom: 35,
    borderWidth: 1,
    borderColor: "#eee",
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 18,
  },

  optionText: {
    fontSize: 16,
    color: "#111",
  },
});