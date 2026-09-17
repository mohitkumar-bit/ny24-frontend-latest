import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type PickImageOptions = {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
};

/**
 * Pick a photo using the system photo picker on Android (no READ_MEDIA_* permission).
 * iOS still requests photo library access when needed.
 */
export async function pickImageFromLibrary(options: PickImageOptions = {}) {
  if (Platform.OS === 'ios') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library access is needed to select a photo.');
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options.allowsEditing ?? true,
    aspect: options.aspect ?? [1, 1],
    quality: options.quality ?? 0.45,
    legacy: false,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}

export async function pickImageFromCamera(options: PickImageOptions = {}) {
  if (Platform.OS === 'web') {
    Alert.alert('Camera unavailable', 'Please choose a photo from your gallery on web.');
    return null;
  }

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Camera access is needed to take a photo.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options.allowsEditing ?? true,
    aspect: options.aspect ?? [1, 1],
    quality: options.quality ?? 0.45,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}
