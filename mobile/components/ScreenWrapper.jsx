import { View, StyleSheet, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "../constants/colors";

const ScreenWrapper = ({ children }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Background blobs */}
      <View style={styles.bgContainer} pointerEvents="none">
        <Image
          source={require("../assets/images/Ellipse 4.png")}
          style={styles.topLeft}
        />

        <Image
          source={require("../assets/images/Ellipse 5.png")}
          style={styles.bottomRight}
        />
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.bg,
  },

  bgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  topLeft: {
    position: "absolute",
    top: -40,
    left: -60,
  },

  bottomRight: {
    position: "absolute",
    bottom: -60,
    right: -60,
  },

  content: {
    flex: 1,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
});

export default ScreenWrapper;