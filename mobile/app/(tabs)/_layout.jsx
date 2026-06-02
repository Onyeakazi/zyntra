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
import {auth} from "../../config/firebase";

const _layout = () => {
    const [avatar, setAvatar] = useState(null);

    useEffect(()=> {
        const fetchAvatar = async () => {
            const user = auth.currentUser;
            if(!user) return;

            const {data, error} = await supabase.from("users")
                .select("avatar_url")
                .eq("id", user.uid)
                .single();

            if(!error && data?.avatar_url){
                setAvatar(data.avatar_url);
            }
        };
        fetchAvatar();
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