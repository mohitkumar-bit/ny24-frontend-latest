import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface FeedVideoPlayerProps {
  uri: string;
  height?: number;
  isActive?: boolean;
}

const VIDEO_HEIGHT = 420;

export function FeedVideoPlayer({
  uri,
  height = VIDEO_HEIGHT,
  isActive = false,
}: FeedVideoPlayerProps) {
  const videoRef = React.useRef<Video>(null);
  const webVideoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (!el) return;
      if (isActive) {
        el.muted = true;
        const playPromise = el.play();
        if (playPromise) {
          playPromise.catch(() => {});
        }
      } else {
        el.pause();
        el.currentTime = 0;
      }
      return;
    }

    const player = videoRef.current;
    if (!player) return;

    if (isActive) {
      player.playAsync().catch(() => {});
    } else {
      player.pauseAsync().catch(() => {});
      player.setPositionAsync(0).catch(() => {});
    }
  }, [isActive, uri]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        {React.createElement('video', {
          ref: (element: HTMLVideoElement | null) => {
            webVideoRef.current = element;
          },
          src: uri,
          controls: true,
          playsInline: true,
          muted: true,
          loop: true,
          autoPlay: isActive,
          preload: 'auto',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            backgroundColor: '#000',
          },
        })}
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.nativeVideo}
        resizeMode={ResizeMode.COVER}
        useNativeControls
        shouldPlay={isActive}
        isMuted
        isLooping
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },
});
