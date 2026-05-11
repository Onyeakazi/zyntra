import { Dimensions, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import ScreenWrapper from "../../components/ScreenWrapper";
import Search from "../../assets/vectors/search.svg";
import Notification from "../../assets/vectors/bell.svg";
import Message from "../../assets/vectors/send.svg";
import Img from "../../assets/vectors/img.svg";
import Vid from "../../assets/vectors/videos.svg";
import Att from "../../assets/vectors/link.svg"
import COLORS from "../../constants/colors";
import TYPOGRAPHY from "../../constants/typography";
import Story from "../../components/Story";
import Feed from "../../components/Feed";
import { moderateScale, scale, verticalScale } from "../../utils/scale";

export default function Index() {
  const { width } = Dimensions.get("screen");
  const logoWidth = width * 0.4;

  const stories = [
    { id: "1", name: "John Berry", image: require("../../assets/images/profile.png") },
    { id: "2", name: "David", image: require("../../assets/images/profile.png") },
    { id: "3", name: "Sarah", image: require("../../assets/images/profile.png") },
    { id: "4", name: "Daniel", image: require("../../assets/images/profile.png") },
    { id: "5", name: "Daniel", image: require("../../assets/images/profile.png") },
  ];

  const feeds = [
    {
      id: "1",
      user: { name: "Godswill Chiemena", profilePic: require("../../assets/images/prof.jpeg") },
      content: "Had a great day coding, learned a lot about React Native! Looking forward to building more awesome apps. asdasdfndfasdknfasdkfd sldfasd ksds skdfs kdksndn kflndfij dasdfweudc sd sdfasd gxgxcfcc #ReactNative #MobileDevelopment",
      time: "2:30 PM",
      image: require("../../assets/images/feed1.png"),
      likes: "1.1m",
      comments: "11m"
    },
    {
      id: "2",
      user: { name: "Jane Smith", profilePic: require("../../assets/images/profile.png") },
      content: "Loving the new cafe in town!",
      time: "1:15 PM",
      image: require("../../assets/images/feed2.png"),
      likes: 85,
      comments: 30
    },
    {
      id: "3",
      user: { name: "David Lee", profilePic: require("../../assets/images/profile.png") },
      content: "Just finished a marathon, feeling accomplished!",
      time: "12:00 PM",
      image: require("../../assets/images/feed1.png"),
      likes: 200,
      comments: 60
    }
  ];

  const Header = () => (
    <View>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/brand.png")}
          style={{ width: logoWidth, height: logoWidth * 0.3, resizeMode: "contain" }}
        />
        <View style={styles.logoIcons}>
          <Pressable><Search width={24} height={24} /></Pressable>
          <Pressable><Notification width={24} height={24} /></Pressable>
          <Pressable><Message width={24} height={24} /></Pressable>
        </View>
      </View>

      {/* Upload Container */}
      <View style={styles.uploadContainer}>
        <View style={styles.imgCont}>
          <Image
            source={require("../../assets/images/profile.png")}
            style={{ width: 40, height: 40 }}
          />
          <Text style={{ fontFamily: TYPOGRAPHY.regular, fontSize: 18 }}>What's on your mind?</Text>
        </View>

        <View style={styles.uploads}>
          <Pressable style={styles.links}>
            <Img width={19.5} height={19.5} />
            <Text style={styles.linkText}>Image</Text>
          </Pressable>
          <View style={styles.linkLine} />
          <Pressable style={styles.links}>
            <Vid width={19.5} height={19.5} />
            <Text style={styles.linkText}>Videos</Text>
          </Pressable>
          <View style={styles.linkLine} />
          <Pressable style={styles.links}>
            <Att width={19.5} height={19.5} />
            <Text style={styles.linkText}>Attachment</Text>
          </Pressable>
        </View>
      </View>

      {/* Stories */}
      <View style={styles.storyWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center", paddingVertical: 5 }}
        >
          <Story image={require("../../assets/images/story.png")} name="Your Story" isOwnStory />
          {stories.map((item) => (
            <Story key={item.id} image={item.image} name={item.name} />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <StatusBar style="dark" />
      <FlatList
        data={feeds}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Feed item={item} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Header />}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: scale(10),
  },

  logoIcons: {
    flexDirection: "row",
    gap: 16,
  },

  storyWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: scale(-8),
  },

  uploadContainer: {
    borderWidth: 1,
    borderStyle: "dotted",
    borderRadius: 10,
    borderColor: COLORS.accent,
    marginVertical: scale(25),
    padding: scale(25),
  },

  imgCont: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  uploads: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 7,
    backgroundColor: "#ecf8ff",
    borderColor: "#D0EEFF",
    marginTop: scale(20),
    paddingVertical: scale(12),
    gap: scale(10),
  },

  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
  },

  linkText: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: moderateScale(14),
  },

  linkLine: {
    backgroundColor: "#a0a0a0",
    width: scale(2),
    height: verticalScale(16),
  },
});