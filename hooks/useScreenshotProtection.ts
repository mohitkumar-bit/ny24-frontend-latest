import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

const SCREEN_CAPTURE_KEY = 'gigseva-app';

/** Block screenshots and screen recording on iOS and Android for the whole app. */
export function useScreenshotProtection() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_KEY);

    return () => {
      void ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_KEY);
    };
  }, []);
}
