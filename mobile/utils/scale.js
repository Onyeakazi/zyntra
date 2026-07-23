import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Base guideline (iPhone 11 / X style design baseline)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Cap the dimensions used for scaling calculations on wider viewports
const responsiveWidth = width > 450 ? 450 : width;
const responsiveHeight = height > 900 ? 900 : height;

// Scale based on width
export const scale = (size) => (responsiveWidth / guidelineBaseWidth) * size;

// Scale based on height (optional)
export const verticalScale = (size) =>
  (responsiveHeight / guidelineBaseHeight) * size;

// Moderate scale (best for fonts)
export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;