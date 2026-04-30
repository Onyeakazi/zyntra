import { SafeAreaView } from 'react-native-safe-area-context'
import { Slot } from 'expo-router'
import { StatusBar } from 'react-native'

const _layout = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 35 }}>
        <StatusBar barStyle="dark-content" />
        <Slot />
    </SafeAreaView>

  )
}

export default _layout