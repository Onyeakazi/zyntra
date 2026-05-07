import { Pressable, StyleSheet, Text, View } from 'react-native'
import ScreenWrapper from '../../components/ScreenWrapper'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'

const profile = () => {
  return (
    <ScreenWrapper>
        <StatusBar style="dark" />
        <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Profile screen</Text>
        <Pressable onPress={()=> router.push("/(auth)/login")}>
          <Text>Logout</Text>
        </Pressable>
      </View>
    </ScreenWrapper>
  )
}

export default profile

const styles = StyleSheet.create({})