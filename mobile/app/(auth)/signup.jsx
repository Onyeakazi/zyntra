import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { router } from 'expo-router'

const signup = () => {
  return (
    <View>
      <Text>signup</Text>

      <TouchableOpacity 
        onPress={()=> router.replace("/(auth)/login")}
      >
        <Text>Go to Login</Text>
      </TouchableOpacity>
    </View>
  )
}

export default signup

const styles = StyleSheet.create({})