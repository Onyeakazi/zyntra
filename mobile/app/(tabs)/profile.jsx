import { FlatList, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ScreenWrapper from '../../components/ScreenWrapper'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { scale, verticalScale } from '../../utils/scale'
import TYPOGRAPHY from '../../constants/typography'
import Gear from "../../assets/vectors/gear.svg"
import COLORS from '../../constants/colors'
import { useState } from 'react'
import Feed from '../../components/Feed'

const profile = () => {
  const [active, setActive] = useState("Posts");

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

  return (
    <ScreenWrapper>
        <StatusBar style="dark" />

        <View style={styles.header}>

          {/* Banner */}
          <View style={styles.banner}>
            <Image
              source={require("../../assets/images/WhatsApp Image 2026-03-16 at 8.33.31 AM.jpeg")}
              style={styles.bannerImg}
            />
          </View>

          {/* Profile Image */}
          <View style={styles.profileImageContainer}>
            <Image
              source={require("../../assets/images/prof.jpeg")}
              style={styles.profImg}
            />
          </View>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.name}>Godswill Berry</Text>
          <Text style={styles.username}>@eze_berry</Text>
          <Text style={styles.bio}>Software Engineer</Text>
        </View>

        {/* Settings */}
        <View style={styles.settings}>
          <Pressable style={styles.editBtn}>
            <Text style={styles.settingText}>EDIT PROFILE</Text>
          </Pressable>

          <Pressable style={styles.settingIcon}>
            <Gear width={scale(25.94)} height={scale(25.94)} />
          </Pressable>
        </View>

        <View style={{paddingHorizontal: 15}}>
          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>100</Text>
              <Text style={styles.statText}>Post</Text>
            </View>

            <View style={styles.lines}/>

            <View style={styles.stat}>
              <Text style={styles.statNumber}>120</Text>
              <Text style={styles.statText}>Photos</Text>
            </View>

            <View style={styles.lines}/>

            <View style={styles.stat}>
              <Text style={styles.statNumber}>10k</Text>
              <Text style={styles.statText}>Followers</Text>
            </View>

            <View style={styles.lines}/>

            <View style={styles.stat}>
              <Text style={styles.statNumber}>600</Text>
              <Text style={styles.statText}>Following</Text>
            </View>
          </View>
        </View>

        <View>
          <View style={styles.profileBtns}>
            <TouchableOpacity style={styles.tabBtn} onPress={()=> setActive("Posts")}>
              <Text style={[styles.btn, active === "Posts" && styles.btnActive]}>Posts</Text>
              {active === "Posts" && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabBtn} onPress={()=> setActive("Details")}>
              <Text style={[styles.btn, active === "Details" && styles.btnActive]}>Details</Text>
              {active === "Details" && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {active === "Posts" && (
          <FlatList
            data={feeds}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Feed item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
          />
        )}

    </ScreenWrapper>
  )
}

export default profile

const styles = StyleSheet.create({
  tabBtn: {
    alignItems: "center",
    paddingBottom: verticalScale(10),
  },

  profileBtns: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(100)
  },

  activeIndicator: {
    height: verticalScale(3),
    backgroundColor: COLORS.primary,
    marginTop: verticalScale(6),
    borderRadius: 10,
    width: scale(120),
  },

  btn:{
    fontFamily: TYPOGRAPHY.medium,
    fontSize: scale(16),
    color: "#808080cc"
  },

  btnActive: {
    color: COLORS.primary
  },

  stats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    paddingVertical: verticalScale(10),
    gap: scale(20),
    marginVertical: scale(20)
  },

  stat: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },

  statNumber: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(18),
    color: "#606073"
  },

  statText: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(12),
    color: "#000000"
  },

  lines: {
    width: scale(2),
    height: verticalScale(23),
    backgroundColor: COLORS.gray
  },

  settings: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(15),
    marginTop: verticalScale(20)
  },

  editBtn: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(80),
  },

  settingIcon: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    paddingVertical: verticalScale(9),
    paddingHorizontal: scale(16),
  },

  settingText: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(14),
    color: "#606073"
  },

  details:{
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },

  name: {
    fontFamily: TYPOGRAPHY.semiBold,
    fontSize: scale(28)
  },

  bio: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(14),
    marginTop: 5
  },

  username: {
    fontFamily: TYPOGRAPHY.regular,
    fontSize: scale(14),
    color: "#888",
  },

  header: {
    position: "relative",
    marginBottom: verticalScale(60),
  },

  banner: {
    width: "100%",
    height: verticalScale(220),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },

  bannerImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  profileImageContainer: {
    position: "absolute",
    bottom: -scale(50),
    left: "50%",
    transform: [{ translateX: -scale(50) }],
    zIndex: 10,
  },

  profImg: {
    width: scale(100),
    height: verticalScale(100),
    borderRadius: scale(50),
    borderWidth: 4,
    borderColor: "#fff",
  },

})