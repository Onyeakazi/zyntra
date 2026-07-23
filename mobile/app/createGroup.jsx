import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { auth } from '../config/firebase';
import ScreenWrapper from '../components/ScreenWrapper';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import { scale, verticalScale, moderateScale } from '../utils/scale';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public'); // 'public' | 'private'
  const [bannerUri, setBannerUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const currentUserId = auth.currentUser?.uid;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setBannerUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picking error:', err);
      Alert.alert('Error', 'Failed to pick an image.');
    }
  };

  const uploadToCloudinary = async (uri) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      let cleanUri = uri;
      try {
        let decoded = decodeURIComponent(cleanUri);
        while (decoded !== cleanUri) {
          cleanUri = decoded;
          decoded = decodeURIComponent(cleanUri);
        }
      } catch (e) {
        // fallback
      }

      formData.append('file', {
        uri: cleanUri,
        type: 'image/jpeg',
        name: 'group-banner.jpg',
      });
      formData.append('upload_preset', 'avatar');

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dcazbfdaw/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      if (!data.secure_url) {
        throw new Error('Cloudinary upload failed: ' + JSON.stringify(data));
      }
      return data.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a group name.');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Authentication Error', 'You must be logged in to create a group.');
      return;
    }

    setLoading(true);
    try {
      let finalBannerUrl = null;

      if (bannerUri) {
        finalBannerUrl = await uploadToCloudinary(bannerUri);
      }

      // 1. Create group entry
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description.trim(),
          privacy: privacy,
          banner_url: finalBannerUrl,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          user_id: currentUserId,
          role: 'admin',
          status: 'approved',
        });

      if (memberError) throw memberError;

      Alert.alert('Success', `Group "${newGroup.name}" created successfully!`);
      
      // Redirect to newly created group details
      router.replace({ pathname: '/groupDetails', params: { groupId: newGroup.id } });
    } catch (err) {
      console.error('Create group failed:', err.message);
      Alert.alert('Error', 'Failed to create group: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Group</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Banner Picker */}
        <Pressable onPress={pickImage} style={styles.bannerPicker}>
          {bannerUri ? (
            <View style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Image source={{ uri: bannerUri }} style={styles.pickedBanner} resizeMode="cover" />
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </View>
            </View>
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="image-outline" size={36} color={COLORS.secondary} />
              <Text style={styles.bannerPlaceholderText}>Choose Group Banner Photo</Text>
              <Text style={styles.bannerPlaceholderSub}>Suggested aspect ratio 16:9</Text>
            </View>
          )}
        </Pressable>

        {/* Form Fields */}
        <View style={styles.form}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            placeholder="e.g. Mobile App Developers Network"
            value={name}
            onChangeText={setName}
            style={styles.textInput}
            placeholderTextColor={COLORS.secondary}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            placeholder="Tell people what your group is about..."
            value={description}
            onChangeText={setDescription}
            style={[styles.textInput, styles.textArea]}
            placeholderTextColor={COLORS.secondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Privacy Settings</Text>
          <View style={styles.privacyOptions}>
            <TouchableOpacity
              onPress={() => setPrivacy('public')}
              style={[styles.privacyCard, privacy === 'public' && styles.privacyCardActive]}
            >
              <Ionicons 
                name="globe-outline" 
                size={22} 
                color={privacy === 'public' ? COLORS.accent : COLORS.secondary} 
              />
              <View style={styles.privacyCardContent}>
                <Text style={[styles.privacyCardTitle, privacy === 'public' && styles.privacyCardTitleActive]}>
                  Public
                </Text>
                <Text style={styles.privacyCardDesc}>
                  Anyone can discover the group, view posts, and join.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPrivacy('private')}
              style={[styles.privacyCard, privacy === 'private' && styles.privacyCardActive]}
            >
              <Ionicons 
                name="lock-closed-outline" 
                size={22} 
                color={privacy === 'private' ? COLORS.accent : COLORS.secondary} 
              />
              <View style={styles.privacyCardContent}>
                <Text style={[styles.privacyCardTitle, privacy === 'private' && styles.privacyCardTitleActive]}>
                  Private
                </Text>
                <Text style={styles.privacyCardDesc}>
                  Only approved members can view posts and group details. Discoverable.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <View style={styles.submitContainer}>
          <Button
            text={loading ? 'Creating Group...' : 'Create Group'}
            action={handleCreateGroup}
            bgColor={COLORS.accent}
            textColor="#FFFFFF"
            loading={loading || uploadingImage}
            disabled={loading || uploadingImage}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = createResponsiveStyleSheet({
  scrollContainer: {
    paddingBottom: 40,
    backgroundColor: COLORS.bg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 20,
    color: COLORS.primary,
  },
  bannerPicker: {
    height: 180,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#ECEFF1',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.secondary,
    overflow: 'hidden',
  },
  pickedBanner: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  bannerPlaceholderText: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: 15,
    color: COLORS.primary,
    marginTop: 10,
  },
  bannerPlaceholderSub: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },
  form: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  label: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 15,
    color: COLORS.primary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  privacyOptions: {
    gap: 12,
    marginTop: 4,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  privacyCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: '#F4FAFF',
  },
  privacyCardContent: {
    flex: 1,
  },
  privacyCardTitle: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 15,
    color: COLORS.primary,
    marginBottom: 4,
  },
  privacyCardTitleActive: {
    color: COLORS.accent,
  },
  privacyCardDesc: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 12,
    color: COLORS.secondary,
    lineHeight: 16,
  },
  submitContainer: {
    marginHorizontal: 16,
    marginTop: 30,
  },
});
