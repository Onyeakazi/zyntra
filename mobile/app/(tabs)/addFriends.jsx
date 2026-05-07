import { StyleSheet, Text, View } from 'react-native'
import ScreenWrapper from '../../components/ScreenWrapper'
import { StatusBar } from 'expo-status-bar'

const addFriends = () => {
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
        <Text>Add Friends screen</Text>
      </View>
    </ScreenWrapper>
  )
}

export default addFriends

const styles = StyleSheet.create({})