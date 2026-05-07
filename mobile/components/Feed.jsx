import { Dimensions, Image, StyleSheet, Text, View } from 'react-native'
import Like from "../assets/vectors/like.svg";
import Message from "../assets/vectors/message.svg";
import Share from "../assets/vectors/share.svg";
import Saved from "../assets/vectors/save.svg";

const { width } = Dimensions.get("screen");

const Feed = ({ item }) => {
  return (
    <View style={styles.container}>
      <View style={styles.feedHeader}>
        <Image 
          source={item.user.profilePic} 
          style={{ width: 40, height: 40, borderRadius: 20 }} 
        />
        <View style={styles.feedInfo}>
          <Text style={styles.name}>{item.user.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </View>

      <View style={styles.feedContent}>
        <Text>{item.content}</Text>
        <Image 
          source={item.image} 
          style={{ width: "100%", height: 200, borderRadius: 10, marginTop: 10 }} 
          resizeMode="cover"
        />
      </View>

      <View style={styles.feedFooter}>
        <View style={styles.reactions}>
          <View style={styles.likes}>
            <Like width={24} height={24} />
            <Text>{item.likes}</Text>
          </View>
          <View style={styles.comments}>
            <Message width={24} height={24} />
            <Text>{item.comments}</Text>
          </View>
          <View style={styles.share}>
            <Share width={24} height={24} />
          </View>
        </View>
        <View style={styles.save}>
          <Saved width={24} height={24} />
        </View>
      </View>
    </View>
  )
}

export default Feed

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 15,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  feedInfo: {
    gap: 3,
  },
  name: {
    fontWeight: "bold",
    fontSize: 14,
  },
  time: {
    fontSize: 12,
    color: "#a0a0a0",
  },
  feedContent: {
    marginBottom: 10,
  },
  feedFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  reactions: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
  },
  likes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  comments: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  share: {
    flexDirection: "row",
    alignItems: "center",
  },
  save: {
    flexDirection: "row",
    alignItems: "center",
  },
})