import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Pressable, RefreshControl, Modal, TextInput, Platform, Alert, Dimensions, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { auth } from '../config/firebase';
import ScreenWrapper from '../components/ScreenWrapper';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import { scale, verticalScale, moderateScale } from '../utils/scale';
import { Ionicons } from '@expo/vector-icons';
import Feed from '../components/Feed';
import { formatPostTime } from '../utils/timeFormat';
import * as ImagePicker from 'expo-image-picker';

export default function GroupDetails() {
  const { groupId } = useLocalSearchParams();

  const [group, setGroup] = useState(null);
  const [membership, setMembership] = useState(null); // null (not member), 'member', 'admin', 'moderator', 'pending'
  const [memberCount, setMemberCount] = useState(1);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Post Creation States
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [selectedMediaUri, setSelectedMediaUri] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState(null); // 'image' | 'video'
  const [postingLoading, setPostingLoading] = useState(false);

  const [activeViewablePostId, setActiveViewablePostId] = useState(null);

  const currentUserId = auth.currentUser?.uid;

  const fetchGroupDetails = async () => {
    if (!groupId) return;

    try {
      // 1. Fetch group metadata
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // 2. Fetch user membership status
      if (currentUserId) {
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupId)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (!memberError && memberData) {
          setMembership(memberData.status === 'approved' ? memberData.role : 'pending');
        } else {
          setMembership(null);
        }
      }

      // 3. Fetch member count
      const { count, error: countError } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'approved');

      if (!countError) {
        setMemberCount(count || 1);
      }
    } catch (err) {
      console.error('Error fetching group details:', err.message);
      Alert.alert('Error', 'Failed to load group details.');
    }
  };

  const fetchGroupPosts = async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url,
            username
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
              username
            )
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFeeds = (data || []).map((post) => ({
        id: post.id.toString(),
        author_id: post.user_id,
        user: {
          name: post.user?.full_name || 'User',
          username: post.user?.username || 'username',
          profilePic: post.user?.avatar_url && post.user.avatar_url.trim() !== ''
            ? { uri: post.user.avatar_url }
            : require('../assets/images/default.png'),
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
            name: post.original_post.user?.full_name || 'User',
            username: post.original_post.user?.username || 'username',
            profilePic: post.original_post.user?.avatar_url && post.original_post.user.avatar_url.trim() !== ''
              ? { uri: post.original_post.user.avatar_url }
              : require('../assets/images/default.png'),
          }
        } : null,
        likes: '0',
        comments: '0',
      }));

      setPosts(formattedFeeds);
    } catch (err) {
      console.error('Error fetching group posts:', err.message);
    }
  };

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    await Promise.all([fetchGroupDetails(), fetchGroupPosts()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handleJoinOrLeave = async () => {
    if (!currentUserId || !group || actionLoading) return;
    setActionLoading(true);

    try {
      if (membership && membership !== 'pending') {
        // LEAVE GROUP
        Alert.alert(
          'Leave Group',
          `Are you sure you want to leave ${group.name}?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setActionLoading(false) },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase
                  .from('group_members')
                  .delete()
                  .eq('group_id', group.id)
                  .eq('user_id', currentUserId);

                if (error) throw error;
                Alert.alert('Left Group', `You have left ${group.name}.`);
                fetchGroupDetails();
                setActionLoading(false);
              }
            }
          ]
        );
      } else if (membership === 'pending') {
        // CANCEL JOIN REQUEST
        const { error } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', group.id)
          .eq('user_id', currentUserId);

        if (error) throw error;
        Alert.alert('Request Cancelled', 'Your request to join has been cancelled.');
        fetchGroupDetails();
        setActionLoading(false);
      } else {
        // JOIN GROUP
        const isPrivate = group.privacy === 'private';
        const status = isPrivate ? 'pending' : 'approved';

        const { error } = await supabase
          .from('group_members')
          .insert({
            group_id: group.id,
            user_id: currentUserId,
            role: 'member',
            status: status
          });

        if (error) throw error;
        if (isPrivate) {
          Alert.alert('Request Submitted', 'This group is private. Your request is pending approval.');
        } else {
          Alert.alert('Joined Group', `You are now a member of ${group.name}!`);
        }
        fetchGroupDetails();
        setActionLoading(false);
      }
    } catch (err) {
      console.error('Group action failed:', err.message);
      Alert.alert('Error', 'Action failed. Please try again.');
      setActionLoading(false);
    }
  };

  // Media attachment picker
  const pickMedia = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedMediaUri(result.assets[0].uri);
        setSelectedMediaType(type);
      }
    } catch (err) {
      console.error('Media pick error:', err);
    }
  };

  const uploadMediaToCloudinary = async (uri, type) => {
    const resourceType = type === 'video' ? 'video' : 'image';
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

    const extension = cleanUri.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
    const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
    
    formData.append('file', {
      uri: cleanUri,
      type: mimeType,
      name: `upload.${extension}`,
    });
    formData.append('upload_preset', 'avatar');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dcazbfdaw/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error(data.error?.message || 'Upload failed');
    }
    return data.secure_url;
  };

  const handlePostSubmit = async () => {
    if (!postText.trim() && !selectedMediaUri) {
      Alert.alert('Composer Empty', 'Please write something or attach media.');
      return;
    }

    setPostingLoading(true);
    try {
      let finalMediaUrl = null;
      
      if (selectedMediaUri) {
        finalMediaUrl = await uploadMediaToCloudinary(selectedMediaUri, selectedMediaType);
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUserId,
          content: postText.trim(),
          media_url: finalMediaUrl,
          media_type: selectedMediaType || null,
          group_id: groupId,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('Success', 'Posted to group feed!');
      setPostModalVisible(false);
      setPostText('');
      setSelectedMediaUri(null);
      setSelectedMediaType(null);
      fetchGroupPosts();
    } catch (err) {
      console.error('Group posting failed:', err.message);
      Alert.alert('Error', 'Failed to publish post: ' + err.message);
    } finally {
      setPostingLoading(false);
    }
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveViewablePostId(viewableItems[0].item.id);
    }
  }).current;

  const renderHeader = () => {
    if (!group) return null;
    const isMember = membership && membership !== 'pending';

    return (
      <View style={styles.headerContainer}>
        {/* Banner */}
        <Image
          source={group.banner_url ? { uri: group.banner_url } : require('../assets/images/story.png')}
          style={styles.banner}
          resizeMode="cover"
        />
        
        {/* Group Details Card */}
        <View style={styles.metaContainer}>
          <Text style={styles.groupName}>{group.name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.privacyBadge, { backgroundColor: group.privacy === 'public' ? '#E8F5E9' : '#ECEFF1' }]}>
              <Text style={[styles.privacyText, { color: group.privacy === 'public' ? '#2E7D32' : '#374151' }]}>
                {group.privacy.toUpperCase()} GROUP
              </Text>
            </View>
            <Text style={styles.metaText}>{memberCount} {memberCount === 1 ? 'member' : 'members'}</Text>
          </View>

          <Text style={styles.groupDesc}>{group.description || 'No description provided.'}</Text>

          {/* Join/Leave Button */}
          <TouchableOpacity
            disabled={actionLoading}
            onPress={handleJoinOrLeave}
            style={[
              styles.actionBtn,
              isMember ? styles.leaveBtn : styles.joinBtn,
              membership === 'pending' && styles.pendingBtn
            ]}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={isMember ? '#111' : '#fff'} />
            ) : (
              <Text style={[styles.actionBtnText, isMember ? styles.leaveBtnText : styles.joinBtnText]}>
                {membership === 'admin' 
                  ? 'Admin (Joined)' 
                  : membership === 'moderator' 
                    ? 'Moderator (Joined)' 
                    : membership === 'member' 
                      ? 'Joined' 
                      : membership === 'pending' 
                        ? 'Requested' 
                        : 'Join Group'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Member-Only Composer Entry */}
        {isMember ? (
          <Pressable onPress={() => setPostModalVisible(true)} style={styles.composerHeader}>
            <Image
              source={require('../assets/images/prof.jpeg')} // Default avatar or custom if user loaded
              style={fixedGroupStyles.composerAvatar}
            />
            <View style={styles.composerPlaceholder}>
              <Text style={styles.composerPlaceholderText}>Share something with this group...</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.memberOnlyWarning}>
            <Ionicons name="lock-closed" size={18} color={COLORS.secondary} />
            <Text style={styles.memberOnlyWarningText}>
              {group.privacy === 'private'
                ? 'This group is private. Join to view posts and participate.'
                : 'Join this group to post messages and participate.'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </ScreenWrapper>
    );
  }

  const isVisibleFeed = group && (group.privacy === 'public' || (membership && membership !== 'pending'));

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>{group?.name || 'Group'}</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Feed List */}
        <FlatList
          data={isVisibleFeed ? posts : []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 15 }}>
              <Feed
                item={item}
                activePostId={activeViewablePostId}
                onShareToStory={() => {}}
              />
            </View>
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.accent]}
              tintColor={COLORS.accent}
            />
          }
          ListEmptyComponent={
            isVisibleFeed && (
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyText}>No posts yet</Text>
                <Text style={styles.emptySub}>Start the discussion by creating the first post.</Text>
              </View>
            )
          }
        />

        {/* COMPOSER POST MODAL */}
        <Modal
          visible={postModalVisible}
          animationType="slide"
          onRequestClose={() => setPostModalVisible(false)}
        >
          <ScreenWrapper>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={{ flex: 1 }}
            >
              <View style={styles.composerModalContainer}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setPostModalVisible(false)} style={styles.modalCloseBtn}>
                    <Text style={styles.modalCloseText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>New Group Post</Text>
                  <TouchableOpacity 
                    onPress={handlePostSubmit} 
                    disabled={postingLoading || (!postText.trim() && !selectedMediaUri)}
                    style={[
                      styles.modalPostBtn, 
                      (postingLoading || (!postText.trim() && !selectedMediaUri)) && { opacity: 0.5 }
                    ]}
                  >
                    {postingLoading ? (
                      <ActivityIndicator size="small" color={COLORS.accent} />
                    ) : (
                      <Text style={styles.modalPostBtnText}>Post</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Text Composer */}
                <ScrollView contentContainerStyle={styles.composerBody}>
                  <TextInput
                    placeholder="What would you like to share?"
                    placeholderTextColor={COLORS.secondary}
                    value={postText}
                    onChangeText={setPostText}
                    style={styles.composerInput}
                    multiline
                    autoFocus
                  />

                  {/* Attachment Preview */}
                  {selectedMediaUri && (
                    <View style={styles.attachmentPreviewContainer}>
                      {selectedMediaType === 'image' ? (
                        <Image source={{ uri: selectedMediaUri }} style={styles.attachedImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.attachedVideoPlaceholder}>
                          <Ionicons name="videocam" size={48} color="#FFF" />
                          <Text style={styles.attachedVideoText}>Video Attached</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        onPress={() => { setSelectedMediaUri(null); setSelectedMediaType(null); }} 
                        style={styles.removeAttachmentBtn}
                      >
                        <Ionicons name="close-circle" size={24} color="red" />
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>

                {/* Keyboard Toolbar / Footer actions */}
                <View style={styles.composerToolbar}>
                  <Text style={styles.toolbarLabel}>Add to your post:</Text>
                  <View style={styles.toolbarActions}>
                    <TouchableOpacity onPress={() => pickMedia('image')} style={styles.toolbarBtn}>
                      <Ionicons name="image-outline" size={24} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => pickMedia('video')} style={styles.toolbarBtn}>
                      <Ionicons name="videocam-outline" size={24} color="#E91E63" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </ScreenWrapper>
        </Modal>
      </View>
    </ScreenWrapper>
  );
}

const styles = createResponsiveStyleSheet({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.bg,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
  },
  navTitle: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 18,
    color: COLORS.primary,
    maxWidth: '70%',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 10,
  },
  banner: {
    width: '100%',
    height: 150,
  },
  metaContainer: {
    padding: 16,
  },
  groupName: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 22,
    color: COLORS.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  privacyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  privacyText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.bold,
  },
  metaText: {
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 13,
    color: COLORS.secondary,
  },
  groupDesc: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 14,
    color: COLORS.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  joinBtn: {
    backgroundColor: COLORS.accent,
  },
  leaveBtn: {
    backgroundColor: '#ECEFF1',
    borderWidth: 1,
    borderColor: '#CFD8DC',
  },
  pendingBtn: {
    backgroundColor: '#ECEFF1',
    borderWidth: 1,
    borderColor: '#CFD8DC',
  },
  actionBtnText: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 15,
  },
  joinBtnText: {
    color: '#FFFFFF',
  },
  leaveBtnText: {
    color: COLORS.primary,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },

  composerPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  composerPlaceholderText: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 14,
    color: COLORS.secondary,
  },
  memberOnlyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  memberOnlyWarningText: {
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 13,
    color: COLORS.secondary,
    textAlign: 'center',
  },
  feedContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 13,
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 6,
  },
  composerModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseBtn: {
    paddingVertical: 4,
  },
  modalCloseText: {
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 15,
    color: COLORS.secondary,
  },
  modalTitle: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 17,
    color: COLORS.primary,
  },
  modalPostBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#ECF5FF',
    borderRadius: 14,
  },
  modalPostBtnText: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 14,
    color: COLORS.accent,
  },
  composerBody: {
    flexGrow: 1,
    padding: 16,
  },
  composerInput: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 16,
    color: COLORS.primary,
    lineHeight: 22,
    minHeight: 150,
  },
  attachmentPreviewContainer: {
    position: 'relative',
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachedImage: {
    width: '100%',
    height: 200,
  },
  attachedVideoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  attachedVideoText: {
    color: '#FFF',
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 14,
  },
  removeAttachmentBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  composerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  toolbarLabel: {
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 14,
    color: COLORS.secondary,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 16,
  },
  toolbarBtn: {
    padding: 4,
  },
});

const fixedGroupStyles = StyleSheet.create({
  composerAvatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    resizeMode: 'cover',
  },
});
