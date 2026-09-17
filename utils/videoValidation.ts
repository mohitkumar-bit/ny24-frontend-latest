import { Platform } from 'react-native';
import { Audio } from 'expo-av';

export const MAX_VIDEO_DURATION_SECONDS = 30;
export const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SECONDS * 1000;
export const MAX_VIDEO_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_FILE_MB = 25;

/** ImagePicker returns duration in milliseconds. */
export function isPickerDurationValid(durationMs?: number | null) {
  if (durationMs == null || !Number.isFinite(durationMs)) return true;
  return durationMs > 0 && durationMs <= MAX_VIDEO_DURATION_MS;
}

export function isDurationSecondsValid(durationSeconds?: number | null) {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) return false;
  return durationSeconds > 0 && durationSeconds <= MAX_VIDEO_DURATION_SECONDS;
}

function probeVideoDurationOnWeb(uri: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const durationMs =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration * 1000
          : null;
      cleanup();
      resolve(durationMs);
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.src = uri;
  });
}

export async function probeVideoDurationMs(uri: string): Promise<number | null> {
  if (Platform.OS === 'web') {
    return probeVideoDurationOnWeb(uri);
  }

  try {
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );
    await sound.unloadAsync();
    if (status.isLoaded && typeof status.durationMillis === 'number') {
      return status.durationMillis;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export async function assertVideoWithinLimit(
  uri: string,
  knownDurationMs?: number | null
): Promise<string | null> {
  if (isPickerDurationValid(knownDurationMs)) {
    return null;
  }

  const durationMs = await probeVideoDurationMs(uri);
  if (durationMs == null) {
    return null;
  }
  if (durationMs > MAX_VIDEO_DURATION_MS) {
    const seconds = Math.ceil(durationMs / 1000);
    return `Video is ${seconds} seconds. Maximum allowed length is ${MAX_VIDEO_DURATION_SECONDS} seconds.`;
  }
  return null;
}
