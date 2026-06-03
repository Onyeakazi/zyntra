import { Stack, Tabs } from "expo-router";
import House from "../../assets/vectors/House.svg";
import AddUser from "../../assets/vectors/addUser.svg";
import Job from "../../assets/vectors/briefcase.svg";
import Community from "../../assets/vectors/community.svg";
import Profile from "../../assets/vectors/profileImg.svg";
import COLORS from "../../constants/colors";
import { Image, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import { auth } from "../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import TYPOGRAPHY from "../../constants/typography";

const _layout = () => {
    const [avatar, setAvatar] = useState(null);
    const [requestCount, setRequestCount] = useState(0);
    const [isBadgeCleared, setIsBadgeCleared] = useState(false);
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

                if (channel) {
                    supabase.removeChannel(channel);
                }

                // Listen for connections updates in real-time
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
                            
                            // For DELETE events, payload.old typically only contains the primary key (id),
                            // so friend_id/user_id checks will fail. We unconditionally refresh the count on DELETE.
                            if (payload.eventType === 'DELETE') {
                                console.log("[Badge Debug] DELETE event received. Refreshing request count.");
                                fetchRequestCount(user);
                            } else if (record && (record.friend_id === user.uid || record.user_id === user.uid)) {
                                fetchRequestCount(user);
                                
                                // If it's a NEW incoming connection request, make the badge visible again
                                if (payload.eventType === 'INSERT' && payload.new.friend_id === user.uid && payload.new.status === 'pending') {
                                    console.log("[Badge Debug] New request received! Showing badge.");
                                    setIsBadgeCleared(false);
                                }
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log("[Badge Debug] Realtime channel status changed to:", status);
                    });
            } else {
                setAvatar(null);
                setRequestCount(0);
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
                        <House
                            width={24}
                            height={24}
                            color={focused ? "#5096F1" : COLORS.secondary}
                        />
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
                        <AddUser
                            width={24}
                            height={24}
                            color={focused ? "#5096F1" : COLORS.secondary}
                        />
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
            name="jobs"
            options={{
                title: "Job",
                headerShown: false,
                tabBarIcon: ({focused}) => (
                    <View
                        style={{
                            backgroundColor: focused ? "#ECF8FF" : "transparent",
                            padding: 10,
                            borderRadius: 10,
                        }}
                    >
                        <Job
                            width={24}
                            height={24}
                            color={focused ? "#5096F1" : COLORS.secondary}
                        />
                    </View> 
                )
            }}
        />

        <Tabs.Screen 
            name="community"
            options={{
                title: "Community",
                headerShown: false,
                tabBarIcon: ({focused}) => (
                    <View
                        style={{
                            backgroundColor: focused ? "#ECF8FF" : "transparent",
                            padding: 10,
                            borderRadius: 10,
                        }}
                    >
                        <Community
                            width={24}
                            height={24}
                            color={focused ? "#5096F1" : COLORS.secondary}
                        />
                    </View>
                )
            }}
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