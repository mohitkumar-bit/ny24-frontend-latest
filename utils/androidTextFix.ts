import { Platform, TextStyle } from 'react-native';

/**
 * Some Android devices clip the last glyph when Text sits in a flex row
 * (font metrics are slightly wider than the layout box).
 */
export function preventAndroidTextClip(extra?: TextStyle): TextStyle {
  if (Platform.OS !== 'android') {
    return extra ?? {};
  }

  return {
    paddingEnd: 4,
    ...extra,
  };
}

/** Labels beside buttons/chips in a horizontal row. */
export function preventAndroidLabelClip(): TextStyle {
  return preventAndroidTextClip({ flexShrink: 0 });
}

/** List row titles with a trailing icon/checkmark. */
export function preventAndroidListItemTextClip(): TextStyle {
  return preventAndroidTextClip({ flex: 1, minWidth: 0 });
}

/** Compact chips and segmented controls. */
export function preventAndroidChipTextClip(): TextStyle {
  return preventAndroidTextClip({ flexShrink: 0 });
}
