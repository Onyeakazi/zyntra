import { Animated, StyleSheet, TextInput, View } from 'react-native'
import { useRef, useEffect, useState } from 'react'
import TYPOGRAPHY from '../contants/typography'

const FloatingInput = ({ placeholder, value = "", onChangeText, onFocus, onBlur }) => {
  const animatedTop = useRef(new Animated.Value(16)).current
  const animatedFontSize = useRef(new Animated.Value(16)).current
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    const isActive = isFocused || value.length > 0

    Animated.parallel([
      Animated.timing(animatedTop, {
        toValue: isActive ? -10 : 16,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(animatedFontSize, {
        toValue: isActive ? 12 : 16,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start()
  }, [isFocused, value])

  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.floatingPlaceholder,
          {
            top: animatedTop,
            fontSize: animatedFontSize,
          },
        ]}
        pointerEvents="none"
      >
        {placeholder}
      </Animated.Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor="transparent"
      />
    </View>
  )
}

export default FloatingInput

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 10,
    justifyContent: 'center',
  },
  floatingPlaceholder: {
    position: 'absolute',
    left: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    color: '#999',
    fontFamily: TYPOGRAPHY.regular,
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cfcdcd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.regular,
  },
})