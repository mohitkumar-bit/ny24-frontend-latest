import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  Keyboard,
  Image,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, isKeyboardControllerLinked } from '@/utils/keyboardController';
import { ReportModal } from '@/components/ReportModal';
import { formatMessageTime } from '@/utils/formatTime';
import { pickImageFromLibrary } from '@/utils/pickImage';
import { Audio } from 'expo-av';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import {
  getMessages,
  sendMessage,
  uploadChatMedia,
  googleMapsUrl,
  claimChatSlot,
  getBlockStatus,
  blockUser,
  unblockUser,
  reportUser,
} from '../../services/chat.service';
import { callRequestService } from '../../services/callRequest.service';
import { authService } from '../../services/auth.service';
import { ChatEmojiPicker } from '@/components/ChatEmojiPicker';
import { setActiveConversationId as setGlobalActiveConversationId } from '@/utils/activeChat';
import { preventAndroidTextClip } from '@/utils/androidTextFix';
import { useTranslation } from 'react-i18next';
import { usePhonetic } from '@/hooks/usePhonetic';
import { useScriptStyles } from '@/hooks/useScriptStyles';
import { SwipeToReply } from '@/components/SwipeToReply';
import { fetchLiveLocation, getLocationErrorMessage } from '@/services/location.service';

interface Message {
  _id: string;
  text: string;
  sender: string;
  receiver?: string;
  createdAt: string;
  messageType?: 'text' | 'call_request' | 'image' | 'audio' | 'location';
  callRequestStatus?: 'pending' | 'accepted' | 'declined';
  mediaUrl?: string;
  mediaDuration?: number;
  location?: { lat: number; lng: number; address?: string };
  replyTo?: {
    messageId: string;
    sender: string;
    text?: string;
    messageType?: Message['messageType'];
  };
}

function formatAudioDuration(seconds?: number) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function AudioMessageBubble({
  uri,
  duration,
  isMe,
}: {
  uri: string;
  duration?: number;
  isMe: boolean;
}) {
  const { t } = useTranslation();
  const styles = useScriptStyles(baseStyles);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const togglePlay = async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
        return;
      }

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
      await sound.playAsync();
    } catch {
      Alert.alert(t('chat.playbackFailedTitle'), t('chat.playbackFailedMessage'));
      setIsPlaying(false);
    }
  };

  return (
    <TouchableOpacity style={styles.audioBubble} onPress={togglePlay} activeOpacity={0.8}>
      <Ionicons
        name={isPlaying ? 'pause' : 'play'}
        size={22}
        color={isMe ? '#fff' : '#FF9500'}
      />
      <View style={styles.audioWave}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.audioWaveBar,
              isMe ? styles.audioWaveBarMe : styles.audioWaveBarOther,
              { height: 8 + (i % 3) * 6 },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.audioDuration, isMe ? styles.meMessageText : styles.otherMessageText]}>
        {formatAudioDuration(duration)}
      </Text>
    </TouchableOpacity>
  );
}

