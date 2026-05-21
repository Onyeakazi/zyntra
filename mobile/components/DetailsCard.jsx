import { StyleSheet, Text, View } from 'react-native'

const DetailsCard = ({icon, title, description}) => {
  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <View>{icon}</View>

            <Text style={styles.title}>{title}</Text>
        </View>

        <Text style={styles.description}>{description}</Text>
    </View>
  )
}

export default DetailsCard

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontFamily: "Inter-SemiBold",
    fontSize: 16,
    marginLeft: 10,
  },
  description: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
    color: "#606073",
  },
})