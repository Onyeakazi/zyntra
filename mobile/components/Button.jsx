import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import TYPOGRAPHY from '../constants/typography'
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet'

const Button = ({
  bgColor,
  text,
  action,
  textColor,
  icon,
  style,
  loading = false,
  disabled = false,
}) => {

  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      onPress={action}
      style={[
        styles.btn,
        { backgroundColor: bgColor },
        style,
        isDisabled && { opacity: 0.7 }
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor || "#fff"} />
      ) : (
        <>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}

          <Text style={[styles.text, { color: textColor }]}>
            {text}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

export default Button

const styles = createResponsiveStyleSheet({
  btn: {
    paddingVertical: 20,
    borderRadius: 15,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  text: {
    textAlign: "center",
    color: "#FFFFFF",
    fontFamily: TYPOGRAPHY.medium,
    fontSize: 16
  }
})