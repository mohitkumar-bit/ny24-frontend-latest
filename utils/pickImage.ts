import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import i18n from '@/i18n';

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
      Alert.alert(i18n.t('media.permissionRequired'), i18n.t('media.photoLibraryAccess'));
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
    Alert.alert(i18n.t('media.cameraUnavailable'), i18n.t('media.cameraUnavailableWeb'));
    return null;
  }

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(i18n.t('media.permissionRequired'), i18n.t('media.cameraAccess'));
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
