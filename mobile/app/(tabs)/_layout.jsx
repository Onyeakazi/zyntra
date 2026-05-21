import { Stack, Tabs } from "expo-router";
import House from "../../assets/vectors/House.svg";
import AddUser from "../../assets/vectors/addUser.svg";
import Job from "../../assets/vectors/briefcase.svg";
import Community from "../../assets/vectors/community.svg";
import Profile from "../../assets/vectors/profileImg.svg";
import COLORS from "../../constants/colors";
import { View } from "react-native";

const _layout = () => {
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
                        <Profile
                            width={24}
                            height={24}
                            color={focused ? "#5096F1" : COLORS.secondary}
                        />
                    </View>
                )
            }}
        />
        
    </Tabs>
  )
}

export default _layout