export default function ChatDetailScreen() {
  const { t } = useTranslation();
  const styles = useScriptStyles(baseStyles);
  const params = useLocalSearchParams();
  const { id, name, avatarLetter, avatarUrl, receiverId: paramReceiverId, isSubscribed: paramIsSubscribed } = params;
  const phonetic = usePhonetic();
  const headerName = phonetic(typeof name === 'string' ? name : undefined);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimingSlot, setIsClaimingSlot] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(paramIsSubscribed === 'true');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [slotBlocked, setSlotBlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [respondingCallId, setRespondingCallId] = useState<string | null>(null);
  const [requestingCall, setRequestingCall] = useState(false);
  const [isChatBlocked, setIsChatBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState<{
    title: string;
    message: string;
    showSettings?: boolean;
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  useAudioRecorderState(audioRecorder);
  const scrollToLatest = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated });
    });
  }, []);

  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  const replySenderLabel = (senderId: string) =>
    String(senderId) === String(currentUserId)
      ? t('chat.you')
      : headerName || t('common.chat');

  const replySnippet = (reply: { text?: string; messageType?: Message['messageType'] }) => {
    if (reply.messageType === 'location') {
      return `📍 ${reply.text?.trim() ? phonetic(reply.text) : t('chatList.location')}`;
    }
    if (reply.text?.trim()) return phonetic(reply.text);
    if (reply.messageType === 'image') return `📷 ${t('chatList.photo')}`;
    if (reply.messageType === 'audio') return `🎤 ${t('chatList.voiceMessage')}`;
    return '';
  };

  const startReply = (message: Message) => {
    setReplyingTo(message);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      scrollToLatest();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToLatest]);

  useEffect(() => {
    if (paramReceiverId) {
      setReceiverId(paramReceiverId as string);
    } else if (id && id !== 'new') {
      setReceiverId(id as string);
    }

    if (id && id !== 'new' && id !== paramReceiverId) {
      setActiveConversationId(id as string);
    }
  }, [id, paramReceiverId]);

  useFocusEffect(
    useCallback(() => {
      const conversationId =
        activeConversationId || (id && id !== 'new' ? String(id) : null);
      setGlobalActiveConversationId(conversationId);

      return () => {
        setGlobalActiveConversationId(null);
        Keyboard.dismiss();
      };
    }, [activeConversationId, id])
  );

  useEffect(() => {
    loadUserAndClaimSlot();
  }, [id, paramReceiverId]);

  useEffect(() => {
    if (receiverId) {
      loadBlockStatus(receiverId as string);
    }
  }, [receiverId]);

  const loadBlockStatus = async (otherUserId: string) => {
    try {
      const status = await getBlockStatus(otherUserId);
      setIsChatBlocked(status.isBlocked);
      setBlockedByMe(status.blockedByMe);
      setBlockMessage(status.message || '');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (isSubscribed || !expiresAt || slotBlocked) return;

    const calculateTimeLeft = () => {
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(t('time.expired'));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(t('time.countdown', { hours, minutes, seconds }));
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, isSubscribed, slotBlocked, t]);

  useEffect(() => {
    if (slotBlocked) return;
    const interval = setInterval(fetchMsgs, 5000);
    return () => clearInterval(interval);
  }, [activeConversationId, slotBlocked]);

  const loadUserAndClaimSlot = async () => {
    try {
      setIsClaimingSlot(true);
      const user = await authService.getProfile();
      const subscribed = user?.subscription?.status === 'active';

      if (user) {
        const userId = user._id || user.id;
        setCurrentUserId(userId);
        setIsSubscribed(!!subscribed);
      }

      const claimParams: { conversationId?: string; receiverId?: string } = {};
      if (id && id !== 'new' && id !== paramReceiverId) {
        claimParams.conversationId = id as string;
      }
      if (paramReceiverId) {
        claimParams.receiverId = paramReceiverId as string;
      } else if (id && id !== 'new') {
        claimParams.receiverId = id as string;
      }

      if (subscribed) {
        const slotData = await claimChatSlot(claimParams);
        if (slotData.conversationId) {
          setActiveConversationId(slotData.conversationId);
        }
        setIsClaimingSlot(false);
        setIsLoading(false);
        await fetchMsgs(slotData.conversationId);
        return;
      }

      const slotData = await claimChatSlot(claimParams);

      if (slotData.conversationId) {
        setActiveConversationId(slotData.conversationId);
      }
      if (slotData.expiresAt) {
        setExpiresAt(slotData.expiresAt);
      } else if (slotData.isPinned) {
        setIsPinned(true);
        setExpiresAt(null);
      }

      setIsClaimingSlot(false);
      await fetchMsgs(slotData.conversationId);
    } catch (error: unknown) {
      setIsClaimingSlot(false);
      setIsLoading(false);
      const err = error as {
        response?: { data?: { code?: string; message?: string; blockedByMe?: boolean } };
        code?: string;
        message?: string;
        blockedByMe?: boolean;
      };
      const data = err.response?.data || err;
      const code = data?.code;
      const msg = data?.message || t('chat.unableToOpen');

      if (code === 'CHAT_LIMIT_REACHED') {
        setSlotBlocked(true);
        Alert.alert(
          t('chat.slotsFullTitle'),
          t('chat.slotsFullMessage'),
          [
            { text: t('chat.goBack'), onPress: () => router.back() },
            { text: t('common.ok') },
          ]
        );
      } else if (code === 'USER_BLOCKED') {
        setIsChatBlocked(true);
        setBlockedByMe(!!data?.blockedByMe);
        setBlockMessage(msg);
      } else {
        Alert.alert(t('common.error'), msg, [{ text: t('common.ok'), onPress: () => router.back() }]);
      }
    }
  };

  const fetchMsgs = async (conversationIdOverride?: string) => {
    const fetchId =
      conversationIdOverride ||
      activeConversationId ||
      (id === 'new' ? receiverId : id);

    if (!fetchId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getMessages(fetchId as string);
      setMessages(Array.isArray(data) ? data : []);

      if (!receiverId && data.length > 0 && currentUserId) {
        const firstMsg = data[0];
        const otherId =
          String(firstMsg.sender) === String(currentUserId)
            ? firstMsg.receiver
            : firstMsg.sender;
        if (otherId) {
          setReceiverId(otherId);
          loadBlockStatus(otherId);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showVanishingInfo = () => {
    Alert.alert(
      t('chat.slotTimerTitle'),
      isPinned
        ? t('chat.slotTimerPinned')
        : t('chat.slotTimerInfo', { timeLeft }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.ok') },
      ]
    );
  };

  const handleSendError = (error: any) => {
    const serverError = error.response?.data || error;
    const errorCode = serverError?.code;
    const serverMsg = serverError?.message;

    if (error.response?.status === 401) {
      const isSessionReplaced = errorCode === 'SESSION_REVOKED';
      Alert.alert(
        isSessionReplaced ? t('chat.signedInElsewhereTitle') : t('chat.sessionExpiredTitle'),
        isSessionReplaced
          ? t('chat.signedInElsewhereMessage')
          : t('chat.sessionExpiredMessage'),
        [{ text: t('common.ok'), onPress: () => router.replace('/auth/login' as any) }]
      );
    } else if (errorCode === 'CHAT_LIMIT_REACHED') {
      showVoiceNotice(t('chat.slotsFullTitle'), t('chat.slotsFullMessage'));
    } else if (errorCode === 'USER_BLOCKED') {
      setIsChatBlocked(true);
      setBlockedByMe(!!serverError?.blockedByMe);
      setBlockMessage(serverMsg || t('chat.messagingBlockedForChat'));
    } else {
      showVoiceNotice(
        t('chat.messageFailedTitle'),
        serverMsg || error.message || t('chat.couldNotSend')
      );
    }
  };

  const applySendResponse = (response: any) => {
    if (response.conversationId) {
      setActiveConversationId(response.conversationId);
    }
    if (response.slotInfo?.expiresAt) {
      setExpiresAt(response.slotInfo.expiresAt);
    }
    if (response.slotInfo?.isPinned) {
      setIsPinned(true);
    }
    fetchMsgs();
  };

  const handleSend = async () => {
    if (!inputText.trim() || slotBlocked || isChatBlocked) return;

    if (!receiverId && !activeConversationId) {
      return;
    }

    try {
      setIsSending(true);
      setShowEmojiPicker(false);
      const textToSend = inputText.trim();
      setInputText('');

      const response = await sendMessage({
        receiverId: (receiverId as string) || undefined,
        text: textToSend,
        conversationId: activeConversationId || undefined,
        messageType: 'text',
        replyToId: replyingTo?._id,
      });

      setReplyingTo(null);
      applySendResponse(response);
      scrollToLatest();
    } catch (error: any) {
      handleSendError(error);
    } finally {
      setIsSending(false);
    }
  };

  const sendMediaMessage = async (
    uri: string,
    mimeType: string,
    filename: string,
    duration?: number
  ) => {
    if (!receiverId && !activeConversationId) return;

    const caption = inputText.trim();
    try {
      setIsSending(true);
      setShowEmojiPicker(false);
      if (caption) setInputText('');

      const upload = await uploadChatMedia(uri, mimeType, filename);
      const response = await sendMessage({
        receiverId: (receiverId as string) || undefined,
        conversationId: activeConversationId || undefined,
        text: caption || undefined,
        mediaUrl: upload.mediaUrl,
        messageType: upload.messageType,
        mediaDuration: duration,
        replyToId: replyingTo?._id,
      });

      setReplyingTo(null);
      applySendResponse(response);
      scrollToLatest();
    } catch (error: any) {
      if (caption) setInputText(caption);
      handleSendError(error);
    } finally {
      setIsSending(false);
    }
  };

  const sendCurrentLocation = async () => {
    if (!receiverId && !activeConversationId) return;
    try {
      setIsSharingLocation(true);
      let place;
      try {
        place = await fetchLiveLocation();
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        showVoiceNotice(
          t('chat.locationFailedTitle'),
          getLocationErrorMessage(error),
          Platform.OS !== 'web' &&
            (message === 'PERMISSION_DENIED' || message === 'LOCATION_SERVICES_DISABLED')
        );
        return;
      }
      const [lng, lat] = place.coordinates;
      const response = await sendMessage({
        receiverId: (receiverId as string) || undefined,
        conversationId: activeConversationId || undefined,
        messageType: 'location',
        location: { lat, lng, address: place.address },
        replyToId: replyingTo?._id,
      });
      setReplyingTo(null);
      applySendResponse(response);
      scrollToLatest();
    } catch (error: any) {
      handleSendError(error);
    } finally {
      setIsSharingLocation(false);
    }
  };

  const toggleAttachMenu = () => {
    if (slotBlocked || isChatBlocked) return;
    if (!showAttachMenu) {
      Keyboard.dismiss();
      setShowEmojiPicker(false);
    }
    setShowAttachMenu((prev) => !prev);
  };

  const shareLocation = () => {
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    if (slotBlocked || isChatBlocked || isSending || isSharingLocation) return;
    // In-app modal instead of Alert.alert, which does nothing on web.
    setVoiceNotice({
      title: t('chat.shareLocationTitle'),
      message: t('chat.shareLocationMessage'),
      confirmLabel: t('chat.shareLocationConfirm'),
      onConfirm: () => void sendCurrentLocation(),
    });
  };

  const openLocation = (location: { lat: number; lng: number }) => {
    Linking.openURL(googleMapsUrl(location.lat, location.lng)).catch(() =>
      showVoiceNotice(t('common.error'), t('chat.openMapsFailed'))
    );
  };

  const pickImage = async () => {
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    if (slotBlocked || isChatBlocked || isSending) return;

    const uri = await pickImageFromLibrary({ allowsEditing: false, quality: 0.8 });

    if (!uri) return;

    await sendMediaMessage(uri, 'image/jpeg', `chat-${Date.now()}.jpg`);
  };

  const toggleEmojiPicker = () => {
    if (slotBlocked || isChatBlocked) return;
    if (!showEmojiPicker) {
      Keyboard.dismiss();
      setShowAttachMenu(false);
    }
    setShowEmojiPicker((prev) => !prev);
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const showVoiceNotice = (title: string, message: string, showSettings = false) => {
    setVoiceNotice({ title, message, showSettings });
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const beginRecordingTimer = () => {
    clearRecordingTimer();
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const startRecording = async () => {
    if (isRecording) return;

    if (slotBlocked || isChatBlocked || isSending) {
      if (slotBlocked) {
        showVoiceNotice(
          t('chat.slotsFullTitle'),
          t('chat.slotsFullMessage')
        );
      } else if (isChatBlocked) {
        showVoiceNotice(t('chat.messagingBlocked'), blockMessage || t('chat.cannotMessageUser'));
      }
      return;
    }

    if (!receiverId && !activeConversationId) {
      showVoiceNotice(t('chat.chatNotReadyTitle'), t('chat.chatNotReadyMessage'));
      return;
    }

    try {
      if (Platform.OS === 'web') {
        if (!navigator.mediaDevices?.getUserMedia) {
          showVoiceNotice(t('chat.notSupportedTitle'), t('chat.voiceNotSupported'));
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        webChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            webChunksRef.current.push(event.data);
          }
        };
        mediaRecorder.start();
        webMediaRecorderRef.current = mediaRecorder;
        webStreamRef.current = stream;
        setIsRecording(true);
        beginRecordingTimer();
        return;
      }

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        // Once denied for good, the OS no longer shows the prompt; only Settings can grant it.
        showVoiceNotice(
          t('chat.permissionNeededTitle'),
          t('chat.micPermissionMessage'),
          !status.canAskAgain
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      beginRecordingTimer();
    } catch (error) {
      console.error('Voice recording start failed:', error);
      showVoiceNotice(t('chat.recordingFailedTitle'), t('chat.recordingStartFailed'));
      setIsRecording(false);
      clearRecordingTimer();
    }
  };

  const cancelRecording = async () => {
    clearRecordingTimer();
    setIsRecording(false);
    setRecordingSeconds(0);

    try {
      if (Platform.OS === 'web') {
        if (webMediaRecorderRef.current?.state !== 'inactive') {
          webMediaRecorderRef.current?.stop();
        }
        webStreamRef.current?.getTracks().forEach((track) => track.stop());
        webMediaRecorderRef.current = null;
        webStreamRef.current = null;
        webChunksRef.current = [];
        return;
      }

      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }
    } catch {
      // ignore cleanup errors
    }
  };

  const stopRecordingAndSend = async () => {
    const duration = recordingSeconds;
    clearRecordingTimer();
    setIsRecording(false);
    setRecordingSeconds(0);

    if (duration < 1) {
      await cancelRecording();
      showVoiceNotice(t('chat.tooShortTitle'), t('chat.tooShortMessage'));
      return;
    }

    try {
      if (Platform.OS === 'web') {
        const recorder = webMediaRecorderRef.current;
        if (!recorder) return;

        await new Promise<void>((resolve, reject) => {
          recorder.onstop = async () => {
            try {
              webStreamRef.current?.getTracks().forEach((track) => track.stop());
              webMediaRecorderRef.current = null;
              webStreamRef.current = null;
              const blob = new Blob(webChunksRef.current, {
                type: recorder.mimeType || 'audio/webm',
              });
              webChunksRef.current = [];
              const uri = URL.createObjectURL(blob);
              const mimeType = blob.type || 'audio/webm';
              await sendMediaMessage(uri, mimeType, `voice-${Date.now()}.webm`, duration);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          recorder.stop();
        });
        return;
      }

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        showVoiceNotice(t('chat.recordingFailedTitle'), t('chat.noAudioCaptured'));
        return;
      }

      await sendMediaMessage(uri, 'audio/m4a', `voice-${Date.now()}.m4a`, duration);
    } catch (error) {
      console.error('Voice recording send failed:', error);
      showVoiceNotice(t('chat.recordingFailedTitle'), t('chat.voiceSendFailed'));
    }
  };

  const handleAcceptCallRequest = async (messageId: string) => {
    setRespondingCallId(messageId);
    try {
      const { phone } = await callRequestService.accept(messageId);
      await fetchMsgs();
      Linking.openURL(`tel:${phone}`);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('callRequest.couldNotStartCall'));
    } finally {
      setRespondingCallId(null);
    }
  };

  const handleDeclineCallRequest = async (messageId: string) => {
    setRespondingCallId(messageId);
    try {
      await callRequestService.decline(messageId);
      fetchMsgs();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('callRequest.couldNotDecline'));
    } finally {
      setRespondingCallId(null);
    }
  };

  const handleHeaderCallRequest = async () => {
    if (!receiverId) {
      Alert.alert(t('common.error'), t('chat.callNotAvailable'));
      return;
    }

    if (currentUserId && String(currentUserId) === String(receiverId)) {
      Alert.alert(t('common.error'), t('chat.cannotCallYourself'));
      return;
    }

    setRequestingCall(true);
    try {
      const sourceId = (activeConversationId || id || receiverId) as string;
      const sourceTitle = typeof name === 'string' ? name : 'Chat';

      await callRequestService.sendRequest({
        receiverId: receiverId as string,
        sourceType: 'worker',
        sourceId,
        sourceTitle,
        conversationId: activeConversationId || undefined,
      });

      await fetchMsgs();
      Alert.alert(t('chat.callRequestSentTitle'), t('chat.callRequestSentMessage'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('chat.callRequestFailed'));
    } finally {
      setRequestingCall(false);
    }
  };

  const handleBlockUser = async () => {
    if (!receiverId) return;
    setShowChatMenu(false);
    try {
      await blockUser(receiverId as string);
      setIsChatBlocked(true);
      setBlockedByMe(true);
      setBlockMessage(t('chat.youBlockedUser'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('chat.couldNotBlock'));
    }
  };

  const handleUnblockUser = async () => {
    if (!receiverId) return;
    setShowChatMenu(false);
    try {
      await unblockUser(receiverId as string);
      setIsChatBlocked(false);
      setBlockedByMe(false);
      setBlockMessage('');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('chat.couldNotUnblock'));
    }
  };

  const handleSubmitReport = async (reason: string, details: string) => {
    if (!receiverId || !reason.trim()) return;
    setSubmittingReport(true);
    try {
      await reportUser({
        reportedUserId: receiverId as string,
        conversationId: activeConversationId || undefined,
        reason,
        details,
      });
      setShowReportModal(false);
      setShowChatMenu(false);
      Alert.alert(
        t('chat.reportSubmittedTitle'),
        t('chat.reportSubmittedMessage')
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('chat.couldNotSubmitReport'));
    } finally {
      setSubmittingReport(false);
    }
  };

  const renderReplyQuote = (item: Message, isMe: boolean) => {
    const reply = item.replyTo;
    if (!reply?.messageId) return null;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => jumpToMessage(String(reply.messageId))}
        style={[styles.replyQuote, isMe ? styles.replyQuoteMe : styles.replyQuoteOther]}
      >
        <Text
          style={[styles.replyQuoteName, isMe ? styles.replyQuoteNameMe : styles.replyQuoteNameOther]}
          numberOfLines={1}
        >
          {replySenderLabel(reply.sender)}
        </Text>
        <Text
          style={[styles.replyQuoteText, isMe ? styles.replyQuoteTextMe : styles.replyQuoteTextOther]}
          numberOfLines={2}
          textBreakStrategy="simple"
        >
          {replySnippet(reply)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = String(item.sender) === String(currentUserId);
    const timeText = formatMessageTime(item.createdAt);
    const canReply = !slotBlocked && !isChatBlocked;
    const highlightStyle = highlightedId === item._id ? styles.messageHighlighted : null;

    if (item.messageType === 'call_request') {
      if (isMe) {
        return (
          <View style={[styles.messageWrapper, styles.meWrapper]}>
            <View style={[styles.bubble, styles.meBubble, styles.callRequestBubble]}>
              <View style={styles.callRequestHeader}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={[styles.messageText, styles.meMessageText, styles.callRequestTitle]}>
                  {t('chat.callRequestSentBubble')}
                </Text>
              </View>
              <Text style={[styles.callRequestSub, styles.meTimeText]}>
                {t('chat.waitingForCallback')}
              </Text>
              <Text
                style={[styles.timeText, styles.meTimeText]}
                allowFontScaling={false}
              >
                {timeText}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <View style={[styles.messageWrapper, styles.otherWrapper]}>
          <View style={[styles.bubble, styles.otherBubble, styles.callRequestIncoming]}>
            <View style={styles.callRequestHeader}>
              <Ionicons name="call" size={18} color="#FF9500" />
              <Text style={[styles.messageText, styles.otherMessageText, styles.callRequestTitleDark]}>
                {t('chat.incomingCallRequest')}
              </Text>
            </View>
            <Text style={styles.callRequestSubDark}>
              {t('callRequest.phoneHidden')}
            </Text>
            {item.callRequestStatus === 'pending' ? (
              <View style={styles.callRequestActions}>
                <TouchableOpacity
                  style={styles.callAcceptBtn}
                  onPress={() => handleAcceptCallRequest(item._id)}
                  disabled={respondingCallId === item._id}
                >
                  {respondingCallId === item._id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={styles.callAcceptText}>{t('common.call')}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.callDeclineBtn}
                  onPress={() => handleDeclineCallRequest(item._id)}
                  disabled={respondingCallId === item._id}
                >
                  <Text style={styles.callDeclineText}>{t('callRequest.decline')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.callRequestStatusText}>{item.text}</Text>
            )}
            <Text
              style={[styles.timeText, styles.otherTimeText]}
              allowFontScaling={false}
            >
              {timeText}
            </Text>
          </View>
        </View>
      );
    }

    if (item.messageType === 'image' && item.mediaUrl) {
      return (
        <SwipeToReply onReply={() => startReply(item)} enabled={canReply}>
          <View style={[styles.messageWrapper, isMe ? styles.meWrapper : styles.otherWrapper, highlightStyle]}>
            <Pressable
              style={[styles.bubble, isMe ? styles.meBubble : styles.otherBubble, styles.mediaBubble]}
              onLongPress={() => startReply(item)}
              disabled={!canReply}
            >
              {renderReplyQuote(item, isMe)}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setPreviewImageUrl(item.mediaUrl!)}
                onLongPress={canReply ? () => startReply(item) : undefined}
              >
                <Image source={{ uri: item.mediaUrl }} style={styles.chatImage} resizeMode="cover" />
              </TouchableOpacity>
              {item.text ? (
                <Text
                  style={[styles.messageText, isMe ? styles.meMessageText : styles.otherMessageText, styles.mediaCaption]}
                  textBreakStrategy="simple"
                >
                  {phonetic(item.text)}
                </Text>
              ) : null}
              <Text
                style={[styles.timeText, isMe ? styles.meTimeText : styles.otherTimeText, styles.mediaTime]}
                allowFontScaling={false}
              >
                {timeText}
              </Text>
            </Pressable>
          </View>
        </SwipeToReply>
      );
    }

    if (item.messageType === 'location' && item.location) {
      const sharedLocation = item.location;
      return (
        <SwipeToReply onReply={() => startReply(item)} enabled={canReply}>
          <View style={[styles.messageWrapper, isMe ? styles.meWrapper : styles.otherWrapper, highlightStyle]}>
            <Pressable
              style={[styles.bubble, isMe ? styles.meBubble : styles.otherBubble, styles.locationBubble]}
              onPress={() => openLocation(sharedLocation)}
              onLongPress={canReply ? () => startReply(item) : undefined}
              accessibilityRole="link"
              accessibilityLabel={t('chat.openInGoogleMaps')}
            >
              {renderReplyQuote(item, isMe)}
              <View style={styles.locationCard}>
                <View style={[styles.locationIcon, isMe ? styles.locationIconMe : styles.locationIconOther]}>
                  <Ionicons name="location" size={22} color={isMe ? '#FF9500' : '#fff'} />
                </View>
                <View style={styles.locationInfo}>
                  <Text
                    style={[styles.locationTitle, isMe ? styles.meMessageText : styles.otherMessageText]}
                    numberOfLines={1}
                  >
                    {t('chatList.location')}
                  </Text>
                  <Text
                    style={[styles.locationAddress, isMe ? styles.locationAddressMe : styles.locationAddressOther]}
                    numberOfLines={2}
                  >
                    {sharedLocation.address
                      ? phonetic(sharedLocation.address)
                      : `${sharedLocation.lat.toFixed(5)}, ${sharedLocation.lng.toFixed(5)}`}
                  </Text>
                </View>
              </View>
              <View style={[styles.locationLinkRow, isMe ? styles.locationLinkRowMe : styles.locationLinkRowOther]}>
                <Ionicons name="map-outline" size={15} color={isMe ? '#fff' : '#FF9500'} />
                <Text style={[styles.locationLinkText, isMe ? styles.locationLinkTextMe : styles.locationLinkTextOther]}>
                  {t('chat.openInGoogleMaps')}
                </Text>
              </View>
              <Text
                style={[styles.timeText, isMe ? styles.meTimeText : styles.otherTimeText, styles.mediaTime]}
                allowFontScaling={false}
              >
                {timeText}
              </Text>
            </Pressable>
          </View>
        </SwipeToReply>
      );
    }

    if (item.messageType === 'audio' && item.mediaUrl) {
      return (
        <SwipeToReply onReply={() => startReply(item)} enabled={canReply}>
          <View style={[styles.messageWrapper, isMe ? styles.meWrapper : styles.otherWrapper, highlightStyle]}>
            <Pressable
              style={[styles.bubble, isMe ? styles.meBubble : styles.otherBubble, styles.mediaBubble]}
              onLongPress={() => startReply(item)}
              disabled={!canReply}
            >
              {renderReplyQuote(item, isMe)}
              <AudioMessageBubble uri={item.mediaUrl} duration={item.mediaDuration} isMe={isMe} />
              {item.text ? (
                <Text
                  style={[styles.messageText, isMe ? styles.meMessageText : styles.otherMessageText, styles.mediaCaption]}
                  textBreakStrategy="simple"
                >
                  {phonetic(item.text)}
                </Text>
              ) : null}
              <Text
                style={[styles.timeText, isMe ? styles.meTimeText : styles.otherTimeText, styles.mediaTime]}
                allowFontScaling={false}
              >
                {timeText}
              </Text>
            </Pressable>
          </View>
        </SwipeToReply>
      );
    }

    return (
      <SwipeToReply onReply={() => startReply(item)} enabled={canReply}>
        <View style={[styles.messageWrapper, isMe ? styles.meWrapper : styles.otherWrapper, highlightStyle]}>
          <View style={styles.messageRow}>
            <Pressable
              style={[styles.bubble, isMe ? styles.meBubble : styles.otherBubble]}
              onLongPress={() => startReply(item)}
              disabled={!canReply}
            >
              {renderReplyQuote(item, isMe)}
              <Text
                style={[styles.messageText, isMe ? styles.meMessageText : styles.otherMessageText]}
                textBreakStrategy="simple"
              >
                {phonetic(item.text)}
              </Text>
              <View style={styles.messageFooter}>
                <Text
                  style={[styles.timeText, isMe ? styles.meTimeText : styles.otherTimeText]}
                  allowFontScaling={false}
                >
                  {timeText}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </SwipeToReply>
    );
  };

  const showSlotTimer =
    !isSubscribed && !slotBlocked && (!!expiresAt || isPinned);

  const invertedMessages = useMemo(
    () => (Array.isArray(messages) ? [...messages] : []).reverse(),
    [messages]
  );

  const jumpToMessage = (messageId: string) => {
    const index = invertedMessages.findIndex((m) => m._id === messageId);
    if (index < 0) return;
    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setHighlightedId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent={Platform.OS === 'android' ? false : undefined}
        backgroundColor={Platform.OS === 'android' ? '#fff' : 'transparent'}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            router.back();
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerUser}>
          <View style={styles.avatar}>
            {typeof avatarUrl === 'string' && avatarUrl.trim() ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{(headerName !== name && headerName?.[0]) || avatarLetter || 'R'}</Text>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{headerName || t('common.chat')}</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDotSmall} />
              <Text style={styles.headerStatus}>
                {isPinned ? t('chat.pinned') : t('chat.online')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleHeaderCallRequest}
            disabled={!receiverId || slotBlocked || isChatBlocked || requestingCall}
          >
            {requestingCall ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="call-outline" size={22} color="#000" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowChatMenu(true)}
            disabled={!receiverId}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {isChatBlocked && (
        <View style={styles.blockedBanner}>
          <Ionicons name="ban-outline" size={18} color="#B91C1C" />
          <Text style={styles.blockedBannerText}>
            {blockMessage || t('chat.messagingNotAvailable')}
          </Text>
          {blockedByMe && receiverId && (
            <TouchableOpacity onPress={handleUnblockUser}>
              <Text style={styles.unblockLink}>{t('common.unblock')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        // Without keyboard-controller, Android's adjustResize already shrinks the window
        behavior={Platform.OS === 'ios' || isKeyboardControllerLinked ? 'padding' : undefined}
      >
      <View style={styles.messagesArea}>
        {showSlotTimer && (
          <View style={styles.timerFloat} pointerEvents="box-none">
            <View style={styles.timerBar}>
              <Ionicons
                name={expiresAt ? 'time-outline' : 'bookmark'}
                size={12}
                color="#EF4444"
              />
              <Text style={styles.timerText}>
                {expiresAt ? timeLeft : t('chat.pinned')}
              </Text>
              <TouchableOpacity
                onPress={showVanishingInfo}
                style={styles.timerInfoBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={14} color="#FF9500" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF9500" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {t('chat.emptyConversation')}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            inverted
            data={invertedMessages}
            keyExtractor={(item) => item._id}
            style={styles.messagesFlex}
            contentContainerStyle={[
              styles.messagesList,
              showSlotTimer ? { paddingBottom: 40 } : null,
            ]}
            extraData={`${currentUserId}:${highlightedId}:${slotBlocked}:${isChatBlocked}`}
            renderItem={renderMessage}
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              // Target row not measured yet: jump near it, then retry once rows render.
              flatListRef.current?.scrollToOffset({
                offset: averageItemLength * index,
                animated: false,
              });
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
              }, 250);
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 80,
            }}
          />
        )}
      </View>

        <View
          style={[
            styles.inputBar,
            { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 10) },
          ]}
        >
          {showEmojiPicker && !isRecording && (
            <View style={styles.emojiDock}>
              <ChatEmojiPicker onSelect={handleSelectEmoji} />
            </View>
          )}

          {showAttachMenu && !isRecording && (
            <View style={styles.attachMenu}>
              <TouchableOpacity style={styles.attachOption} onPress={pickImage} activeOpacity={0.8}>
                <View style={[styles.attachOptionIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="image" size={24} color="#fff" />
                </View>
                <Text style={styles.attachOptionLabel}>{t('chatList.photo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachOption} onPress={shareLocation} activeOpacity={0.8}>
                <View style={[styles.attachOptionIcon, { backgroundColor: '#22C55E' }]}>
                  <Ionicons name="location" size={24} color="#fff" />
                </View>
                <Text style={styles.attachOptionLabel}>{t('chatList.location')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {replyingTo && !isRecording && (
            <View style={styles.replyPreview}>
              <View style={styles.replyPreviewAccent} />
              <View style={styles.replyPreviewBody}>
                <Text style={styles.replyPreviewName} numberOfLines={1}>
                  {replySenderLabel(replyingTo.sender)}
                </Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {replySnippet(replyingTo)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t('chat.cancelReply')}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {isRecording ? (
            <View style={styles.recordingBar}>
              <TouchableOpacity onPress={cancelRecording} style={styles.recordingCancelBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
              <View style={styles.recordingCenter}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {t('chat.recording', { duration: formatAudioDuration(recordingSeconds) })}
                </Text>
              </View>
              <TouchableOpacity onPress={stopRecordingAndSend} style={styles.sendBtn}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.attachBtn,
                  (slotBlocked || isChatBlocked || isSending || isSharingLocation) &&
                    styles.attachBtnDisabled,
                ]}
                onPress={toggleAttachMenu}
                disabled={slotBlocked || isChatBlocked || isSending || isSharingLocation}
                accessibilityLabel={t('chat.attach')}
              >
                {isSharingLocation ? (
                  <ActivityIndicator size="small" color="#FF9500" />
                ) : (
                  <Ionicons
                    name={showAttachMenu ? 'close' : 'add'}
                    size={26}
                    color={showAttachMenu ? '#FF9500' : '#64748B'}
                  />
                )}
              </TouchableOpacity>

              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={
                  isChatBlocked
                    ? t('chat.messagingBlocked')
                    : slotBlocked
                      ? t('chat.noFreeSlots')
                      : t('chat.inputPlaceholder')
                }
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!slotBlocked && !isChatBlocked}
                onFocus={() => {
                  setShowEmojiPicker(false);
                  setShowAttachMenu(false);
                  scrollToLatest();
                }}
              />

              <TouchableOpacity
                style={styles.emojiBtnInline}
                onPress={toggleEmojiPicker}
                disabled={slotBlocked || isChatBlocked}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons
                  name={showEmojiPicker ? 'happy' : 'happy-outline'}
                  size={22}
                  color={showEmojiPicker ? '#FF9500' : '#64748B'}
                />
              </TouchableOpacity>

              {inputText.trim() ? (
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (isSending || slotBlocked || isChatBlocked) && styles.sendBtnDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={isSending || slotBlocked || isChatBlocked}
                >
                  {isSending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (isSending || slotBlocked || isChatBlocked) && styles.sendBtnDisabled,
                  ]}
                  onPress={startRecording}
                  disabled={isSending || slotBlocked || isChatBlocked}
                >
                  {isSending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="mic" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {isClaimingSlot ? (
        <View style={styles.claimingOverlay}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={styles.claimingText}>{t('chat.openingChat')}</Text>
        </View>
      ) : null}

      <Modal visible={showChatMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowChatMenu(false)}
        >
          <View style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {blockedByMe ? (
              <TouchableOpacity style={styles.menuItem} onPress={handleUnblockUser}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#00A300" />
                <Text style={styles.menuItemText}>{t('chat.unblockUser')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                <Ionicons name="ban-outline" size={20} color="#EF4444" />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>{t('chat.blockUser')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowChatMenu(false);
                setShowReportModal(true);
              }}
            >
              <Ionicons name="flag-outline" size={20} color="#FF9500" />
              <Text style={styles.menuItemText}>{t('chat.reportUser')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCancel} onPress={() => setShowChatMenu(false)}>
              <Text style={styles.menuCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!voiceNotice} transparent animationType="fade">
        <View style={styles.voiceNoticeOverlay}>
          <View style={styles.voiceNoticeSheet}>
            <Text style={styles.voiceNoticeTitle}>{voiceNotice?.title}</Text>
            <Text style={styles.voiceNoticeMessage}>{voiceNotice?.message}</Text>
            <View style={styles.voiceNoticeActions}>
              {voiceNotice?.showSettings ? (
                <TouchableOpacity
                  style={styles.voiceNoticeSecondaryBtn}
                  onPress={() => {
                    setVoiceNotice(null);
                    void Linking.openSettings();
                  }}
                >
                  <Text style={styles.voiceNoticeSecondaryBtnText}>{t('chat.openSettings')}</Text>
                </TouchableOpacity>
              ) : null}
              {voiceNotice?.onConfirm ? (
                <TouchableOpacity
                  style={styles.voiceNoticeSecondaryBtn}
                  onPress={() => setVoiceNotice(null)}
                >
                  <Text style={styles.voiceNoticeSecondaryBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.voiceNoticeBtn}
                onPress={() => {
                  const onConfirm = voiceNotice?.onConfirm;
                  setVoiceNotice(null);
                  onConfirm?.();
                }}
              >
                <Text style={styles.voiceNoticeBtnText}>
                  {voiceNotice?.confirmLabel || t('common.ok')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReportModal
        visible={showReportModal}
        title={t('chat.reportUser')}
        subtitle={t('chat.reportSubtitle')}
        submitting={submittingReport}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleSubmitReport}
      />

      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <TouchableOpacity
            style={[styles.imagePreviewBackBtn, { top: insets.top + 8 }]}
            onPress={() => setPreviewImageUrl(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.imagePreviewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerBtn: {
    padding: 5,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEAD1',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -2,
  },
  onlineDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  headerStatus: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d1d5db',
  },
  emojiDock: {
    width: '100%',
    marginBottom: 8,
  },
  attachMenu: {
    width: '100%',
    flexDirection: 'row',
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachOption: {
    alignItems: 'center',
    gap: 6,
  },
  attachOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachOptionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#334155',
  },
  replyPreview: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 8,
    paddingRight: 12,
    overflow: 'hidden',
    gap: 10,
  },
  replyPreviewAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#FF9500',
    borderRadius: 2,
  },
  replyPreviewBody: {
    flex: 1,
  },
  replyPreviewName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 17,
    color: '#FF9500',
  },
  replyPreviewText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 17,
    color: '#475569',
  },
  replyQuote: {
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 6,
    minWidth: 120,
  },
  replyQuoteMe: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderLeftColor: '#fff',
  },
  replyQuoteOther: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderLeftColor: '#FF9500',
  },
  replyQuoteName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  replyQuoteNameMe: {
    color: '#fff',
  },
  replyQuoteNameOther: {
    color: '#FF9500',
  },
  replyQuoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 17,
  },
  replyQuoteTextMe: {
    color: 'rgba(255,255,255,0.9)',
  },
  replyQuoteTextOther: {
    color: '#475569',
  },
  messageHighlighted: {
    backgroundColor: 'rgba(255,149,0,0.15)',
    borderRadius: 12,
  },
  timerFloat: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
    elevation: 6,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
  },
  timerInfoBtn: {
    padding: 0,
    marginLeft: 2,
  },
  actionBtn: {
    padding: 8,
  },
  keyboardView: { flex: 1 },
  messagesArea: { flex: 1 },
  claimingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 249, 250, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  claimingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  messagesFlex: { flex: 1 },
  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  emptyText: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    flexShrink: 1,
    ...preventAndroidTextClip({ paddingEnd: 6 }),
  },
  bottomBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingBottom: 10,
    paddingTop: 4,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 25,
  },
  dateBadge: {
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  messageWrapper: {
    marginBottom: 10,
    width: '100%',
  },
  meWrapper: {
    alignItems: 'flex-end',
  },
  otherWrapper: {
    alignItems: 'flex-start',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  bubble: {
    flexShrink: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingRight: 16,
    borderRadius: 20,
    overflow: 'visible',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#FFEAD1',
    borderBottomLeftRadius: 4,
  },
  meBubble: {
    backgroundColor: '#FF9500',
    borderBottomRightRadius: 4,
  },
  // Bundled font: OEM system fonts on some Android phones render wider than RN measures, clipping words.
  messageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  meMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1A1A1A',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingRight: 2,
  },
  timeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 0,
    includeFontPadding: false,
    textAlign: 'right',
  },
  meTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTimeText: {
    color: '#888',
  },
  callRequestBubble: {
    maxWidth: '85%',
  },
  callRequestIncoming: {
    maxWidth: '85%',
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  callRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  callRequestTitle: {
    fontFamily: 'Inter_700Bold',
    flexShrink: 1,
  },
  callRequestTitleDark: {
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    flexShrink: 1,
  },
  callRequestSub: {
    fontSize: 12,
    marginBottom: 6,
  },
  callRequestSubDark: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  callRequestStatusText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
  },
  callRequestActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  callAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00A300',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
    justifyContent: 'center',
  },
  callAcceptText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  callDeclineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  callDeclineText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  inputOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  attachBtn: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  attachBtnDisabled: {
    opacity: 0.5,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 22,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  recordingCancelBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B91C1C',
  },
  recordingSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2762ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaBubble: {
    padding: 6,
    maxWidth: '78%',
  },
  chatImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewBackBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  mediaCaption: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  mediaTime: {
    marginTop: 4,
    paddingHorizontal: 4,
    alignSelf: 'flex-end',
  },
  locationBubble: {
    padding: 8,
    width: 250,
    maxWidth: '78%',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIconMe: {
    backgroundColor: '#fff',
  },
  locationIconOther: {
    backgroundColor: '#FF9500',
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  locationAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  locationAddressMe: {
    color: 'rgba(255,255,255,0.9)',
  },
  locationAddressOther: {
    color: '#475569',
  },
  locationLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  locationLinkRowMe: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  locationLinkRowOther: {
    backgroundColor: '#FFF5E6',
  },
  locationLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  locationLinkTextMe: {
    color: '#fff',
  },
  locationLinkTextOther: {
    color: '#FF9500',
  },
  audioBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 160,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  audioWave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 28,
  },
  audioWaveBar: {
    width: 3,
    borderRadius: 2,
  },
  audioWaveBarMe: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  audioWaveBarOther: {
    backgroundColor: '#FF9500',
  },
  audioDuration: {
    fontSize: 13,
    fontWeight: '600',
  },
  voiceNoticeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  voiceNoticeSheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  voiceNoticeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  voiceNoticeMessage: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  voiceNoticeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  voiceNoticeSecondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  voiceNoticeSecondaryBtnText: {
    color: '#FF9500',
    fontWeight: '700',
    fontSize: 15,
  },
  voiceNoticeBtn: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  voiceNoticeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 23,
    paddingLeft: 16,
    paddingRight: 6,
    height: 46,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingLeft: 20,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#000',
  },
  emojiBtnInline: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2762ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#2762ea',
  },
  sendBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  blockedBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
  },
  unblockLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9500',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuCancel: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
});
