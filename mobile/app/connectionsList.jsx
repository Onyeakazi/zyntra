import { 
  Pressable, 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  FlatList, 
  ActivityIndicator, 
  TextInput, 
  RefreshControl,
  Dimensions
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { StatusBar } from 'expo-status-bar';
import Back from '../assets/vectors/back.svg';
import TYPOGRAPHY from "../constants/typography";
import Search from "../assets/vectors/search.svg";
import COLORS from '../constants/colors';
import { supabase } from '../lib/supabase';
import { auth } from '../config/firebase';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';


const ConnectionsList = () => {
  const { t } = useTranslation();
  const { userId, initialTab } = useLocalSearchParams();
  const currentUser = auth.currentUser;
  const targetUserId = userId || currentUser?.uid;

  const [activeTab, setActiveTab] = useState(initialTab || "Followers");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [myConnectedIds, setMyConnectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      if (!targetUserId || !currentUser) return;

      // 1. Fetch followers connections (who connected with targetUser)
      const { data: followerConns, error: fError } = await supabase
        .from("connections")
        .select("user_id")
        .eq("friend_id", targetUserId)
        .eq("status", "accepted");

      if (fError) throw fError;

      // 2. Fetch following connections (who targetUser connected with)
      const { data: followingConns, error: f2Error } = await supabase
        .from("connections")
        .select("friend_id")
        .eq("user_id", targetUserId)
        .eq("status", "accepted");

      if (f2Error) throw f2Error;

      const followerIds = (followerConns || []).map(c => c.user_id);
      const followingIds = (followingConns || []).map(c => c.friend_id);

      // 3. Fetch user details for all unique IDs in one query
      const allUniqueIds = [...new Set([...followerIds, ...followingIds])];
      let usersMap = {};

      if (allUniqueIds.length > 0) {
        const { data: usersData, error: uError } = await supabase
          .from("users")
          .select("id, full_name, username, avatar_url, bio")
          .in("id", allUniqueIds);

        if (uError) throw uError;

        if (usersData) {
          usersData.forEach(u => {
            usersMap[u.id] = u;
          });
        }
      }

      // Map connection IDs to user details (mutual connections are both followers and following)
      const allFriendIds = [...new Set([...followerIds, ...followingIds])];

      const followersList = allFriendIds
        .map(id => usersMap[id])
        .filter(Boolean); // Filters out any users that might not exist in users table

      const followingList = allFriendIds
        .map(id => usersMap[id])
        .filter(Boolean);

      // 4. Fetch current user's connections to display "Connect"/"Connected" correctly
      const { data: myConns } = await supabase
        .from("connections")
        .select("*")
        .or(`user_id.eq.${currentUser.uid},friend_id.eq.${currentUser.uid}`)
        .eq("status", "accepted");

      const myConnIds = [];
      if (myConns) {
        myConns.forEach(c => {
          if (c.user_id === currentUser.uid) {
            myConnIds.push(c.friend_id);
          } else {
            myConnIds.push(c.user_id);
          }
        });
      }

      setFollowers(followersList);
      setFollowing(followingList);
      setMyConnectedIds(myConnIds);
    } catch (err) {
      console.error("Error fetching connections list:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(followers.length === 0 && following.length === 0);
    }, [targetUserId])
  );

  useEffect(() => {
    if (!targetUserId) return;
    console.log("[ConnectionsList Debug] Registering real-time listener...");
    const uniqueChannelName = `connections-list-realtime-${targetUserId}-${Math.random().toString(36).substring(2, 9)}`;
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
          console.log("[ConnectionsList Debug] Connections change detected:", payload.eventType);
          const record = payload.new || payload.old;
          if (payload.eventType === 'DELETE' || (record && (record.friend_id === targetUserId || record.user_id === targetUserId))) {
            fetchData(false);
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[ConnectionsList Debug] Unsubscribing real-time listener.");
      supabase.removeChannel(channel);
    };
  }, [targetUserId]);


  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const handleToggleConnection = async (targetUser) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.uid) return; // Can't connect with yourself

    const isConnected = myConnectedIds.includes(targetUser.id);
    try {
      if (isConnected) {
        // Delete connection
        const { error } = await supabase
          .from("connections")
          .delete()
          .or(`and(user_id.eq.${currentUser.uid},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${currentUser.uid})`);
        
        if (!error) {
          setMyConnectedIds(prev => prev.filter(id => id !== targetUser.id));
        }
      } else {
        // Create connection
        const { error } = await supabase
          .from("connections")
          .insert({
            user_id: currentUser.uid,
            friend_id: targetUser.id,
            status: "accepted",
          });
        
        if (!error) {
          setMyConnectedIds(prev => [...prev, targetUser.id]);
        }
      }
    } catch (err) {
      console.error("Error toggling connection in list:", err);
    }
  };

  const activeList = activeTab === "Followers" ? followers : following;

  const filteredList = activeList.filter(item => {
    const fullName = item.full_name?.toLowerCase() || "";
    const username = item.username?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  const renderUserRow = ({ item }) => {
    const isConnected = myConnectedIds.includes(item.id);
    const isMe = item.id === currentUser?.uid;

    return (
      <View style={styles.userRow}>
        <Pressable 
          style={styles.rowLeft}
          onPress={() => router.push({
            pathname: "/(tabs)/profile",
            params: { userId: item.id }
          })}
        >
          <Image
            source={
              item.avatar_url && item.avatar_url.trim() !== ""
                ? { uri: item.avatar_url }
                : require("../assets/images/default.png")
            }
            style={styles.rowAvatar}
          />
          <View style={styles.rowInfo}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.full_name || "User"}
            </Text>
            <Text style={styles.rowUsername} numberOfLines={1}>
              @{item.username || "username"}
            </Text>
          </View>
        </Pressable>

        {!isMe && (
          <Pressable 
            style={[
              styles.actionBtn, 
              isConnected ? styles.connectedBtn : styles.connectBtn
            ]}
            onPress={() => handleToggleConnection(item)}
          >
            <Text style={[
              styles.actionBtnText, 
              isConnected ? styles.connectedBtnText : styles.connectBtnText
            ]}>
              {isConnected ? t('connections.connected') : t('connections.connect')}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Back width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('settings.network')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.tabsContainer}>
          <Pressable 
            style={[styles.tab, activeTab === "Followers" && styles.activeTab]}
            onPress={() => {
              setActiveTab("Followers");
              setSearchQuery("");
            }}
          >
            <Text style={[styles.tabText, activeTab === "Followers" && styles.activeTabText]}>
              {t('connections.followers')} ({followers.length})
            </Text>
          </Pressable>

          <Pressable 
            style={[styles.tab, activeTab === "Following" && styles.activeTab]}
            onPress={() => {
              setActiveTab("Following");
              setSearchQuery("");
            }}
          >
            <Text style={[styles.tabText, activeTab === "Following" && styles.activeTabText]}>
              {t('connections.following')} ({following.length})
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Search width={18} height={18} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('connections.searchPlaceholder')}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {loading && activeList.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>{t('feed.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={(item) => item.id}
            renderItem={renderUserRow}
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
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>
                  {t('connections.noUsers')}
                </Text>
                <Text style={styles.emptySubText}>
                  {searchQuery 
                    ? t('connections.noUsers') + " \"" + searchQuery + "\""
                    : t('notification.emptySub')}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

export default ConnectionsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },

  backBtn: {
    padding: 5,
  },

  headerTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
  },

  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },

  activeTab: {
    backgroundColor: "#FFFFFF",
    // Subtle shadow for premium depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  tabText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.medium,
    color: "#6B7280",
  },

  activeTabText: {
    color: "#111111",
    fontFamily: TYPOGRAPHY.semiBold,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: "#111111",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
    paddingHorizontal: 20,
  },

  loadingText: {
    marginTop: 12,
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 15,
    color: COLORS.accent,
  },

  listContainer: {
    paddingBottom: 40,
  },

  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 15,
  },

  rowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: "cover",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  rowInfo: {
    flex: 1,
  },

  rowName: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
  },

  rowUsername: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.secondary,
    marginTop: 1,
  },

  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
  },

  connectBtn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  connectedBtn: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },

  actionBtnText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  connectBtnText: {
    color: "#FFFFFF",
  },

  connectedBtnText: {
    color: "#4B5563",
  },

  emptyText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#4B5563",
    textAlign: "center",
  },

  emptySubText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.regular,
    color: "#888",
    textAlign: "center",
    marginTop: 6,
  }
});
