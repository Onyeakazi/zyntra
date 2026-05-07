import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import COLORS from '../constants/colors'
import TYPOGRAPHY from '../constants/typography'

const Story = ({image, name, onclick, isShown}) => {
  return (
    <Pressable style={styles.container} onPress={onclick}>
        <View style={styles.storyRing}>
            <Image source={image} style={styles.image}/>
        </View>
      <Text style={styles.text}>{name}</Text>
    </Pressable>
  )
}

export default Story

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        width: 85
    },

    storyRing: {
        width: 65,
        height: 65,

        borderWidth: 2,
        borderRadius: 39,
        borderStyle: "dotted",
        borderColor: COLORS.accent,
        justifyContent: "center",
        alignItems: "center",
        padding: 5
    },

    image: {
        width: 60,
        height: 60,
        borderRadius: 31,
    },

    name: {
        marginTop: 5,
        fontSize: 14,
        fontFamily: TYPOGRAPHY.regular
    },
})