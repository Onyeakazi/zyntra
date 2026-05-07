import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Base guideline (iPhone 11 / X style design baseline)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Scale based on width
export const scale = (size) => (width / guidelineBaseWidth) * size;

// Scale based on height (optional)
export const verticalScale = (size) =>
  (height / guidelineBaseHeight) * size;

// Moderate scale (best for fonts)
export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;