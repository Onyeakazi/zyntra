import { StyleSheet } from 'react-native';
import { scale, verticalScale, moderateScale } from './scale';

// Sizing properties that align horizontally
const horizontalKeys = new Set([
  'width',
  'minWidth',
  'maxWidth',
  'padding',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'margin',
  'marginHorizontal',
  'marginLeft',
  'marginRight',
  'left',
  'right',
  'gap'
]);

// Sizing properties that align vertically
const verticalKeys = new Set([
  'height',
  'minHeight',
  'maxHeight',
  'paddingVertical',
  'paddingTop',
  'paddingBottom',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'top',
  'bottom'
]);

// Text and rounding properties to moderate
const moderateKeys = new Set([
  'fontSize',
  'lineHeight',
  'borderRadius',
  'borderWidth'
]);

// Non-scaling properties to ignore
const ignoreKeys = new Set([
  'flex',
  'opacity',
  'zIndex',
  'elevation',
  'aspectRatio',
  'shadowOpacity',
  'shadowRadius'
]);

/**
 * Iterates through a single style object and applies directional scaling dynamically.
 */
export const scaleStyleObject = (styleObj) => {
  if (!styleObj) return styleObj;
  
  const scaledObj = {};
  for (const key in styleObj) {
    const val = styleObj[key];
    
    if (typeof val === 'number') {
      if (ignoreKeys.has(key)) {
        scaledObj[key] = val;
      } else if (horizontalKeys.has(key)) {
        scaledObj[key] = scale(val);
      } else if (verticalKeys.has(key)) {
        scaledObj[key] = verticalScale(val);
      } else if (moderateKeys.has(key)) {
        scaledObj[key] = moderateScale(val);
      } else {
        scaledObj[key] = moderateScale(val); // Fallback scaling for custom coordinates
      }
    } else {
      scaledObj[key] = val;
    }
  }
  return scaledObj;
};

/**
 * Custom wrapper for StyleSheet.create to dynamically generate responsive layouts.
 */
const createResponsiveStyleSheet = (stylesObj) => {
  const scaledStyles = {};
  for (const styleName in stylesObj) {
    scaledStyles[styleName] = scaleStyleObject(stylesObj[styleName]);
  }
  return StyleSheet.create(scaledStyles);
};

export default createResponsiveStyleSheet;
