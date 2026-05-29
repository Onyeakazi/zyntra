import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions } from 'react-native';
import Like from "../assets/vectors/like.svg";
import Message from "../assets/vectors/message.svg";
import Share from "../assets/vectors/share.svg";
import Saved from "../assets/vectors/save.svg";
import { useState } from 'react';

const Feed = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = Dimensions.get("window").width - 60;

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.feedHeader}>
        <Image
          source={item.user.profilePic}
          style={styles.profile}
        />

        <View style={styles.feedInfo}>
          <Text style={styles.name}>{item.user.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.feedContent}>

        <Text
          numberOfLines={expanded ? undefined : 3}
          style={styles.contentText}
          onTextLayout={(e) => {
            if (!expanded && !showMore) {
              setShowMore(e.nativeEvent.lines.length >= 3);
            }
          }}
        >
          {item.content}
        </Text>

        {/* Show button ONLY if text exceeds 3 lines */}
        {showMore && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={styles.seeMore}>
              {expanded ? "see less" : "see more"}
            </Text>
          </TouchableOpacity>
        )}

        {(() => {
          const getImagesList = () => {
            if (!item.image) return [];
            if (Array.isArray(item.image)) return item.image;
            if (item.image.uri && typeof item.image.uri === 'string' && item.image.uri.includes(',')) {
              return item.image.uri.split(',').map(url => ({ uri: url }));
            }
            return [item.image];
          };

          const images = getImagesList();
          if (images.length === 0) return null;

          if (images.length === 1) {
            return (
              <Image
                source={images[0]}
                style={[styles.feedImage, { width: cardWidth }]}
                resizeMode="cover"
              />
            );
          }

          return (
            <View style={styles.carouselContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.carouselScrollView}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {images.map((img, index) => (
                  <Image
                    key={index}
                    source={img}
                    style={[styles.carouselImage, { width: cardWidth, height: 200 }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              <View style={styles.dotsContainer}>
                {images.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.dot, 
                      activeIndex === index ? styles.activeDot : null
                    ]} 
                  />
                ))}
              </View>
            </View>
          );
        })()}

      </View>

      {/* Footer */}
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
  );
};

export default Feed;

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 15,
    overflow: "hidden",
  },

  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  profile: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

  contentText: {
    lineHeight: 22,
  },

  seeMore: {
    color: "#888",
    marginTop: 4,
  },

  feedImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },

  carouselContainer: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
    position: "relative",
  },

  carouselScrollView: {
    width: "100%",
    height: "100%",
  },

  carouselImage: {
    height: "100%",
  },

  dotsContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginHorizontal: 1,
  },
  activeDot: {
    backgroundColor: "#ffffff",
    width: 12,
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
});