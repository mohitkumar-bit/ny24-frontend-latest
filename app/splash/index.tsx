import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';
import { tokenStorage } from '@/services/tokenStorage';
import { authService } from '@/services/auth.service';
import { getPostAuthRoute } from '@/utils/locationNavigation';
import { useTranslation } from 'react-i18next';

const AUTH_TIMEOUT_MS = 10000;
/** Hold after tagline finishes so the full reveal is visible before leave */
const HOLD_AFTER_WRITE_MS = 1500;
const TAGLINE_WIDTH = 340;
const WRITE_MS = 3500;
/** Keep splash on screen for ~5 seconds */
const SPLASH_MIN_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

type TaglineRevealProps = {
  onComplete: () => void;
};

/** Left-to-right reveal for the splash tagline */
function TaglineReveal({ onComplete }: TaglineRevealProps) {
  const { t } = useTranslation();
  const tagline = t('splash.tagline');
  const reveal = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    reveal.setValue(0);
    const anim = Animated.timing(reveal, {
      toValue: TAGLINE_WIDTH,
      duration: WRITE_MS,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    });

    anim.start(({ finished }) => {
      if (finished) {
        onCompleteRef.current();
      }
    });

    return () => {
      anim.stop();
    };
  }, [reveal]);

  return (
    <View style={styles.taglineWrap} accessibilityLabel={tagline}>
      <Animated.View style={[styles.taglineClip, { width: reveal }]}>
        <Text style={styles.tagline} numberOfLines={2}>
          {tagline}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function SplashPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hasNavigated = useRef(false);
  const animationDoneRef = useRef<{
    promise: Promise<void>;
    resolve: () => void;
  } | null>(null);

  if (!animationDoneRef.current) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    animationDoneRef.current = { promise, resolve };
  }

  useEffect(() => {
    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;

    const navigate = (path: '/auth/login' | '/(tabs)' | '/location-setup') => {
      if (cancelled || hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace(path as any);
    };

    const resolveDestination = async (): Promise<
      '/auth/login' | '/(tabs)' | '/location-setup'
    > => {
      try {
        const token = await tokenStorage.getAccessToken();
        if (!token) {
          await tokenStorage.clearLogoutReason();
          return '/auth/login';
        }

        const profile = await withTimeout(
          authService.getProfile(),
          AUTH_TIMEOUT_MS
        );
        return await getPostAuthRoute(profile);
      } catch (error: any) {
        try {
          await tokenStorage.clear();
          if (error?.response?.data?.code !== 'SESSION_REVOKED') {
            await tokenStorage.clearLogoutReason();
          }
        } catch {
          /* ignore */
        }
        return '/auth/login';
      }
    };

    const waitForAnimation = async () => {
      await Promise.race([
        animationDoneRef.current!.promise,
        // Safety if animation is interrupted without finishing
        new Promise<void>((resolve) => setTimeout(resolve, WRITE_MS + 400)),
      ]);
      await new Promise<void>((resolve) => {
        holdTimer = setTimeout(resolve, HOLD_AFTER_WRITE_MS);
      });
    };

    const minDelay = new Promise<void>((resolve) => {
      setTimeout(resolve, SPLASH_MIN_MS);
    });

    (async () => {
      const [nextRoute] = await Promise.all([
        resolveDestination(),
        Promise.all([waitForAnimation(), minDelay]),
      ]);
      if (cancelled) return;
      navigate(nextRoute);
    })();

    return () => {
      cancelled = true;
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8C00" />

      <View style={styles.content}>
        <Logo size={88} />
        <TaglineReveal onComplete={() => animationDoneRef.current?.resolve()} />
        <ActivityIndicator size="small" color="#FFFFFF" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF8C00',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  taglineWrap: {
    marginTop: 28,
    width: TAGLINE_WIDTH,
    minHeight: 96,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  taglineClip: {
    overflow: 'hidden',
  },
  tagline: {
    width: TAGLINE_WIDTH,
    fontFamily: 'GreatVibes_400Regular',
    fontSize: 42,
    lineHeight: 52,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loader: {
    marginTop: 50,
  },
});
