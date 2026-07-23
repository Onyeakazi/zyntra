import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Image, TouchableOpacity, ActivityIndicator, Pressable, RefreshControl, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { auth } from '../config/firebase';
import ScreenWrapper from '../components/ScreenWrapper';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import { scale, verticalScale, moderateScale } from '../utils/scale';
import { Ionicons } from '@expo/vector-icons';

export default function Groups() {
  const [activeTab, setActiveTab] = useState('my-groups'); // 'my-groups' | 'discover'
  const [searchQuery, setSearchQuery] = useState('');
  const [myGroups, setMyGroups] = useState([]);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState(null);

  const currentUserId = auth.currentUser?.uid;

  const fetchGroups = async (showLoader = true) => {
    if (!currentUserId) return;
    if (showLoader) setLoading(true);

    try {
      // 1. Fetch user's groups
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          status,
          groups (
            id,
            name,
            description,
            banner_url,
            privacy,
            created_by
          )
        `)
        .eq('user_id', currentUserId);

      if (memberError) throw memberError;

      const userGroups = (memberData || [])
        .filter(m => m.status === 'approved' && m.groups)
        .map(m => ({
          ...m.groups,
          membershipRole: m.role,
          isMember: true
        }));

      setMyGroups(userGroups);

      // 2. Fetch public groups for discovery
      const { data: allGroups, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          banner_url,
          privacy,
          created_by,
          group_members (
            user_id,
            status
          )
        `)
        .eq('privacy', 'public')
        .limit(50);

      if (groupsError) throw groupsError;

      const userJoinedSet = new Set(userGroups.map(g => g.id));

      const discoverable = (allGroups || []).map(g => {
        const membership = g.group_members?.find(m => m.user_id === currentUserId);
        return {
          id: g.id,
          name: g.name,
          description: g.description,
          banner_url: g.banner_url,
          privacy: g.privacy,
          created_by: g.created_by,
          memberCount: g.group_members?.filter(m => m.status === 'approved').length || 0,
          isMember: userJoinedSet.has(g.id),
          isPending: membership?.status === 'pending'
        };
      });

      setDiscoverGroups(discoverable);
    } catch (err) {
      console.error('Error fetching groups:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGroups(false);
  };

  const handleJoinGroup = async (group) => {
    if (!currentUserId || joiningGroupId) return;
    setJoiningGroupId(group.id);

    try {
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
        alert('Request to join submitted!');
      } else {
        alert(`Successfully joined ${group.name}!`);
      }

      fetchGroups(false);
    } catch (err) {
      console.error('Join group error:', err.message);
      alert('Failed to join group.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  // Filter lists based on Search input
  const filteredMyGroups = myGroups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDiscoverGroups = discoverGroups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupCard = ({ item }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/groupDetails', params: { groupId: item.id } })}
        style={styles.card}
      >
        <Image
          source={item.banner_url ? { uri: item.banner_url } : require('../assets/images/story.png')}
          style={styles.cardBanner}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.privacyBadge, { backgroundColor: item.privacy === 'public' ? '#E8F5E9' : '#ECEFF1' }]}>
              <Text style={[styles.privacyText, { color: item.privacy === 'public' ? '#2E7D32' : '#374151' }]}>
                {item.privacy.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description || 'No description provided.'}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.memberCount}>
              <Ionicons name="people-outline" size={14} color={COLORS.secondary} />
              {' '}{item.memberCount || 1} {item.memberCount === 1 ? 'member' : 'members'}
            </Text>

            {!item.isMember && activeTab === 'discover' && (
              <TouchableOpacity
                disabled={item.isPending || joiningGroupId === item.id}
                onPress={() => handleJoinGroup(item)}
                style={[styles.joinBtn, item.isPending ? styles.pendingBtn : styles.joinBtnActive]}
              >
                {joiningGroupId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.joinBtnText, item.isPending ? styles.pendingBtnText : styles.joinBtnTextActive]}>
                    {item.isPending ? 'Requested' : 'Join'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            
            {item.isMember && activeTab === 'discover' && (
              <View style={styles.joinedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                <Text style={styles.joinedBadgeText}>Joined</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Groups</Text>
          <TouchableOpacity 
            onPress={() => router.push('/createGroup')} 
            style={styles.createBtn}
          >
            <Ionicons name="add-outline" size={24} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.secondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search groups..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor={COLORS.secondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Selector */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('my-groups')}
            style={[styles.tab, activeTab === 'my-groups' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'my-groups' && styles.activeTabText]}>My Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('discover')}
            style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>Discover</Text>
          </TouchableOpacity>
        </View>

        {/* List Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            data={activeTab === 'my-groups' ? filteredMyGroups : filteredDiscoverGroups}
            keyExtractor={(item) => item.id}
            renderItem={renderGroupCard}
            contentContainerStyle={styles.listContainer}
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
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={60} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'my-groups' ? 'No groups yet' : 'No public groups found'}
                </Text>
                <Text style={styles.emptySub}>
                  {activeTab === 'my-groups' 
                    ? 'Create a group or discover public groups to start networking.'
                    : 'Check back later or try creating a new group.'}
                </Text>
                {activeTab === 'my-groups' && (
                  <TouchableOpacity
                    onPress={() => router.push('/createGroup')}
                    style={styles.emptyCreateBtn}
                  >
                    <Text style={styles.emptyCreateBtnText}>Create Group</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
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
  createBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 15,
    color: COLORS.primary,
    height: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 15,
    color: COLORS.secondary,
  },
  activeTabText: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.bold,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBanner: {
    width: '100%',
    height: 100,
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardName: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 17,
    color: COLORS.primary,
    flex: 1,
    marginRight: 10,
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
  cardDesc: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 13,
    color: COLORS.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  memberCount: {
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 13,
    color: COLORS.secondary,
  },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnActive: {
    backgroundColor: COLORS.accent,
  },
  pendingBtn: {
    backgroundColor: '#E5E7EB',
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
  },
  joinBtnText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
  },
  joinBtnTextActive: {
    color: '#FFFFFF',
  },
  pendingBtnText: {
    color: '#6B7280',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinedBadgeText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
    color: COLORS.accent,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: 18,
    color: COLORS.primary,
    marginTop: 16,
  },
  emptySub: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyCreateBtn: {
    marginTop: 20,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: 14,
  },
});
