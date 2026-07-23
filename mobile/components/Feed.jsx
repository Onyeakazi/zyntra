import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Pressable, Alert, Share as RNShare, Modal, PanResponder, Animated, ActivityIndicator, KeyboardAvoidingView, TextInput, Platform, FlatList } from 'react-native';
import Like from "../assets/vectors/like.svg";
import Message from "../assets/vectors/message.svg";
import Share from "../assets/vectors/share.svg";
import Saved from "../assets/vectors/save.svg";
import LinkIcon from "../assets/vectors/link.svg";
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { auth } from '../config/firebase';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { renderTextWithMentions } from '../utils/mentions';
import TYPOGRAPHY from '../constants/typography';
import COLORS from '../constants/colors';
import { acceptConnectionInDB } from '../utils/connectionHelpers';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import { scale as scaleSize } from '../utils/scale';
import { useTranslation } from 'react-i18next';

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

const RepostIconInline = ({ color = "#1F2937", size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17 1l4 4-4 4" />
    <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <Path d="M7 23l-4-4 4-4" />
    <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Svg>
);

const QuoteIconInline = ({ color = "#1F2937", size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 20h9" />
    <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </Svg>
);

const LinkIconInline = ({ color = "#1F2937", size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Svg>
);

const ShareIconInline = ({ color = "#1F2937", size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <Polyline points="16 6 12 2 8 6" />
    <Line x1="12" y1="2" x2="12" y2="15" />
  </Svg>
);

const AutoHeightImage = ({ source, width, style }) => {
  const [aspectRatio, setAspectRatio] = useState(null);

  useEffect(() => {
    if (source && source.uri) {
      Image.getSize(
        source.uri,
        (w, h) => {
          if (w && h) {
            let ratio = w / h;
            // Cap aspect ratio like Facebook to prevent too vertical or too horizontal images
            if (ratio < 0.75) ratio = 0.75;
            if (ratio > 1.91) ratio = 1.91;
            setAspectRatio(ratio);
          }
        },
        (error) => {
          console.log("Failed to get image size:", error);
        }
      );
    }
  }, [source]);

  const computedStyle = aspectRatio
    ? { width: width, height: undefined, aspectRatio: aspectRatio, borderRadius: 10, marginTop: 10 }
    : { width: width, height: 200, borderRadius: 10, marginTop: 10 };

  return (
    <Image
      source={source}
      style={[style, computedStyle]}
      resizeMode="cover"
    />
  );
};

const ZoomableImage = ({ source, style, resizeMode = "contain" }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const lastScale = useRef(1);
  const lastPan = useRef({ x: 0, y: 0 });
  const initialDist = useRef(0);
  const pinchStartScale = useRef(1);
  const isPinching = useRef(false);
  const lastTap = useRef(0);

  useEffect(() => {
    const scaleId = scale.addListener(({ value }) => {
      lastScale.current = value;
    });
    const panId = pan.addListener(({ x, y }) => {
      lastPan.current = { x, y };
    });
    return () => {
      scale.removeListener(scaleId);
      pan.removeListener(panId);
    };
  }, [scale, pan]);

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (lastScale.current > 1) {
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false })
        ]).start(() => {
          lastScale.current = 1;
          lastPan.current = { x: 0, y: 0 };
          pan.setOffset({ x: 0, y: 0 });
          pan.setValue({ x: 0, y: 0 });
        });
      } else {
        Animated.parallel([
          Animated.spring(scale, { toValue: 2.5, useNativeDriver: false }),
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false })
        ]).start(() => {
          lastScale.current = 2.5;
          lastPan.current = { x: 0, y: 0 };
          pan.setOffset({ x: 0, y: 0 });
          pan.setValue({ x: 0, y: 0 });
        });
      }
    }
    lastTap.current = now;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only set responder on start if already zoomed in
        return lastScale.current > 1;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Capture movements if zoomed in or starting a pinch gesture (more than 1 finger)
        return lastScale.current > 1 || evt.nativeEvent.touches.length > 1;
      },
      onPanResponderTerminationRequest: () => lastScale.current === 1,
      onPanResponderGrant: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length === 2) {
          const t1 = evt.nativeEvent.touches[0];
          const t2 = evt.nativeEvent.touches[1];
          const dx = t1.pageX - t2.pageX;
          const dy = t1.pageY - t2.pageY;
          initialDist.current = Math.sqrt(dx * dx + dy * dy);
          pinchStartScale.current = lastScale.current;
          isPinching.current = true;
        } else {
          isPinching.current = false;
          // Handle double tap inside pan responder (when already zoomed in)
          const now = Date.now();
          const DOUBLE_TAP_DELAY = 300;
          if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            Animated.parallel([
              Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
              Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false })
            ]).start(() => {
              lastScale.current = 1;
              lastPan.current = { x: 0, y: 0 };
              pan.setOffset({ x: 0, y: 0 });
              pan.setValue({ x: 0, y: 0 });
            });
          } else {
            pan.setOffset({ x: lastPan.current.x, y: lastPan.current.y });
            pan.setValue({ x: 0, y: 0 });
          }
          lastTap.current = now;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length === 2) {
          const t1 = evt.nativeEvent.touches[0];
          const t2 = evt.nativeEvent.touches[1];
          const dx = t1.pageX - t2.pageX;
          const dy = t1.pageY - t2.pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (!isPinching.current || initialDist.current === 0) {
            initialDist.current = dist;
            pinchStartScale.current = lastScale.current;
            isPinching.current = true;
          } else {
            let nextScale = (dist / initialDist.current) * pinchStartScale.current;
            if (nextScale < 1) nextScale = 1;
            if (nextScale > 4) nextScale = 4;
            scale.setValue(nextScale);
          }
        } else if (evt.nativeEvent.touches.length === 1) {
          if (isPinching.current) {
            isPinching.current = false;
            initialDist.current = 0;
            pan.flattenOffset();
            pan.setOffset({ x: lastPan.current.x, y: lastPan.current.y });
            pan.setValue({ x: 0, y: 0 });
          } else if (lastScale.current > 1) {
            pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        isPinching.current = false;
        initialDist.current = 0;

        if (lastScale.current <= 1.05) {
          Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false })
          ]).start(() => {
            lastScale.current = 1;
            lastPan.current = { x: 0, y: 0 };
            pan.setOffset({ x: 0, y: 0 });
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          const maxDragX = (lastScale.current - 1) * (Dimensions.get("window").width / 2);
          const maxDragY = (lastScale.current - 1) * (320 / 2);
          let newX = lastPan.current.x;
          let newY = lastPan.current.y;

          if (Math.abs(newX) > maxDragX) {
            newX = newX > 0 ? maxDragX : -maxDragX;
          }
          if (Math.abs(newY) > maxDragY) {
            newY = newY > 0 ? maxDragY : -maxDragY;
          }

          Animated.parallel([
            Animated.spring(pan, { toValue: { x: newX, y: newY }, useNativeDriver: false })
          ]).start(() => {
            lastPan.current = { x: newX, y: newY };
          });
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        isPinching.current = false;
        initialDist.current = 0;

        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false })
        ]).start(() => {
          lastScale.current = 1;
          lastPan.current = { x: 0, y: 0 };
          pan.setOffset({ x: 0, y: 0 });
          pan.setValue({ x: 0, y: 0 });
        });
      }
    })
  ).current;

  return (
    <Animated.View
      collapsable={false}
      {...panResponder.panHandlers}
      style={[
        style,
        {
          transform: [
            { scale: scale },
            { translateX: pan.x },
            { translateY: pan.y }
          ]
        }
      ]}
    >
      <Pressable onPress={handleDoubleTap} style={{ width: '100%', height: '100%' }}>
        <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode={resizeMode} />
      </Pressable>
    </Animated.View>
  );
};

