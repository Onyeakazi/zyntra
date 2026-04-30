import { Stack, Tabs } from "expo-router";

const _layout = () => {
  return (
    <Tabs>
        <Tabs.Screen 
            name="index"
            options={{
                title: "Home",
                headerShown: false
            }}
        />

        <Tabs.Screen 
            name="addFriends"
            options={{
                title: "Add",
                headerShown: false
            }}
        />

        <Tabs.Screen 
            name="jobs"
            options={{
                title: "Job",
                headerShown: false
            }}
        />

        <Tabs.Screen 
            name="community"
            options={{
                title: "Community",
                headerShown: false
            }}
        />

        <Tabs.Screen 
            name="profile"
            options={{
                title: "Profile",
                headerShown: false
            }}
        />
        
    </Tabs>
  )
}

export default _layout