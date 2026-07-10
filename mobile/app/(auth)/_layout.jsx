import { Slot } from 'expo-router'
import { View } from 'react-native'
import ScreenWrapper from '../../components/ScreenWrapper'

const _layout = () => {
  return (
    <ScreenWrapper>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <Slot />
      </View>
    </ScreenWrapper>
  )
}

export default _layout