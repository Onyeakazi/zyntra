import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { router } from 'expo-router'

const profile = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Profile screen</Text>
      <Pressable onPress={()=> router.push("/(auth)/login")}>Logout</Pressable>
    </View>
  )
}

export default profile

const styles = StyleSheet.create({})