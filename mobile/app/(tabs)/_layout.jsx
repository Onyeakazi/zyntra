import { Stack, Tabs } from "expo-router";
import House from "../../assets/vectors/House.svg";
import AddUser from "../../assets/vectors/addUser.svg";
import Message from "../../assets/vectors/send.svg";
import Notification from "../../assets/vectors/notification.svg";
import Profile from "../../assets/vectors/profileImg.svg";
import COLORS from "../../constants/colors";
import { Image, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import { auth } from "../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import TYPOGRAPHY from "../../constants/typography";
import Svg, { Path, Circle } from "react-native-svg";

const _layout = () => {
    const [avatar, setAvatar] = useState(null);
    const [requestCount, setRequestCount] = useState(0);
    const [isBadgeCleared, setIsBadgeCleared] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [isNotifBadgeCleared, setIsNotifBadgeCleared] = useState(false);
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

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            console.log("[Badge Debug] onAuthStateChanged fired! User logged in:", !!user);
            if (user) {
                fetchAvatar(user);
                fetchRequestCount(user);
                fetchNotificationCount(user);

                if (channel) {
                    supabase.removeChannel(channel);
                }

                // Listen for connections and notifications updates in real-time
                console.log("[Badge Debug] Registering Supabase Realtime channel...");
                channel = supabase
                    .channel('connections-badge-changes')
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
                    .subscribe((status) => {
                        console.log("[Badge Debug] Realtime channel status changed to:", status);
                    });
            } else {
                setAvatar(null);
                setRequestCount(0);
                setNotificationCount(0);
                if (channel) {
                    supabase.removeChannel(channel);
                    channel = null;
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (channel) {
                supabase.removeChannel(channel);
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
                height: 85,
                paddingTop: 18,
                paddingBottom: 15,
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

export default _layout