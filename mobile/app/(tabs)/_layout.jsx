import { Stack, Tabs, useSegments } from "expo-router";
import House from "../../assets/vectors/House.svg";
import AddUser from "../../assets/vectors/addUser.svg";
import Message from "../../assets/vectors/send.svg";
import Notification from "../../assets/vectors/notification.svg";
import Profile from "../../assets/vectors/profileImg.svg";
import COLORS from "../../constants/colors";
import { Image, View, DeviceEventEmitter } from "react-native";
import { supabase } from "../../lib/supabase";
import { useEffect, useState, useRef } from "react";
import { auth } from "../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import TYPOGRAPHY from "../../constants/typography";
import Svg, { Path, Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabLayout = () => {
    const insets = useSafeAreaInsets();
    const [avatar, setAvatar] = useState(null);
    const [requestCount, setRequestCount] = useState(0);
    const [isBadgeCleared, setIsBadgeCleared] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [isNotifBadgeCleared, setIsNotifBadgeCleared] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [isMessageBadgeCleared, setIsMessageBadgeCleared] = useState(false);

    const segments = useSegments();
    const isMessageTabFocused = segments.includes('message');
    const isAddFriendsTabFocused = segments.includes('addFriends');
    const isNotifTabFocused = segments.includes('notification');

    // Keep a ref so async/closure callbacks can read the latest focused state
    const isMessageTabFocusedRef = useRef(isMessageTabFocused);
    useEffect(() => {
        isMessageTabFocusedRef.current = isMessageTabFocused;
    }, [isMessageTabFocused]);

    // When entering the message tab, mark badges as cleared.
    // We do NOT reset to false on tab leave — only new incoming events do that.
    useEffect(() => {
        if (isMessageTabFocused) {
            setIsMessageBadgeCleared(true);
            setUnreadMessagesCount(0);
        }
    }, [isMessageTabFocused]);

    useEffect(() => {
        if (isAddFriendsTabFocused) {
            setIsBadgeCleared(true);
        }
    }, [isAddFriendsTabFocused]);

    useEffect(() => {
        if (isNotifTabFocused) {
            setIsNotifBadgeCleared(true);
        }
    }, [isNotifTabFocused]);
    const fetchRequestCount = async (user) => {
        if (!user) return;
        console.log("[Badge Debug] Fetching connection requests for:", user.uid);
        const { data, error } = await supabase
            .from("connections")
            .select("id")
            .eq("friend_id", user.uid)
            .eq("status", "pending");

        if (error) {
            console.error("[Badge Debug] Error fetching requests:", error.message);
        } else {
            const count = data?.length || 0;
            console.log("[Badge Debug] Found requests count:", count);
            setRequestCount(count);
        }
    };

    const fetchNotificationCount = async (user) => {
        if (!user) return;
        console.log("[Badge Debug] Fetching unread notifications for:", user.uid);
        const { data, error } = await supabase
            .from("notifications")
            .select("id")
            .eq("receiver_id", user.uid)
            .eq("is_read", false);

        if (error) {
            console.error("[Badge Debug] Error fetching notifications:", error.message);
        } else {
            const count = data?.length || 0;
            console.log("[Badge Debug] Found unread notifications count:", count);
            setNotificationCount(count);
        }
    };

    const fetchUnreadMessagesCount = async (user) => {
        if (!user) return;
        console.log("[Badge Debug] Fetching unread messages count for:", user.uid);
        const { data, error } = await supabase
            .from("messages")
            .select("id, conversations!inner(user_1, user_2)")
            .neq("sender_id", user.uid)
            .eq("is_read", false)
            .or(`user_1.eq.${user.uid},user_2.eq.${user.uid}`, { foreignTable: 'conversations' });

        if (error) {
            console.error("[Badge Debug] Error fetching unread messages:", error.message);
        } else {
            const count = data?.length || 0;
            console.log("[Badge Debug] Found unread messages count:", count);
            setUnreadMessagesCount(count);
        }
    };

    const fetchAvatar = async (user) => {
        if (!user) return;
        const { data, error } = await supabase.from("users")
            .select("avatar_url")
            .eq("id", user.uid)
            .single();

        if (!error && data?.avatar_url) {
            setAvatar(data.avatar_url);
        }
    };

    useEffect(() => {
        let channel = null;
        let presenceChannel = null;
        let statusUpdateSub = null;
        let privacySub = null;
        let userInboxChannel = null;
        let activeUserId = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            console.log("[Badge Debug] onAuthStateChanged fired! User logged in:", !!user);
            if (user) {
                if (activeUserId === user.uid) {
                    console.log("[Badge Debug] User already initialized:", user.uid);
                    return;
                }
                activeUserId = user.uid;

                fetchAvatar(user);
                fetchRequestCount(user);
                fetchNotificationCount(user);
                fetchUnreadMessagesCount(user);

                if (channel) {
                    await supabase.removeChannel(channel);
                    channel = null;
                }
                if (presenceChannel) {
                    await supabase.removeChannel(presenceChannel);
                    presenceChannel = null;
                }
                if (userInboxChannel) {
                    await supabase.removeChannel(userInboxChannel);
                    userInboxChannel = null;
                }

                // Register global online presence
                presenceChannel = supabase.channel('online-users', {
                    config: {
                        presence: {
                            key: user.uid,
                        },
                    },
                });

                presenceChannel
                    .on('presence', { event: 'sync' }, () => {
                        const state = presenceChannel.presenceState();
                        global.latestPresenceState = state;
                        DeviceEventEmitter.emit('presence_sync', state);
                    })
                    .subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            let savedNote = "";
                            try {
                                savedNote = await AsyncStorage.getItem(`status_note_${user.uid}`) || "";
                            } catch (err) {
                                console.error("Error reading saved status note:", err);
                            }
                            
                            const showActive = await AsyncStorage.getItem('privacy_active_status');
                            await presenceChannel.track({
                                user_id: user.uid,
                                online_at: new Date().toISOString(),
                                status_note: savedNote,
                                hide_active: showActive === 'false',
                            });
                        }
                    });

                // Listen for local updates to status note (e.g. from messages tab)
                if (statusUpdateSub) statusUpdateSub.remove();
                statusUpdateSub = DeviceEventEmitter.addListener('update_status_note', async (newNote) => {
                    if (presenceChannel) {
                        try {
                            const showActive = await AsyncStorage.getItem('privacy_active_status');
                            await presenceChannel.track({
                                user_id: user.uid,
                                online_at: new Date().toISOString(),
                                status_note: newNote,
                                hide_active: showActive === 'false',
                            });
                        } catch (err) {
                            console.error("Error tracking status note update:", err);
                        }
                    }
                });

                // Listen for local privacy settings changes
                if (privacySub) privacySub.remove();
                privacySub = DeviceEventEmitter.addListener('privacy_settings_changed', async () => {
                    const showActive = await AsyncStorage.getItem('privacy_active_status');
                    if (presenceChannel) {
                        try {
                            let savedNote = await AsyncStorage.getItem(`status_note_${user.uid}`) || "";
                            await presenceChannel.track({
                                user_id: user.uid,
                                online_at: new Date().toISOString(),
                                status_note: savedNote,
                                hide_active: showActive === 'false',
                            });
                        } catch (err) {
                            console.error("Error updating presence track based on privacy settings:", err);
                        }
                    }
                });

                // Subscribe to personal inbox broadcasts (to sync unread badges instantly)
                const userInboxChannelName = `user-inbox-${user.uid}`;
                userInboxChannel = supabase
                    .channel(userInboxChannelName)
                    .on(
                        'broadcast',
                        { event: 'new_message' },
                        (payload) => {
                            console.log("[Broadcast Debug] Global user-inbox broadcast received in layout:", payload);
                            // Only bump badge if user is NOT already on the messages tab
                            if (!isMessageTabFocusedRef.current) {
                                fetchUnreadMessagesCount(user);
                                setIsMessageBadgeCleared(false);
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log(`[Broadcast Debug] user-inbox subscription status: ${status}`);
                    });

                // Listen for connections and notifications updates in real-time
                console.log("[Badge Debug] Registering Supabase Realtime channel...");
                const uniqueChannelName = `connections-badge-changes-${Math.random().toString(36).substring(2, 9)}`;
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
                            console.log("[Badge Debug] Realtime payload received:", payload.eventType);
                            const record = payload.new || payload.old;
                            
                            if (payload.eventType === 'DELETE') {
                                console.log("[Badge Debug] DELETE event received. Refreshing request count.");
                                fetchRequestCount(user);
                            } else if (record && (record.friend_id === user.uid || record.user_id === user.uid)) {
                                fetchRequestCount(user);
                                
                                if (payload.eventType === 'INSERT' && payload.new.friend_id === user.uid && payload.new.status === 'pending') {
                                    console.log("[Badge Debug] New request received! Showing badge.");
                                    setIsBadgeCleared(false);
                                }
                            }
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'notifications',
                            filter: `receiver_id=eq.${user.uid}`
                        },
                        (payload) => {
                            console.log("[Badge Debug] Notification Realtime payload received:", payload.eventType);
                            fetchNotificationCount(user);
                            if (payload.eventType === 'INSERT' && !payload.new.is_read) {
                                console.log("[Badge Debug] New unread notification received! Showing badge.");
                                setIsNotifBadgeCleared(false);
                            }
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'messages'
                        },
                        (payload) => {
                            console.log("[Badge Debug] Message Realtime payload received:", payload.eventType);
                            if (!isMessageTabFocusedRef.current) {
                                fetchUnreadMessagesCount(user);
                                setIsMessageBadgeCleared(false);
                            }
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'conversations'
                        },
                        (payload) => {
                            console.log("[Badge Debug] Conversation Realtime payload received:", payload.eventType);
                            if (!isMessageTabFocusedRef.current) {
                                fetchUnreadMessagesCount(user);
                                setIsMessageBadgeCleared(false);
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log("[Badge Debug] Realtime channel status changed to:", status);
                    });
            } else {
                activeUserId = null;
                setAvatar(null);
                setRequestCount(0);
                setNotificationCount(0);
                setUnreadMessagesCount(0);
                if (channel) {
                    await supabase.removeChannel(channel);
                    channel = null;
                }
                if (presenceChannel) {
                    await supabase.removeChannel(presenceChannel);
                    presenceChannel = null;
                }
                if (statusUpdateSub) {
                    statusUpdateSub.remove();
                    statusUpdateSub = null;
                }
                if (privacySub) {
                    privacySub.remove();
                    privacySub = null;
                }
                if (userInboxChannel) {
                    await supabase.removeChannel(userInboxChannel);
                    userInboxChannel = null;
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (channel) {
                supabase.removeChannel(channel);
            }
            if (presenceChannel) {
                supabase.removeChannel(presenceChannel);
            }
            if (statusUpdateSub) {
                statusUpdateSub.remove();
            }
            if (privacySub) {
                privacySub.remove();
            }
            if (userInboxChannel) {
                supabase.removeChannel(userInboxChannel);
            }
        };
    }, []);

  return (
    
    <Tabs
        screenOptions={{
            tabBarShowLabel: false,
            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.secondary,

            tabBarStyle: {
                backgroundColor: COLORS.bg,
                height: 60 + insets.bottom,
                paddingTop: 10,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            },

        }}
    >
        <Tabs.Screen 
            name="index"
            options={{
                title: "Home",
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                    <View
                        style={{
                            backgroundColor: focused ? "#ECF8FF" : "transparent",
                            padding: 10,
                            borderRadius: 10,
                        }}
                    >
                        {focused ? (
                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                <Path d="M12 2.09961L1 12H4V22H10V16H14V22H20V12H23L12 2.09961Z" fill="#5096F1" />
                            </Svg>
                        ) : (
                            <House
                                width={24}
                                height={24}
                                color={COLORS.secondary}
                            />
                        )}
                    </View>
                )
            }}
        />

        <Tabs.Screen 
            name="addFriends"
            options={{
                title: "Add",
                headerShown: false,
                tabBarBadge: (!isBadgeCleared && requestCount > 0) ? (requestCount > 10 ? '10+' : requestCount) : undefined,
                tabBarBadgeStyle: {
                    backgroundColor: '#FF3B30',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontFamily: TYPOGRAPHY.bold,
                    lineHeight: 14,
                },
                tabBarIcon: ({focused}) => (
                    <View
                        style={{
                            backgroundColor: focused ? "#ECF8FF" : "transparent",
                            padding: 10,
                            borderRadius: 10,
                        }}
                    >
                        {focused ? (
                            <Svg width={24} height={24} viewBox="0 0 23 17" fill="none">
                                <Circle cx={8.6} cy={6.3} r={3.8} fill="#5096F1" />
                                <Path d="M8.6 12.7C4.5 12.7 0 14.5 0 16.5H17.2C17.2 14.5 12.7 12.7 8.6 12.7Z" fill="#5096F1" />
                                <Path d="M18.75 6.75h1.5v3h3v1.5h-3v3h-1.5v-3h-3V9.75h3v-3z" fill="#5096F1" />
                            </Svg>
                        ) : (
                            <AddUser
                                width={24}
                                height={24}
                                color={COLORS.secondary}
                            />
                        )}
                    </View>
                )
            }}
            listeners={({ navigation }) => ({
                tabPress: () => {
                    setIsBadgeCleared(true);
                },
            })}
        />

        <Tabs.Screen 
            name="message"
            options={{
                title: "Message",
                headerShown: false,
                tabBarBadge: (!isMessageBadgeCleared && unreadMessagesCount > 0) ? (unreadMessagesCount > 10 ? '10+' : unreadMessagesCount) : undefined,
                tabBarBadgeStyle: {
                    backgroundColor: '#FF3B30',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontFamily: TYPOGRAPHY.bold,
                    lineHeight: 14,
                },
                tabBarIcon: ({focused}) => (
                    <View
                        style={{
                            backgroundColor: focused ? "#ECF8FF" : "transparent",
                            padding: 10,
                            borderRadius: 10,
                        }}
                    >
                        {focused ? (
                            <Svg width={24} height={24} viewBox="0 0 21 21" fill="none">
                                <Path d="M21 0 L0 7 L9 12 Z" fill="#5096F1" />
                                <Path d="M21 0 L9 12 L14 21 Z" fill="#5096F1" opacity={0.85} />
                            </Svg>
                        ) : (
                            <Message
                                width={24}
                                height={24}
                                color={COLORS.secondary}
                            />
                        )}
                    </View> 
                )
            }}
            listeners={({ navigation }) => ({
                tabPress: () => {
                    setIsMessageBadgeCleared(true);
                    setUnreadMessagesCount(0);
                },
            })}
        />

        <Tabs.Screen 
            name="notification"
            options={{
                title: "Notification",
                headerShown: false,
                tabBarBadge: (!isNotifBadgeCleared && notificationCount > 0) ? (notificationCount > 10 ? '10+' : notificationCount) : undefined,
                tabBarBadgeStyle: {
                    backgroundColor: '#FF3B30',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontFamily: TYPOGRAPHY.bold,
                    lineHeight: 14,
                },
                tabBarIcon: ({focused}) => (
                    <View
                        style={{
                            backgroundColor: focused ? "#ECF8FF" : "transparent",
                            padding: 10,
                            borderRadius: 10,
                        }}
                    >
                        {focused ? (
                            <Svg width={24} height={24} viewBox="16 17 24 24" fill="none">
                                <Path d="M28 20 C24 20 21 27 21 27 V33 L19 35 V36 H37 V35 L35 33 V27 C35 27 32 20 28 20 Z" fill="#5096F1" />
                                <Path d="M26 36 C26 37.1 26.9 38 28 38 C29.1 38 30 37.1 30 36 H26 Z" fill="#5096F1" />
                            </Svg>
                        ) : (
                            <Notification
                                width={24}
                                height={24}
                                color={COLORS.secondary}
                            />
                        )}
                    </View>
                )
            }}
            listeners={({ navigation }) => ({
                tabPress: () => {
                    setIsNotifBadgeCleared(true);
                },
            })}
        />

        <Tabs.Screen 
            name="profile"
            options={{
                title: "Profile",
                headerShown: false,
                tabBarIcon: ({focused}) => (
                    <View
                        style={{
                            backgroundColor: focused ? "#ECF8FF" : "transparent",
                            padding: 10,
                            borderRadius: 10,
                        }}
                    >
                        <Image 
                            source={
                                avatar
                                ? { uri: avatar }
                                : require("../../assets/images/default.png")
                            }
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                            }}
                        />
                    </View>
                )
            }}
            listeners={({ navigation }) => ({
                tabPress: (e) => {
                    e.preventDefault();
                    navigation.navigate("profile", { userId: undefined });
                },
            })}
        />
        
    </Tabs>
  )
}

export default TabLayout