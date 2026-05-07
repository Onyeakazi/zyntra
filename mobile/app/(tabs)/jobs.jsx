import { StyleSheet, Text, View } from 'react-native'
import ScreenWrapper from '../../components/ScreenWrapper'
import { StatusBar } from 'expo-status-bar'

const jobs = () => {
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
        <Text>Jobs screen</Text>
      </View>
    </ScreenWrapper>
  )
}

export default jobs

const styles = StyleSheet.create({})
