import { 
  Pressable, 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  FlatList, 
  ActivityIndicator, 
  Dimensions, 
  TextInput, 
  RefreshControl,
  Alert
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import Preloader from '../../components/Preloader';
import { StatusBar } from 'expo-status-bar';
import Back from '../../assets/vectors/back.svg';
import TYPOGRAPHY from "../../constants/typography";
import ThreeDots from '../../assets/vectors/Vertical3Dots.svg';
import Search from "../../assets/vectors/search.svg";
import COLORS from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { auth } from '../../config/firebase';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { acceptConnectionInDB } from '../../utils/connectionHelpers';

const { width } = Dimensions.get('window');
const cardWidth = (width - 40 - 15) / 2;

const AddFriends = () => {
  const [users, setUsers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [connectedIds, setConnectedIds] = useState([]);
  const [mySentRequestIds, setMySentRequestIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const { data: connData, error: connError } = await supabase
        .from("connections")
        .select("*")
        .or(`user_id.eq.${user.uid},friend_id.eq.${user.uid}`);

      if (connError) throw connError;

      const activeConnIds = [];
      const incomingPendingIds = [];
      const sentRequestStatus = {};

      if (connData) {
        connData.forEach(conn => {
          if (conn.status === "accepted") {
            const partnerId = conn.user_id === user.uid ? conn.friend_id : conn.user_id;
            activeConnIds.push(partnerId);
          } else if (conn.status === "pending") {
            if (conn.friend_id === user.uid) {
              incomingPendingIds.push(conn.user_id);
            } else if (conn.user_id === user.uid) {
              sentRequestStatus[conn.friend_id] = "pending";
            }
          }
        });
      }

      // 1. Fetch user details for incoming requests explicitly by ID
      let incomingRequestsList = [];
      if (incomingPendingIds.length > 0) {
        const { data: incomingUsers, error: incomingErr } = await supabase
          .from("users")
          .select("id, full_name, username, avatar_url, bio")
          .in("id", incomingPendingIds);

        if (!incomingErr && incomingUsers) {
          incomingRequestsList = incomingUsers;
        }
      }

      // 2. Fetch suggestions excluding connections, incoming requests, and sent requests at the DB level
      const excludeIds = [user.uid, ...activeConnIds, ...incomingPendingIds, ...Object.keys(sentRequestStatus)];
      
      const { data: suggestionsData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, username, avatar_url, bio")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .limit(50);

      if (usersError) throw usersError;

      setIncomingRequests(incomingRequestsList);
      setUsers(suggestionsData || []);
      setConnectedIds(activeConnIds);
      setMySentRequestIds(sentRequestStatus);
    } catch (err) {
      console.error("Error fetching users/connections:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers(users.length === 0);
    }, [users.length])
  );

  useEffect(() => {
    let channel = null;
    const user = auth.currentUser;
    if (user) {
      console.log("[AddFriends Debug] Registering real-time listener...");
      const uniqueChannelName = `add-friends-realtime-changes-${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connections'
          },
          (payload) => {
            console.log("[AddFriends Debug] Realtime payload received:", payload.eventType);
            const record = payload.new || payload.old;
            // For DELETE events, payload.old typically only contains the ID, so we fetch unconditionally.
            // For other events, we verify if it concerns the current user.
            if (payload.eventType === 'DELETE' || (record && (record.friend_id === user.uid || record.user_id === user.uid))) {
              console.log("[AddFriends Debug] Relevant connections change detected. Fetching updated list.");
              fetchUsers(false);
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        console.log("[AddFriends Debug] Unsubscribing real-time listener.");
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers(false);
  };

  const handleAcceptRequest = async (targetUser) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await acceptConnectionInDB(targetUser.id, user.uid);
      setIncomingRequests(prev => prev.filter(r => r.id !== targetUser.id));
      setConnectedIds(prev => [...prev, targetUser.id]);
      setUsers(prev => prev.filter(u => u.id !== targetUser.id));
      Alert.alert("Success", `You are now connected with ${targetUser.full_name}!`);
    } catch (err) {
      console.error("Error accepting request:", err);
      Alert.alert("Error", "Could not accept connection request.");
    }
  };

  const handleDeclineRequest = async (targetUser) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("user_id", targetUser.id)
        .eq("friend_id", user.uid);

      if (!error) {
        setIncomingRequests(prev => prev.filter(r => r.id !== targetUser.id));
      }
    } catch (err) {
      console.error("Error declining request:", err);
    }
  };

  const handleToggleConnection = async (targetUser) => {
    const user = auth.currentUser;
    if (!user) return;

    const requestStatus = mySentRequestIds[targetUser.id];
    try {
      if (requestStatus === 'pending') {
        const { error } = await supabase
          .from("connections")
          .delete()
          .eq("user_id", user.uid)
          .eq("friend_id", targetUser.id);
        
        if (!error) {
          setMySentRequestIds(prev => {
            const copy = { ...prev };
            delete copy[targetUser.id];
            return copy;
          });
        }
      } else {
        const { error } = await supabase
          .from("connections")
          .insert({
            user_id: user.uid,
            friend_id: targetUser.id,
            status: "pending",
          });
        
        if (!error) {
          setMySentRequestIds(prev => ({
            ...prev,
            [targetUser.id]: 'pending'
          }));
          Alert.alert("Request Sent", `Connection request sent to ${targetUser.full_name}!`);
        }
      }
    } catch (err) {
      console.error("Error toggling connection request:", err);
    }
  };

  const filteredUsers = users.filter(item => {
    const fullName = item.full_name?.toLowerCase() || "";
    const username = item.username?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  const renderRequestRow = (item) => {
    return (
      <View key={item.id} style={styles.requestRow}>
        <Pressable 
          onPress={() => router.push({
            pathname: "/(tabs)/profile",
            params: { userId: item.id }
          })}
          style={styles.requestRowInfo}
        >
          <Image
            source={
              item.avatar_url && item.avatar_url.trim() !== ""
                ? { uri: item.avatar_url }
                : require("../../assets/images/default.png")
            }
            style={styles.requestRowAvatar}
          />
          <View style={styles.requestRowTextContainer}>
            <Text style={styles.requestRowName} numberOfLines={1}>{item.full_name || "User"}</Text>
            <Text style={styles.requestRowUsername} numberOfLines={1}>@{item.username}</Text>
          </View>
        </Pressable>
        
        <View style={styles.requestRowActions}>
          <Pressable 
            style={styles.acceptBtnRow}
            onPress={() => handleAcceptRequest(item)}
          >
            <Text style={styles.acceptBtnTextRow}>Accept</Text>
          </Pressable>
          <Pressable 
            style={styles.declineBtnRow}
            onPress={() => handleDeclineRequest(item)}
          >
            <Text style={styles.declineBtnTextRow}>Decline</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderUserCard = ({ item }) => {
    const requestStatus = mySentRequestIds[item.id];
    const isRequested = requestStatus === 'pending';

    return (
      <Pressable 
        style={styles.card}
        onPress={() => router.push({
          pathname: "/(tabs)/profile",
          params: { userId: item.id }
        })}
      >
        <View style={styles.imageContainer}>
          <Image
            source={
              item.avatar_url && item.avatar_url.trim() !== ""
                ? { uri: item.avatar_url }
                : require("../../assets/images/default.png")
            }
            style={styles.cardImage}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.full_name || "User"}
          </Text>
          <Text style={styles.cardUsername} numberOfLines={1}>
            @{item.username || "username"}
          </Text>
        </View>

        <Pressable 
          style={[
            styles.connectBtn, 
            isRequested ? styles.connectedBtn : styles.connectBtnSolid
          ]}
          onPress={() => handleToggleConnection(item)}
        >
          <Text style={[
            styles.connectBtnText, 
            isRequested ? styles.connectedBtnText : styles.connectBtnTextSolid
          ]}>
            {isRequested ? "Requested" : "Connect"}
          </Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerLeft}>
            <Back width={24} height={24} />
            <Text style={styles.headerText}>Discover People</Text>
          </Pressable>
          <Pressable style={styles.threeDots}>
            <ThreeDots width={24} height={24} />
          </Pressable>
        </View>

        <View style={styles.searchBarContainer}>
          <Search width={18} height={18} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or username..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {loading && users.length === 0 && incomingRequests.length === 0 ? (
          <Preloader text="Finding people..." />
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            renderItem={renderUserCard}
            ListHeaderComponent={
              incomingRequests.length > 0 && !searchQuery ? (
                <View style={styles.requestsSection}>
                  <Text style={styles.sectionTitle}>Connection Requests</Text>
                  <View style={styles.requestsListVertical}>
                    {incomingRequests.map(renderRequestRow)}
                  </View>
                  <View style={styles.divider} />
                  <Text style={[styles.sectionTitle, { marginTop: 15 }]}>People You May Know</Text>
                </View>
              ) : null
            }
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
                <Text style={styles.emptyText}>
                  {searchQuery ? "No results found" : "No suggestions found"}
                </Text>
                <Text style={styles.emptySubText}>
                  {searchQuery 
                    ? `We couldn't find anyone matching "${searchQuery}"`
                    : "Check back later for new people to discover!"}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

export default AddFriends;

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
    marginBottom: 15,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerText: {
    fontSize: 22,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#111111',
  },  

  threeDots: {
    padding: 5,
  },

  searchBarContainer: {
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },

  loadingText: {
    marginTop: 12,
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 15,
    color: COLORS.accent,
  },

  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  listContainer: {
    paddingBottom: 100,
  },

  requestsSection: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
    marginBottom: 12,
  },

  requestsListVertical: {
    paddingVertical: 5,
  },

  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  requestRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },

  requestRowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  requestRowTextContainer: {
    marginLeft: 12,
    flex: 1,
  },

  requestRowName: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#111111',
  },

  requestRowUsername: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.secondary,
    marginTop: 1,
  },

  requestRowActions: {
    flexDirection: 'row',
    gap: 8,
  },

  acceptBtnRow: {
    backgroundColor: COLORS.accent,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  acceptBtnTextRow: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  declineBtnRow: {
    backgroundColor: "#F3F4F6",
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  declineBtnTextRow: {
    color: "#4B5563",
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 15,
  },

  card: {
    width: cardWidth,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  imageContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#FAFAFA",
  },

  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: "cover",
  },

  infoContainer: {
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },

  cardName: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
    textAlign: "center",
    marginBottom: 2,
  },

  cardUsername: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.secondary,
    textAlign: "center",
    marginBottom: 6,
  },

  cardBio: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.regular,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 15,
    height: 30, 
  },

  connectBtn: {
    width: "100%",
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  connectBtnSolid: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  connectedBtn: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },

  connectBtnText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  connectBtnTextSolid: {
    color: "#FFFFFF",
  },

  connectedBtnText: {
    color: "#4B5563",
  },

  emptyContainer: {
    paddingVertical: 80,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
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