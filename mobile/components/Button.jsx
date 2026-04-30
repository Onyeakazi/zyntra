import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import TYPOGRAPHY from '../contants/typography'

const Button = ({bgColor, text, action, textColor, icon, style}) => {
  return (
    <TouchableOpacity onPress={action} style={[styles.btn, { backgroundColor: bgColor }, style]}>
        {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </TouchableOpacity>
  )
}

export default Button

const styles = StyleSheet.create({
    btn: {
        paddingVertical: 20,
        borderRadius: 15,
        backgroundColor: "#000000"
    },

    text: {
        textAlign: "center",
        color: "#FFFFFF",
        fontFamily: TYPOGRAPHY.medium,
        fontSize: 16
    }
})