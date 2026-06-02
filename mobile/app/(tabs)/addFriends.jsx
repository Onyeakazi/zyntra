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
import { StatusBar } from 'expo-status-bar';
import Back from '../../assets/vectors/back.svg';
import TYPOGRAPHY from "../../constants/typography";
import ThreeDots from '../../assets/vectors/Vertical3Dots.svg';
import Search from "../../assets/vectors/search.svg";
import COLORS from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { auth } from '../../config/firebase';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

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

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, username, avatar_url, bio")
        .neq("id", user.uid)
        .limit(50);

      if (usersError) throw usersError;

      const incomingRequestsList = [];
      const suggestionsList = [];

      (usersData || []).forEach(u => {
        if (incomingPendingIds.includes(u.id)) {
          incomingRequestsList.push(u);
        } else if (!activeConnIds.includes(u.id)) {
          suggestionsList.push(u);
        }
      });

      setIncomingRequests(incomingRequestsList);
      setUsers(suggestionsList);
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
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers(false);
  };

  const handleAcceptRequest = async (targetUser) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("user_id", targetUser.id)
        .eq("friend_id", user.uid);

      if (!error) {
        setIncomingRequests(prev => prev.filter(r => r.id !== targetUser.id));
        setConnectedIds(prev => [...prev, targetUser.id]);
        Alert.alert("Success", `You are now connected with ${targetUser.full_name}!`);
      }
    } catch (err) {
      console.error("Error accepting request:", err);
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

  const renderRequestCard = ({ item }) => {
    return (
      <View style={styles.requestCard}>
        <Pressable 
          onPress={() => router.push({
            pathname: "/(tabs)/profile",
            params: { userId: item.id }
          })}
          style={styles.requestCardInfo}
        >
          <Image
            source={
              item.avatar_url && item.avatar_url.trim() !== ""
                ? { uri: item.avatar_url }
                : require("../../assets/images/default.png")
            }
            style={styles.requestAvatar}
          />
          <Text style={styles.requestName} numberOfLines={1}>{item.full_name || "User"}</Text>
          <Text style={styles.requestUsername} numberOfLines={1}>@{item.username}</Text>
        </Pressable>
        
        <View style={styles.requestActions}>
          <Pressable 
            style={styles.acceptBtn}
            onPress={() => handleAcceptRequest(item)}
          >
            <Text style={styles.acceptBtnText}>Accept</Text>
          </Pressable>
          <Pressable 
            style={styles.declineBtn}
            onPress={() => handleDeclineRequest(item)}
          >
            <Text style={styles.declineBtnText}>Decline</Text>
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Finding people...</Text>
          </View>
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
                  <FlatList
                    data={incomingRequests}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.requestsList}
                    renderItem={renderRequestCard}
                  />
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

  requestsList: {
    paddingVertical: 5,
  },

  requestCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  requestCardInfo: {
    alignItems: "center",
    width: "100%",
  },

  requestAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    resizeMode: "cover",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  requestName: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.semiBold,
    color: "#111111",
    textAlign: "center",
  },

  requestUsername: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.regular,
    color: COLORS.secondary,
    textAlign: "center",
    marginBottom: 10,
  },

  requestActions: {
    width: "100%",
    gap: 6,
  },

  acceptBtn: {
    backgroundColor: COLORS.accent,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  acceptBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: TYPOGRAPHY.semiBold,
  },

  declineBtn: {
    backgroundColor: "#F3F4F6",
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  declineBtnText: {
    color: "#4B5563",
    fontSize: 12,
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