const Feed = ({ item, initialPhotoViewerVisible = false, onClosePhotoViewer, onProfileImageUpdated, activePostId, postItems, initialPhotoViewerIndex = 0, onShareToStory }) => {
  const { t, i18n } = useTranslation();
  const [activeItem, setActiveItem] = useState(item);
  const targetPostId = activeItem.id;

  // Translation States
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [showingTranslation, setShowingTranslation] = useState(false);

  // Auto-translate post content when active language changes
  useEffect(() => {
    let active = true;

    const performAutoTranslate = async () => {
      if (!item.content || item.content.trim().length === 0) return;

      const isUpdate = item.content === "updated their profile picture" || item.content === "updated their cover photo";
      if (isUpdate) return;

      const activeLang = (i18n.language || 'en').toLowerCase().split('-')[0];

      if (activeLang === 'en') {
        if (active) {
          setShowingTranslation(false);
          setTranslatedText("");
        }
        return;
      }

      setIsTranslating(true);
      try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${activeLang}&dt=t&q=${encodeURIComponent(item.content)}`);
        const data = await res.json();
        const result = data[0].map(x => x[0]).join('');
        if (active) {
          setTranslatedText(result);
          setShowingTranslation(true);
        }
      } catch (e) {
        console.log("Auto translation error:", e);
      } finally {
        if (active) {
          setIsTranslating(false);
        }
      }
    };

    performAutoTranslate();

    return () => {
      active = false;
    };
  }, [i18n.language, item.content, item.id]);

  const handleTranslate = async () => {
    if (showingTranslation) {
      setShowingTranslation(false);
      return;
    }
    if (translatedText) {
      setShowingTranslation(true);
      return;
    }
    
    setIsTranslating(true);
    try {
      const activeLang = i18n.language || 'en';
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${activeLang}&dt=t&q=${encodeURIComponent(item.content)}`);
      const data = await res.json();
      const result = data[0].map(x => x[0]).join('');
      setTranslatedText(result);
      setShowingTranslation(true);
    } catch (e) {
      console.log("Translation error:", e);
      Alert.alert("Translation Error", "Could not fetch translation at this time.");
    } finally {
      setIsTranslating(false);
    }
  };

  const [expanded, setExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Photo viewer states
  const [isPhotoViewerVisible, setIsPhotoViewerVisible] = useState(initialPhotoViewerVisible);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [showPhotoViewerOptions, setShowPhotoViewerOptions] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  useEffect(() => {
    if (isPhotoViewerVisible && activeItem && activeItem.image) {
      const getImagesList = () => {
        if (Array.isArray(activeItem.image)) return activeItem.image;
        if (activeItem.image.uri && typeof activeItem.image.uri === 'string' && activeItem.image.uri.includes(',')) {
          return activeItem.image.uri.split(',').map(url => ({ uri: url }));
        }
        return [activeItem.image];
      };
      const imgs = getImagesList();
      if (imgs.length > 0) {
        const img = imgs[photoViewerIndex] || imgs[0];
        let uri = null;
        if (typeof img === 'string') {
          uri = img;
        } else if (img && typeof img === 'object' && img.uri) {
          uri = img.uri;
        }
        if (typeof uri === 'string' && uri.startsWith('http')) {
          Image.getSize(uri, (w, h) => {
            if (w && h) {
              setImageAspectRatio(w / h);
            }
          }, (err) => {
            console.log("Failed to get image size:", err);
            setImageAspectRatio(1);
          });
          return;
        }
      }
    }
    setImageAspectRatio(1);
  }, [isPhotoViewerVisible, activeItem, photoViewerIndex]);

  const resolvedAspectRatio = Math.max(0.75, imageAspectRatio);
  const viewerCardWidth = scaleSize(330);
  const viewerImageHeight = activeItem && activeItem.content === "updated their cover photo"
    ? viewerCardWidth * 0.375
    : viewerCardWidth / resolvedAspectRatio;

  useEffect(() => {
    setActiveItem(item);
  }, [item]);

  useEffect(() => {
    if (isPhotoViewerVisible && postItems && postItems.length > 0) {
      const idx = initialPhotoViewerIndex >= 0 && initialPhotoViewerIndex < postItems.length ? initialPhotoViewerIndex : 0;
      setActiveItem(postItems[idx]);
      setPhotoViewerIndex(idx);
    }
  }, [isPhotoViewerVisible, postItems, initialPhotoViewerIndex]);

  // Inline Video playing state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldRouteThroughEarpieceIOS: false,
        });
      } catch (err) {
        console.log("Failed to set audio mode:", err);
      }
    };
    setupAudio();
  }, []);

  useEffect(() => {
    if (activePostId && activePostId !== item.id) {
      setIsVideoPlaying(false);
    }
  }, [activePostId]);

  // Comments bottom sheet states inside photo viewer
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [commentsList, setCommentsList] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  const sheetAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;

  useEffect(() => {
    setIsPhotoViewerVisible(initialPhotoViewerVisible);
  }, [initialPhotoViewerVisible]);

  useEffect(() => {
    if (showCommentsSheet) {
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
      fetchCommentsForSheet();
    } else {
      Animated.timing(sheetAnim, {
        toValue: Dimensions.get("window").height,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [showCommentsSheet]);

  const fetchCommentsForSheet = async () => {
    if (!targetPostId) return;
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          users (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("post_id", targetPostId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setCommentsList(data);
      }
    } catch (err) {
      console.error("Error fetching comments for sheet:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddCommentForSheet = async () => {
    if (!newCommentText.trim() || !currentUserId) return;
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: targetPostId,
          user_id: currentUserId,
          content: newCommentText.trim(),
          created_at: new Date().toISOString()
        })
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          users (
            full_name,
            avatar_url,
            username
          )
        `)
        .single();

      if (!error && data) {
        setCommentsList(prev => [...prev, data]);
        setNewCommentText("");
        setCommentsCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error adding comment in sheet:", err);
    }
  };

  const handleClosePhotoViewer = () => {
    setIsPhotoViewerVisible(false);
    setShowCommentsSheet(false);
    if (onClosePhotoViewer) {
      onClosePhotoViewer();
    }
  };

  const handleUpdateProfileImageDirectly = async () => {
    const isAvatarPost = activeItem.content === "updated their profile picture";
    const isBannerPost = activeItem.content === "updated their cover photo";
    const user = auth.currentUser;
    if (!user) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: isAvatarPost,
        aspect: isAvatarPost ? [1, 1] : undefined,
        quality: 0.8,
      });

      if (result.canceled) return;

      const imageUri = result.assets[0].uri;

      const formData = new FormData();
      let cleanUri = imageUri;
      try {
        let decoded = decodeURIComponent(cleanUri);
        while (decoded !== cleanUri) {
          cleanUri = decoded;
          decoded = decodeURIComponent(cleanUri);
        }
      } catch (e) {
        // Fallback
      }

      formData.append("file", {
        uri: cleanUri,
        type: "image/jpeg",
        name: isAvatarPost ? "avatar.jpg" : "banner.jpg",
      });
      formData.append("upload_preset", "avatar");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dcazbfdaw/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await response.json();
      if (!uploadData.secure_url) {
        throw new Error("Cloudinary upload failed");
      }

      const uploadedUrl = uploadData.secure_url;

      const { error: updateError } = await supabase
        .from("users")
        .update({
          [isAvatarPost ? "avatar_url" : "banner_url"]: uploadedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.uid);

      if (updateError) throw updateError;

      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.uid,
          content: isAvatarPost ? "updated their profile picture" : "updated their cover photo",
          media_url: uploadedUrl,
          media_type: "image",
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      Alert.alert(
        t('settings.selectLanguage') === 'Select Language' ? 'Success' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Éxito' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Succès' : 'Sucesso',
        isAvatarPost 
          ? (t('settings.selectLanguage') === 'Select Language' ? 'Profile picture updated successfully!' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? '¡Foto de perfil actualizada con éxito!' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Photo de profil mise à jour avec succès !' : 'Foto de perfil atualizada com sucesso!')
          : (t('settings.selectLanguage') === 'Select Language' ? 'Cover photo updated successfully!' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? '¡Foto de portada actualizada con éxito!' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Photo de couverture mise à jour avec succès !' : 'Foto de capa atualizada com sucesso!')
      );

      handleClosePhotoViewer();
      if (onProfileImageUpdated) {
        onProfileImageUpdated();
      }
    } catch (err) {
      console.error("Error updating profile image directly:", err);
      Alert.alert("Error", "Failed to update profile image: " + err.message);
    }
  };

  // Reaction and interaction states
  const [myReaction, setMyReaction] = useState(null);
  const [reactionCounts, setReactionCounts] = useState({});
  const [totalReactions, setTotalReactions] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showReactionsPanel, setShowReactionsPanel] = useState(false);

  // Connection states
  const [connectionStatus, setConnectionStatus] = useState(null); // null, 'pending_sent', 'pending_received', 'accepted'
  const [connectionLoading, setConnectionLoading] = useState(false);

  const { width: viewportWidth } = Dimensions.get("window");
  const cappedViewportWidth = viewportWidth > 600 ? 600 : viewportWidth;
  const cardWidth = cappedViewportWidth - 60;
  const currentUserId = auth.currentUser?.uid;
  const isAuthor = activeItem.author_id === currentUserId;

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
    if (!targetPostId) return;
    const { data, error } = await supabase
      .from("post_reactions")
      .select("reaction_type")
      .eq("post_id", targetPostId);
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
    if (!targetPostId) return;
    const { count, error } = await supabase
      .from("post_comments")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", targetPostId);
    if (!error && count !== null) {
      setCommentsCount(count);
    }
  };

  const fetchSavesCount = async () => {
    if (!targetPostId) return;
    const { count, error } = await supabase
      .from("saved_posts")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", targetPostId);
    if (!error && count !== null) {
      setSavesCount(count);
    }
  };

  const fetchSharesCount = async () => {
    if (!targetPostId) return;
    const { count, error } = await supabase
      .from("post_shares")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", targetPostId);
    if (!error && count !== null) {
      setSharesCount(count);
    } else if (error && (error.code === '42P01' || error.message.includes("does not exist"))) {
      // Gracefully handle if post_shares table is not yet created by the user
      console.log("post_shares table does not exist. Ignoring share count.");
    }
  };

  const handleLogShare = async () => {
    if (!targetPostId) return;
    try {
      const { error } = await supabase
        .from("post_shares")
        .insert({
          post_id: targetPostId,
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

  const fetchConnectionStatus = async () => {
    if (!currentUserId || !activeItem.author_id || isAuthor) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${activeItem.author_id}),and(user_id.eq.${activeItem.author_id},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      if (!error && data) {
        if (data.status === 'accepted') {
          setConnectionStatus('accepted');
        } else if (data.status === 'pending') {
          if (data.user_id === currentUserId) {
            setConnectionStatus('pending_sent');
          } else {
            setConnectionStatus('pending_received');
          }
        }
      } else {
        setConnectionStatus(null);
      }
    } catch (err) {
      console.error("Error fetching connection status in Feed:", err);
    }
  };

  const handleToggleConnection = async () => {
    if (!currentUserId || !activeItem.author_id || connectionLoading) return;
    setConnectionLoading(true);
    try {
      if (connectionStatus === null) {
        // Send request
        const { error } = await supabase
          .from("connections")
          .insert({
            user_id: currentUserId,
            friend_id: activeItem.author_id,
            status: "pending",
          });
        if (!error) {
          setConnectionStatus('pending_sent');
          Alert.alert("Request Sent", `Connection request sent to ${activeItem.user.name}!`);
        } else {
          throw error;
        }
      } else if (connectionStatus === 'pending_sent') {
        // Cancel request
        const { error } = await supabase
          .from("connections")
          .delete()
          .eq("user_id", currentUserId)
          .eq("friend_id", activeItem.author_id);
        if (!error) {
          setConnectionStatus(null);
        } else {
          throw error;
        }
      } else if (connectionStatus === 'pending_received') {
        // Accept incoming request
        await acceptConnectionInDB(activeItem.author_id, currentUserId);
        setConnectionStatus('accepted');
        Alert.alert("Success", `You are now connected with ${activeItem.user.name}!`);
      }
    } catch (err) {
      console.error("Error toggling connection in Feed component:", err);
      Alert.alert("Error", "Could not update connection status.");
    } finally {
      setConnectionLoading(false);
    }
  };

  // Fetch interactions (reactions, comments, saved status)
  useEffect(() => {
    let active = true;

    const fetchInteractions = async () => {
      if (!currentUserId || !targetPostId) return;

      try {
        // 1. Fetch user reaction
        const { data: reactData, error: reactError } = await supabase
          .from("post_reactions")
          .select("reaction_type")
          .eq("post_id", targetPostId)
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
          .eq("post_id", targetPostId)
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (active) {
          setIsSaved(!!saveDoc);
        }

        // 4. Fetch connection status
        await fetchConnectionStatus();
      } catch (err) {
        console.error("Error loading interactions:", err);
      }
    };

    fetchInteractions();

    // Supabase Real-time updates for reactions and comments on this post
    const uniqueChannelName = `post-realtime-${targetPostId}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions', filter: `post_id=eq.${targetPostId}` },
        () => {
          fetchReactionsCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${targetPostId}` },
        () => {
          fetchCommentsCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_posts', filter: `post_id=eq.${targetPostId}` },
        () => {
          fetchSavesCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_shares', filter: `post_id=eq.${targetPostId}` },
        () => {
          fetchSharesCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        (payload) => {
          const record = payload.new || payload.old;
          if (record && (
            (record.user_id === currentUserId && record.friend_id === activeItem.author_id) ||
            (record.user_id === activeItem.author_id && record.friend_id === currentUserId)
          )) {
            fetchConnectionStatus();
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [targetPostId, currentUserId]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    setActiveIndex(index);
  };

  const navigateToProfile = () => {
    if (activeItem.author_id) {
      router.push({
        pathname: "/(tabs)/profile",
        params: { userId: activeItem.author_id }
      });
    }
  };

  const navigateToReposterProfile = () => {
    if (activeItem.author_id) {
      router.push({
        pathname: "/(tabs)/profile",
        params: { userId: activeItem.author_id }
      });
    }
  };

  const handleEditPost = () => {
    setShowOptions(false);
    router.push({
      pathname: "/create-post",
      params: { editId: activeItem.id }
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
                .eq("id", activeItem.id);
              if (error) throw error;

              // Deletion Sync: If this was a profile picture or cover photo post, reset the users table
              const isAvatarPost = activeItem.content === "updated their profile picture";
              const isBannerPost = activeItem.content === "updated their cover photo";
              const user = auth.currentUser;

              if (user && (isAvatarPost || isBannerPost)) {
                await supabase
                  .from("users")
                  .update({
                    [isAvatarPost ? "avatar_url" : "banner_url"]: null,
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", user.uid);

                if (onProfileImageUpdated) {
                  onProfileImageUpdated();
                }
              }

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
    const postUrl = `https://zyntra.com/posts/${targetPostId}`;
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

  const handleRepostNow = async () => {
    if (!currentUserId) {
      Alert.alert("Not logged in", "Please log in to repost.");
      return;
    }
    try {
      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: currentUserId,
          repost_id: targetPostId,
          created_at: new Date().toISOString(),
        });
      if (error) throw error;
      Alert.alert("Success", "Reposted successfully!");
    } catch (err) {
      console.error("Repost failed:", err.message);
      Alert.alert("Error", "Failed to repost: " + err.message);
    }
  };

  const handleQuotePost = () => {
    router.push({
      pathname: "/create-post",
      params: { quoteId: targetPostId }
    });
  };

  const handleSharePost = () => {
    setShowOptions(false);
    setShowShareSheet(true);
  };

  const handleSavePostToggle = async () => {
    setShowOptions(false);
    if (!currentUserId) return;

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", targetPostId)
          .eq("user_id", currentUserId);

        if (error) throw error;
        setIsSaved(false);
        setSavesCount(prev => Math.max(0, prev - 1));
        Alert.alert("Removed Bookmark", "Post removed from your bookmarks.");
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .insert({
            post_id: targetPostId,
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
          .eq("post_id", targetPostId)
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
            post_id: targetPostId,
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
          post_id: targetPostId,
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
    if (!targetPostId) return;
    router.push({
      pathname: "/comments",
      params: { postId: targetPostId }
    });
  };

  const handleReportPost = () => {
    setShowOptions(false);
    Alert.alert("Reported", "Thank you. This post has been reported for review.");
  };

  const isUpdatePost = item.content === "updated their profile picture" || item.content === "updated their cover photo";

  return (
    <>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.feedHeader}>
          <Pressable onPress={navigateToProfile} style={styles.headerUser}>
            <Image
              source={item.user.profilePic}
              style={styles.profile}
            />

            <View style={styles.feedInfo}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                <Text style={styles.name}>
                  {item.user.name}
                  {item.repost_id ? (
                    <Text style={styles.sharedText}>
                      {" "}{t('settings.selectLanguage') === 'Select Language' ? 'shared a post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'compartió una publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'a partagé une publication' : 'compartilhou uma publicação'}
                    </Text>
                  ) : null}
                </Text>
                {isUpdatePost && (
                  <Text style={styles.feedUpdateText}>
                    {" "}{item.content === "updated their profile picture"
                      ? (t('settings.selectLanguage') === 'Select Language' ? 'updated their profile picture' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'actualizó su foto de perfil' : t('settings.selectLanguage') === 'Choisir la langue' ? 'a mis à jour sa photo de profil' : 'atualizou sua foto de perfil')
                      : (t('settings.selectLanguage') === 'Select Language' ? 'updated their cover photo' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'actualizó su foto de portada' : t('settings.selectLanguage') === 'Choisir la langue' ? 'a mis à jour sa photo de couverture' : 'atualizou sua foto de capa')}
                  </Text>
                )}
              </View>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </Pressable>

          <View style={styles.headerRightActions}>
            {!isAuthor && connectionStatus !== 'accepted' && (
              <Pressable
                style={[
                  styles.miniConnectBtn,
                  connectionStatus === 'pending_sent' ? styles.miniConnectedBtn : styles.miniConnectBtnSolid
                ]}
                onPress={handleToggleConnection}
                disabled={connectionLoading}
              >
                {connectionLoading ? (
                  <ActivityIndicator size="small" color={connectionStatus === 'pending_sent' ? "#6B7280" : "#FFFFFF"} />
                ) : (
                  <Text style={[
                    styles.miniConnectBtnText,
                    connectionStatus === 'pending_sent' ? styles.miniConnectedBtnText : styles.miniConnectBtnTextSolid
                  ]}>
                    {connectionStatus === 'pending_sent' ? t('connections.requested') : connectionStatus === 'pending_received' ? t('connections.accept') : t('connections.connect')}
                  </Text>
                )}
              </Pressable>
            )}

            {/* Option Action Menu Dots */}
            <Pressable onPress={() => setShowOptions(!showOptions)} style={styles.moreButton}>
              <Text style={styles.moreText}>•••</Text>
            </Pressable>
          </View>

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
                    <Text style={styles.optionText}>{t('settings.selectLanguage') === 'Select Language' ? 'Edit Post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Editar Publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Modifier le message' : 'Editar Publicação'}</Text>
                  </TouchableOpacity>
                  <View style={styles.optionDivider} />
                </>
              )}

              <TouchableOpacity onPress={handleCopyLink} style={styles.optionItem}>
                <LinkIcon width={16} height={16} color="#333" />
                <Text style={styles.optionText}>{t('settings.selectLanguage') === 'Select Language' ? 'Copy Link' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Copiar Enlace' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Copier le lien' : 'Copiar Link'}</Text>
              </TouchableOpacity>

              <View style={styles.optionDivider} />

              <TouchableOpacity onPress={handleSharePost} style={styles.optionItem}>
                <Share width={16} height={16} color="#333" />
                <Text style={styles.optionText}>{t('feed.sharePost')}</Text>
              </TouchableOpacity>

              <View style={styles.optionDivider} />

              <TouchableOpacity onPress={handleSavePostToggle} style={styles.optionItem}>
                <BookmarkIcon size={16} color={isSaved ? "#438def" : "#333"} filled={isSaved} />
                <Text style={[styles.optionText, isSaved ? { color: "#438def" } : null]}>
                  {isSaved ? (t('settings.selectLanguage') === 'Select Language' ? 'Saved' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Guardado' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Enregistré' : 'Salvo') : (t('settings.selectLanguage') === 'Select Language' ? 'Save Post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Guardar Publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Enregistrer le message' : 'Salvar Publicação')}
                </Text>
              </TouchableOpacity>

              {isAuthor && (
                <>
                  <View style={styles.optionDivider} />
                  <TouchableOpacity onPress={handleDeletePost} style={styles.optionItem}>
                    <DeleteIcon size={16} color="red" />
                    <Text style={[styles.optionText, { color: "red" }]}>{t('settings.selectLanguage') === 'Select Language' ? 'Delete Post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Eliminar Publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Supprimer le message' : 'Excluir Publicação'}</Text>
                  </TouchableOpacity>
                </>
              )}

              {!isAuthor && (
                <>
                  <View style={styles.optionDivider} />
                  <TouchableOpacity onPress={handleReportPost} style={styles.optionItem}>
                    <ReportIcon size={16} color="red" />
                    <Text style={[styles.optionText, { color: "red" }]}>{t('settings.selectLanguage') === 'Select Language' ? 'Report Post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Reportar Publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Signaler le message' : 'Denunciar Publicação'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.feedContent}>

          {item.content && !isUpdatePost ? (
            <Text
              numberOfLines={expanded ? undefined : 3}
              style={styles.contentText}
              onTextLayout={(e) => {
                if (!expanded && !showMore) {
                  setShowMore(e.nativeEvent.lines.length >= 3);
                }
              }}
            >
              {renderTextWithMentions(showingTranslation && translatedText ? translatedText : item.content, styles.mentionLink, styles.contentText)}
            </Text>
          ) : null}

          {/* Show button ONLY if text exceeds 3 lines */}
          {showMore && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={styles.seeMore}>
                {expanded ? (t('settings.selectLanguage') === 'Select Language' ? 'see less' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'ver menos' : 'voir moins') : (t('settings.selectLanguage') === 'Select Language' ? 'see more' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'ver más' : 'voir plus')}
              </Text>
            </TouchableOpacity>
          )}

          {/* See Translation Button */}
          {item.content && item.content.trim().length > 0 && (i18n.language || 'en').toLowerCase().split('-')[0] !== 'en' && (
            <TouchableOpacity onPress={handleTranslate} style={{ marginTop: 6, marginBottom: 4 }} disabled={isTranslating}>
              <Text style={{ fontFamily: TYPOGRAPHY.semiBold, fontSize: 13, color: COLORS.accent }}>
                {isTranslating 
                  ? 'Translating...' 
                  : showingTranslation 
                    ? 'See Original' 
                    : 'See Translation'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Render media only if NOT a repost */}
          {!item.repost_id && (() => {
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
              const isVideo = item.media_type === "video" || (images[0].uri && (images[0].uri.includes(".mp4") || images[0].uri.includes(".mov")));

              if (isVideo) {
                return (
                  <View style={[styles.videoContainer, { width: cardWidth }]}>
                    <Video
                      source={images[0]}
                      rate={1.0}
                      volume={1.0}
                      isMuted={isMuted}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={isVideoPlaying}
                      useNativeControls={isVideoPlaying}
                      isLooping
                      style={styles.feedVideo}
                      videoStyle={{ width: '100%', height: '100%' }}
                      onPlaybackStatusUpdate={(status) => {
                        if (status.isPlaying !== isVideoPlaying) {
                          setIsVideoPlaying(status.isPlaying);
                        }
                      }}
                    />
                    {!isVideoPlaying && (
                      <Pressable
                        style={styles.videoPlayOverlay}
                        onPress={() => setIsVideoPlaying(true)}
                      >
                        <View style={styles.videoPlayOverlayCircle}>
                          <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 3 }} />
                        </View>
                      </Pressable>
                    )}
                    {isVideoPlaying && (
                      <Pressable
                        style={styles.muteButtonOverlay}
                        onPress={() => setIsMuted(!isMuted)}
                      >
                        <Ionicons
                          name={isMuted ? "volume-mute" : "volume-high"}
                          size={18}
                          color="#FFFFFF"
                        />
                      </Pressable>
                    )}
                  </View>
                );
              }

              return (
                <Pressable onPress={() => {
                  setPhotoViewerIndex(0);
                  setIsPhotoViewerVisible(true);
                }}>
                  <AutoHeightImage
                    source={images[0]}
                    width={cardWidth}
                    style={styles.feedImage}
                  />
                </Pressable>
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
                    <Pressable
                      key={index}
                      onPress={() => {
                        setPhotoViewerIndex(index);
                        setIsPhotoViewerVisible(true);
                      }}
                    >
                      <Image
                        source={img}
                        style={[styles.carouselImage, { width: cardWidth, height: 200 }]}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.pageIndicatorPill}>
                  <Text style={styles.pageIndicatorText}>
                    {activeIndex + 1}/{images.length}
                  </Text>
                </View>
              </View>
            );
          })()}

        </View>

        {/* Original post preview for Reposts and Quote Posts */}
        {item.repost_id && item.original_post && (
          <View style={styles.quoteNestedContainer}>
            <View style={styles.quoteHeader}>
              <Pressable
                onPress={() => {
                  if (item.original_post.author_id) {
                    router.push({
                      pathname: "/(tabs)/profile",
                      params: { userId: item.original_post.author_id }
                    });
                  }
                }}
                style={styles.quoteHeaderUser}
              >
                <Image
                  source={item.original_post.user.profilePic}
                  style={styles.quoteProfile}
                />
                <View style={styles.quoteUserInfo}>
                  <Text style={styles.quoteName}>{item.original_post.user.name}</Text>
                </View>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/comments",
                  params: { postId: item.original_post.id }
                });
              }}
            >
              {item.original_post.content ? (
                <Text style={styles.quoteContentText} numberOfLines={3}>
                  {renderTextWithMentions(item.original_post.content, styles.mentionLink, styles.quoteContentText)}
                </Text>
              ) : null}

              {(() => {
                const getOrigImagesList = () => {
                  const origImg = item.original_post.image;
                  if (!origImg) return [];
                  if (Array.isArray(origImg)) return origImg;
                  if (origImg.uri && typeof origImg.uri === 'string' && origImg.uri.includes(',')) {
                    return origImg.uri.split(',').map(url => ({ uri: url }));
                  }
                  return [origImg];
                };
                const origImages = getOrigImagesList();
                if (origImages.length === 0) return null;
                return (
                  <Image
                    source={origImages[0]}
                    style={styles.quoteImage}
                    resizeMode="cover"
                  />
                );
              })()}
            </Pressable>
          </View>
        )}

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
                {commentsCount} {commentsCount === 1 ? (t('settings.selectLanguage') === 'Select Language' ? 'comment' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'comentario' : t('settings.selectLanguage') === 'Choisir la langue' ? 'commentaire' : 'comentário') : t('feed.comments').toLowerCase()}
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

      {/* Sleek Facebook-style Bottom Sheet for Sharing */}
      <Modal
        visible={showShareSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShareSheet(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setShowShareSheet(false)}
        >
          <Pressable
            style={styles.sheetContentContainer}
            onPress={(e) => {
              // Absorb touches so backdrop click-to-close is not triggered inside the sheet
            }}
          >
            {/* Grab Handle */}
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Share Post</Text>

            <View style={styles.sheetOptionsList}>
              <TouchableOpacity
                style={styles.sheetOptionRow}
                onPress={() => {
                  setShowShareSheet(false);
                  if (onShareToStory) {
                    onShareToStory(item);
                  }
                }}
              >
                <View style={[styles.sheetIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="camera-outline" size={22} color="#0288D1" />
                </View>
                <View style={styles.sheetOptionTextContainer}>
                  <Text style={styles.sheetOptionTitle}>Share to Story</Text>
                  <Text style={styles.sheetOptionSub}>Add this post card to your 24h story</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetOptionRow}
                onPress={() => {
                  setShowShareSheet(false);
                  handleRepostNow();
                }}
              >
                <View style={styles.sheetIconCircle}>
                  <RepostIconInline color="#1C1E21" size={20} />
                </View>
                <View style={styles.sheetOptionTextContainer}>
                  <Text style={styles.sheetOptionTitle}>Repost Now</Text>
                  <Text style={styles.sheetOptionSub}>Instantly share this post on your feed</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetOptionRow}
                onPress={() => {
                  setShowShareSheet(false);
                  handleQuotePost();
                }}
              >
                <View style={styles.sheetIconCircle}>
                  <QuoteIconInline color="#1C1E21" size={20} />
                </View>
                <View style={styles.sheetOptionTextContainer}>
                  <Text style={styles.sheetOptionTitle}>Quote Post</Text>
                  <Text style={styles.sheetOptionSub}>Add your thoughts before sharing</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetOptionRow}
                onPress={() => {
                  setShowShareSheet(false);
                  handleCopyLink();
                }}
              >
                <View style={styles.sheetIconCircle}>
                  <LinkIconInline color="#1C1E21" size={20} />
                </View>
                <View style={styles.sheetOptionTextContainer}>
                  <Text style={styles.sheetOptionTitle}>Copy Link</Text>
                  <Text style={styles.sheetOptionSub}>Copy the direct link to clipboard</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetOptionRow}
                onPress={async () => {
                  setShowShareSheet(false);
                  try {
                    const shareContent = item.original_post ? (item.original_post.content || "Check out this post on Zyntra!") : (item.content || "Check out this post on Zyntra!");
                    await RNShare.share({
                      message: `${shareContent}\n\nRead more on Zyntra!`,
                    });
                    await handleLogShare();
                  } catch (error) {
                    console.error(error.message);
                  }
                }}
              >
                <View style={styles.sheetIconCircle}>
                  <ShareIconInline color="#1C1E21" size={20} />
                </View>
                <View style={styles.sheetOptionTextContainer}>
                  <Text style={styles.sheetOptionTitle}>Share Outside Platform</Text>
                  <Text style={styles.sheetOptionSub}>Send this post via external apps</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetCancelButton}
              onPress={() => setShowShareSheet(false)}
            >
              <Text style={styles.sheetCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Immersive Zyntra Card Photo Viewer */}
      <Modal
        visible={isPhotoViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClosePhotoViewer}
      >
        <View style={styles.viewerBackdrop}>
          {/* Backdrop Close Trigger Sibling */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              if (showPhotoViewerOptions) {
                setShowPhotoViewerOptions(false);
              } else {
                handleClosePhotoViewer();
              }
            }}
          />

          {/* Centered Modal Card */}
          <View style={styles.viewerCard}>
            {/* 1. Header Row (Light theme) */}
            <View style={styles.viewerCardHeader}>
              <Pressable
                onPress={() => {
                  handleClosePhotoViewer();
                  navigateToProfile();
                }}
                style={styles.viewerUserBtn}
              >
                <Image
                  source={activeItem.user.profilePic}
                  style={styles.viewerAvatar}
                />
                <View style={styles.viewerUserText}>
                  <Text style={styles.viewerName}>
                    {activeItem.user.name}
                    {isUpdatePost && (
                      <Text style={{ fontWeight: 'normal', color: '#65676B' }}>
                        {" "}{activeItem.content}
                      </Text>
                    )}
                  </Text>
                  <Text style={styles.viewerTime}>{activeItem.time}</Text>
                </View>
              </Pressable>

              <View style={styles.viewerHeaderActions}>
                <TouchableOpacity
                  onPress={() => setShowPhotoViewerOptions(!showPhotoViewerOptions)}
                  style={styles.viewerHeaderActionBtn}
                >
                  <Text style={styles.viewerHeaderActionText}>•••</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClosePhotoViewer}
                  style={[styles.viewerHeaderActionBtn, { backgroundColor: '#E5E7EB' }]}
                >
                  <Text style={[styles.viewerHeaderActionText, { color: '#4B5563', fontSize: 13 }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Options Dropdown Overlay inside Card */}
            {showPhotoViewerOptions && (
              <>
                {/* Backdrop overlay to close when clicking outside the dropdown */}
                <Pressable
                  style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}
                  onPress={() => setShowPhotoViewerOptions(false)}
                />
                <View style={styles.viewerCardOptionsDropdown}>
                  {isAuthor && (
                    <>
                      {isUpdatePost ? (
                        <TouchableOpacity
                          onPress={() => {
                            setShowPhotoViewerOptions(false);
                            handleUpdateProfileImageDirectly();
                          }}
                          style={styles.optionItem}
                        >
                          <EditIcon size={16} color="#333" />
                          <Text style={styles.optionText}>
                            {activeItem.content === "updated their profile picture"
                              ? (t('settings.selectLanguage') === 'Select Language' ? 'Upload New Profile Picture' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Subir nueva foto de perfil' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Télécharger une nouvelle photo de profil' : 'Enviar nova foto de perfil')
                              : (t('settings.selectLanguage') === 'Select Language' ? 'Upload New Cover Photo' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Subir nueva foto de portada' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Télécharger une nouvelle photo de couverture' : 'Enviar nova foto de capa')}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setShowPhotoViewerOptions(false);
                            handleClosePhotoViewer();
                            handleEditPost();
                          }}
                          style={styles.optionItem}
                        >
                          <EditIcon size={16} color="#333" />
                          <Text style={styles.optionText}>{t('settings.selectLanguage') === 'Select Language' ? 'Edit Post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Editar Publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Modifier le message' : 'Editar Publicação'}</Text>
                        </TouchableOpacity>
                      )}
                      <View style={styles.optionDivider} />
                    </>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      setShowPhotoViewerOptions(false);
                      handleCopyLink();
                    }}
                    style={styles.optionItem}
                  >
                    <LinkIconInline width={16} height={16} color="#333" />
                    <Text style={styles.optionText}>{t('settings.selectLanguage') === 'Select Language' ? 'Copy Link' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Copiar Enlace' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Copier le lien' : 'Copiar Link'}</Text>
                  </TouchableOpacity>

                  <View style={styles.optionDivider} />

                  <TouchableOpacity
                    onPress={() => {
                      setShowPhotoViewerOptions(false);
                      handleSharePost();
                    }}
                    style={styles.optionItem}
                  >
                    <Share width={16} height={16} color="#333" />
                    <Text style={styles.optionText}>{t('feed.sharePost')}</Text>
                  </TouchableOpacity>

                  <View style={styles.optionDivider} />

                  <TouchableOpacity
                    onPress={() => {
                      setShowPhotoViewerOptions(false);
                      handleSavePostToggle();
                    }}
                    style={styles.optionItem}
                  >
                    <BookmarkIcon size={16} color={isSaved ? "#438def" : "#333"} filled={isSaved} />
                    <Text style={[styles.optionText, isSaved ? { color: "#438def" } : null]}>
                      {isSaved ? (t('settings.selectLanguage') === 'Select Language' ? 'Saved' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Guardado' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Enregistré' : 'Salvo') : (t('settings.selectLanguage') === 'Select Language' ? 'Save Post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Guardar Publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Enregistrer le message' : 'Salvar Publicação')}
                    </Text>
                  </TouchableOpacity>

                  {isAuthor && (
                    <>
                      <View style={styles.optionDivider} />
                      <TouchableOpacity
                        onPress={() => {
                          setShowPhotoViewerOptions(false);
                          handleClosePhotoViewer();
                          handleDeletePost();
                        }}
                        style={styles.optionItem}
                      >
                        <DeleteIcon size={16} color="red" />
                        <Text style={[styles.optionText, { color: "red" }]}>{t('settings.selectLanguage') === 'Select Language' ? 'Delete Post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Eliminar Publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Supprimer le message' : 'Excluir Publicação'}</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {!isAuthor && (
                    <>
                      <View style={styles.optionDivider} />
                      <TouchableOpacity
                        onPress={() => {
                          setShowPhotoViewerOptions(false);
                          handleReportPost();
                        }}
                        style={styles.optionItem}
                      >
                        <ReportIcon size={16} color="red" />
                        <Text style={[styles.optionText, { color: "red" }]}>{t('settings.selectLanguage') === 'Select Language' ? 'Report Post' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Reportar Publicación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Signaler le message' : 'Denunciar Publicação'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}

            {/* 2. Middle Image Frame (Dark theme) with Native zoom & pan */}
            <View style={[styles.viewerImageContainer, { height: viewerImageHeight }]}>
              {(() => {
                if (postItems && postItems.length > 0) {
                  return (
                    <FlatList
                      data={postItems}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(p) => p.id.toString()}
                      initialScrollIndex={initialPhotoViewerIndex}
                      getItemLayout={(data, index) => ({
                        length: viewerCardWidth,
                        offset: viewerCardWidth * index,
                        index,
                      })}
                      onMomentumScrollEnd={(e) => {
                        const width = e.nativeEvent.layoutMeasurement.width;
                        const offset = e.nativeEvent.contentOffset.x;
                        const index = Math.round(offset / width);
                        if (index >= 0 && index < postItems.length) {
                          setPhotoViewerIndex(index);
                          setActiveItem(postItems[index]);
                        }
                      }}
                      renderItem={({ item: p }) => {
                        const getPImagesList = () => {
                          if (!p.image) return [];
                          if (Array.isArray(p.image)) return p.image;
                          if (p.image.uri && typeof p.image.uri === 'string' && p.image.uri.includes(',')) {
                            return p.image.uri.split(',').map(url => ({ uri: url }));
                          }
                          return [p.image];
                        };
                        const pImages = getPImagesList();
                        if (pImages.length > 0) {
                          const isVideo = p.media_type === "video" || (pImages[0].uri && (pImages[0].uri.includes(".mp4") || pImages[0].uri.includes(".mov")));
                          if (isVideo) {
                            return (
                              <View style={{ width: viewerCardWidth, height: viewerImageHeight, backgroundColor: '#FFFFFF' }}>
                                <Video
                                  source={pImages[0]}
                                  rate={1.0}
                                  volume={1.0}
                                  isMuted={false}
                                  resizeMode={ResizeMode.CONTAIN}
                                  shouldPlay={true}
                                  useNativeControls
                                  isLooping
                                  style={[styles.viewerVideo, { height: viewerImageHeight }]}
                                  videoStyle={{ width: '100%', height: '100%' }}
                                />
                              </View>
                            );
                          }
                          return (
                            <View style={{ width: viewerCardWidth, height: viewerImageHeight, backgroundColor: '#FFFFFF' }}>
                              <ZoomableImage
                                source={pImages[0]}
                                style={[styles.viewerImage, { height: viewerImageHeight }]}
                                resizeMode="contain"
                              />
                            </View>
                          );
                        }
                        return null;
                      }}
                    />
                  );
                }

                const getImagesList = () => {
                  if (!activeItem.image) return [];
                  if (Array.isArray(activeItem.image)) return activeItem.image;
                  if (activeItem.image.uri && typeof activeItem.image.uri === 'string' && activeItem.image.uri.includes(',')) {
                    return activeItem.image.uri.split(',').map(url => ({ uri: url }));
                  }
                  return [activeItem.image];
                };
                const images = getImagesList();
                if (images.length > 0 && images[photoViewerIndex]) {
                  const isVideo = activeItem.media_type === "video" || (images[photoViewerIndex].uri && (images[photoViewerIndex].uri.includes(".mp4") || images[photoViewerIndex].uri.includes(".mov")));

                  if (isVideo) {
                    return (
                      <Video
                        source={images[photoViewerIndex]}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={true}
                        useNativeControls
                        isLooping
                        style={[styles.viewerVideo, { height: viewerImageHeight }]}
                        videoStyle={{ width: '100%', height: '100%' }}
                      />
                    );
                  }

                  return (
                    <ZoomableImage
                      source={images[photoViewerIndex]}
                      style={[styles.viewerImage, { height: viewerImageHeight }]}
                      resizeMode="contain"
                    />
                  );
                }
                return null;
              })()}
            </View>

            {/* 3. Bottom Content & Actions (Light theme) */}
            {!activeItem.isTempViewerOnly && (
              <View style={styles.viewerCardFooter}>
                {/* Post Description Content (ScrollView in case it is long) */}
                {activeItem.content && !isUpdatePost ? (
                  <ScrollView style={styles.viewerContentScroll} maxHeight={80} showsVerticalScrollIndicator={false}>
                    <Text style={styles.viewerContentText}>
                      {renderTextWithMentions(activeItem.content, styles.mentionLink, styles.viewerContentText)}
                    </Text>
                  </ScrollView>
                ) : null}

                {/* Counts Info Bar */}
                {(totalReactions > 0 || commentsCount > 0) && (
                  <View style={styles.viewerInfoBar}>
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
                          <Text style={styles.viewerInfoReactionsText}>
                            {totalReactions}
                          </Text>
                        </>
                      )}
                    </View>
                    {commentsCount > 0 && (
                      <Text style={styles.viewerInfoCommentsText}>
                        {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
                      </Text>
                    )}
                  </View>
                )}

                {/* Action Buttons Row */}
                <View style={styles.viewerActionsRow}>
                  {/* Like/Reaction Button */}
                  <Pressable
                    onPress={handleToggleLike}
                    onLongPress={() => setShowReactionsPanel(true)}
                    delayLongPress={250}
                    style={styles.viewerActionBtn}
                  >
                    {myReaction ? (
                      <Text style={{ fontSize: 20 }}>{getReactionEmoji(myReaction)}</Text>
                    ) : (
                      <Like width={20} height={20} color="#6B7280" />
                    )}
                    <Text style={[styles.viewerActionBtnText, myReaction ? { color: "#5096F1" } : { color: "#6B7280" }]}>
                      {myReaction ? capitalize(myReaction) : "Like"}
                    </Text>
                  </Pressable>

                  {/* Comment Button */}
                  <Pressable
                    onPress={() => setShowCommentsSheet(true)}
                    style={styles.viewerActionBtn}
                  >
                    <Message width={20} height={20} color="#6B7280" />
                    <Text style={[styles.viewerActionBtnText, { color: "#6B7280" }]}>Comment</Text>
                  </Pressable>

                  {/* Share Button */}
                  <Pressable
                    onPress={handleSharePost}
                    style={styles.viewerActionBtn}
                  >
                    <Share width={20} height={20} color="#6B7280" />
                    <Text style={[styles.viewerActionBtnText, { color: "#6B7280" }]}>Share</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Floating Reactions Option Panel inside card footer context */}
            {showReactionsPanel && (
              <View style={[styles.reactionsPanel, { bottom: 50, left: 10 }]}>
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

            {/* Comments Bottom Sheet Overlay */}
            {showCommentsSheet && (
              <Animated.View
                style={[
                  styles.commentsSheet,
                  { transform: [{ translateY: sheetAnim }] }
                ]}
              >
                <View style={styles.sheetHeader}>
                  <Text style={styles.commentsSheetTitle}>Comments</Text>
                  <TouchableOpacity onPress={() => setShowCommentsSheet(false)} style={styles.sheetCloseBtn}>
                    <Text style={styles.sheetCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {commentsLoading ? (
                  <ActivityIndicator size="small" color="#5096F1" style={{ marginVertical: 20 }} />
                ) : (
                  <ScrollView contentContainerStyle={{ paddingBottom: 20 }} style={styles.sheetCommentsScroll}>
                    {commentsList.length === 0 ? (
                      <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                    ) : (
                      commentsList.map((comment) => (
                        <View key={comment.id} style={styles.sheetCommentItem}>
                          <Image
                            source={
                              comment.users?.avatar_url && comment.users.avatar_url.trim() !== ""
                                ? { uri: comment.users.avatar_url }
                                : require("../assets/images/default.png")
                            }
                            style={styles.sheetCommentAvatar}
                          />
                          <View style={styles.sheetCommentContent}>
                            <Text style={styles.sheetCommentAuthor}>{comment.users?.full_name || "User"}</Text>
                            <Text style={styles.sheetCommentText}>{comment.content}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}

                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
                >
                  <View style={styles.sheetInputRow}>
                    <TextInput
                      placeholder="Write a comment..."
                      value={newCommentText}
                      onChangeText={setNewCommentText}
                      style={styles.sheetInput}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity onPress={handleAddCommentForSheet} style={styles.sheetSendBtn}>
                      <Text style={styles.sheetSendBtnText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </Animated.View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Feed;

const styles = createResponsiveStyleSheet({
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
    flex: 1,
    marginRight: 10,
  },

  moreButton: {
    padding: 5,
  },

  moreText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "bold",
  },

  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  miniConnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    height: 28,
  },

  miniConnectBtnSolid: {
    backgroundColor: '#5096F1',
  },

  miniConnectedBtn: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  miniConnectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.semiBold,
  },

  miniConnectBtnTextSolid: {
    color: '#FFFFFF',
  },

  miniConnectedBtnText: {
    color: '#4B5563',
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
    aspectRatio: 1,
    borderRadius: 99,
    resizeMode: "cover",
  },

  feedInfo: {
    gap: 3,
    flex: 1,
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
    aspectRatio: 1.5,
    borderRadius: 10,
    marginTop: 10,
  },

  carouselContainer: {
    width: "100%",
    aspectRatio: 1.5,
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

  pageIndicatorPill: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(10, 14, 26, 0.65)", // premium glassmorphic dark background
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)", // frosted white border
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12, // rounded capsule
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  pageIndicatorText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: TYPOGRAPHY.semiBold,
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

  sharedText: {
    fontFamily: TYPOGRAPHY.regular,
    color: "#65676B",
    fontSize: 13,
    fontWeight: "normal",
  },

  repostHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },

  repostHeaderText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },

  quoteNestedContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f9f9f9",
  },

  quoteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  quoteHeaderUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  quoteProfile: {
    width: 20,
    aspectRatio: 1,
    borderRadius: 99,
    resizeMode: "cover",
  },

  quoteUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  quoteName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },

  quoteUsername: {
    fontSize: 11,
    color: "#777",
  },

  quoteTime: {
    fontSize: 11,
    color: "#999",
  },

  quoteContentText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },

  quoteImage: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    marginTop: 10,
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  sheetContentContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "80%",
  },

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CCD0D5",
    alignSelf: "center",
    marginBottom: 16,
  },

  sheetTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.bold,
    color: "#050505",
    textAlign: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E6EB",
    marginBottom: 8,
  },

  sheetOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },

  sheetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  sheetOptionTextContainer: {
    flex: 1,
  },

  sheetOptionTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.medium,
    color: "#050505",
  },

  sheetOptionSub: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: "#65676B",
    marginTop: 2,
  },

  sheetCancelButton: {
    backgroundColor: "#E4E6EB",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetCancelButtonText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#050505",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCard: {
    width: 330,
    maxHeight: '85%',
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
    borderWidth: 0,
  },
  viewerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  viewerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerHeaderActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerHeaderActionText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewerCardOptionsDropdown: {
    position: "absolute",
    top: 60,
    right: 50,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 5,
    width: 220,
    zIndex: 1001,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  viewerOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  viewerOptionDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  viewerImageContainer: {
    height: 320,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  viewerImageWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 343,
    height: 320,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 10,
    marginTop: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedVideo: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  viewerVideo: {
    width: '100%',
    height: '100%',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayOverlayCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  muteButtonOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 1000,
  },
  viewerCardFooter: {
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  viewerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  viewerAvatar: {
    width: 36,
    aspectRatio: 1,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    resizeMode: "cover",
  },
  viewerUserText: {
    justifyContent: 'center',
    flex: 1,
  },
  viewerName: {
    color: '#111111',
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewerTime: {
    color: '#6B7280',
    fontSize: 11,
  },
  viewerContentScroll: {
    marginBottom: 10,
  },
  viewerContentText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  viewerInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginBottom: 8,
  },
  viewerInfoReactionsText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  viewerInfoCommentsText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  viewerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 2,
  },
  viewerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewerActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentsSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "60%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 10000,
    paddingTop: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  commentsSheetTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111111",
  },
  sheetCloseBtn: {
    padding: 5,
  },
  sheetCloseText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "bold",
  },
  sheetCommentsScroll: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  noCommentsText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginTop: 30,
    fontSize: 14,
  },
  sheetCommentItem: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-start",
  },
  sheetCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    resizeMode: "cover",
  },
  sheetCommentContent: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 10,
  },
  sheetCommentAuthor: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111111",
    marginBottom: 3,
  },
  sheetCommentText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 17,
  },
  sheetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sheetInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1F2937",
    marginRight: 10,
  },
  sheetSendBtn: {
    backgroundColor: "#5096F1",
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sheetSendBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  fullViewerBackdrop: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  feedUpdateText: {
    fontWeight: "normal",
    fontSize: 13,
    color: '#6B7280',
  },
  fullViewerUpdateText: {
    fontWeight: "normal",
    fontSize: 13,
    color: "#93C5FD",
  },
  fullViewerHeader: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 15,
    right: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
  },
  fullViewerName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  fullViewerTime: {
    color: "#CCCCCC",
    fontSize: 11,
  },
  fullViewerHeaderActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullViewerHeaderActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  fullViewerOptionsDropdown: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 105 : 85,
    right: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 5,
    width: 150,
    zIndex: 1001,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  fullViewerImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  fullViewerImage: {
    width: "100%",
    height: "100%",
  },
  fullViewerFooter: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? 40 : 25,
    left: 15,
    right: 15,
    zIndex: 100,
  },
  fullViewerContentText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 3
  },
  fullViewerInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.15)",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 12,
  },
  fullViewerInfoReactionsText: {
    fontSize: 12,
    color: "#DDDDDD",
    fontWeight: "500",
  },
  fullViewerInfoCommentsText: {
    fontSize: 12,
    color: "#DDDDDD",
    fontWeight: "500",
  },
  fullViewerActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 10,
  },
  fullViewerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    flex: 1,
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  fullViewerActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});