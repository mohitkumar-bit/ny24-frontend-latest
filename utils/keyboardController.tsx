import React from 'react';
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  TurboModuleRegistry,
  View,
  type KeyboardAvoidingViewProps,
  type ViewProps,
} from 'react-native';

/**
 * Load react-native-keyboard-controller only when native module is present.
 * Prevents root layout crash (and cascading AppLocationProvider errors) on older binaries.
 */
function hasKeyboardControllerNative(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return TurboModuleRegistry?.get?.('KeyboardController') != null;
  } catch {
    return false;
  }
}

const isLinked = hasKeyboardControllerNative();

/** True when react-native-keyboard-controller drives keyboard insets (both platforms). */
export const isKeyboardControllerLinked = isLinked;

type KeyboardProviderProps = {
  children?: React.ReactNode;
  statusBarTranslucent?: boolean;
  navigationBarTranslucent?: boolean;
  preserveEdgeToEdge?: boolean;
};

type KeyboardStickyViewProps = ViewProps & {
  offset?: { closed?: number; opened?: number };
  children?: React.ReactNode;
};

const FallbackProvider = ({ children }: KeyboardProviderProps) => <>{children}</>;

export const KeyboardProvider: React.ComponentType<KeyboardProviderProps> = isLinked
  ? require('react-native-keyboard-controller').KeyboardProvider
  : FallbackProvider;

export const KeyboardStickyView: React.ComponentType<KeyboardStickyViewProps> = isLinked
  ? require('react-native-keyboard-controller').KeyboardStickyView
  : View;

const FallbackKeyboardAvoidingView = ({
  children,
  style,
  keyboardVerticalOffset,
  behavior,
  ...rest
}: KeyboardAvoidingViewProps) => (
  <RNKeyboardAvoidingView
    {...rest}
    style={style}
    behavior={behavior ?? (Platform.OS === 'ios' ? 'padding' : 'height')}
    keyboardVerticalOffset={keyboardVerticalOffset ?? 0}
  >
    {children}
  </RNKeyboardAvoidingView>
);

export const KeyboardAvoidingView: React.ComponentType<KeyboardAvoidingViewProps> = isLinked
  ? require('react-native-keyboard-controller').KeyboardAvoidingView
  : FallbackKeyboardAvoidingView;
