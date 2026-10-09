import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

const ACTION_WIDTH = 64;

function ReplyAction({ translation }: { translation: SharedValue<number> }) {
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translation.value, [0, ACTION_WIDTH], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(translation.value, [0, ACTION_WIDTH], [0.5, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View style={styles.action}>
      <Animated.View style={[styles.iconCircle, iconStyle]}>
        <Ionicons name="arrow-undo" size={18} color="#FF9500" />
      </Animated.View>
    </View>
  );
}

type Props = {
  children: React.ReactNode;
  onReply: () => void;
  enabled?: boolean;
};

/** WhatsApp-style swipe right to reply; the row springs back once the reply is triggered. */
export function SwipeToReply({ children, onReply, enabled = true }: Props) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  if (!enabled) return <>{children}</>;

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={ACTION_WIDTH}
      overshootLeft={false}
      dragOffsetFromLeftEdge={12}
      renderLeftActions={(_progress, translation) => <ReplyAction translation={translation} />}
      onSwipeableWillOpen={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReply();
        swipeableRef.current?.close();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF4E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
