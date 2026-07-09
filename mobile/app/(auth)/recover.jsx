import { View, Text, StyleSheet } from "react-native";

const Recover = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Recover Account</Text>
    </View>
  );
};

export default Recover;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 18,
  },
});
