import { StyleSheet, Text, View } from 'react-native'
import ScreenWrapper from '../../components/ScreenWrapper'
import { StatusBar } from 'expo-status-bar'

const community = () => {
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
        <Text>community</Text>
      </View>
    </ScreenWrapper>
  )
}

export default community

const styles = StyleSheet.create({})

