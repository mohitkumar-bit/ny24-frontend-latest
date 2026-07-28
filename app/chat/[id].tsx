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
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
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

interface Message {
  _id: string;
  text: string;
  sender: string;
  receiver?: string;
  createdAt: string;
  messageType?: 'text' | 'call_request' | 'image' | 'audio';
  callRequestStatus?: 'pending' | 'accepted' | 'declined';
  mediaUrl?: string;
  mediaDuration?: number;
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
      Alert.alert('Playback failed', 'Could not play this voice message.');
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
  const params = useLocalSearchParams();
  const { id, name, avatarLetter, avatarUrl, receiverId: paramReceiverId, isSubscribed: paramIsSubscribed } = params;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

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
  const [reportReason, setReportReason] = useState('Harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState<{ title: string; message: string } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Same keyboard docking as client chat (absolute input + keyboardOffset lift)
  useEffect(() => {
    const applyKeyboardHeight = (keyboardY: number, keyboardHeight: number) => {
      const windowH = Dimensions.get('window').height;
      const fromScreen =
        keyboardY > 0 ? Math.max(0, windowH - keyboardY) : keyboardHeight;
      const lift = Math.max(fromScreen, keyboardHeight, 0);
      setKeyboardOffset(lift);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      applyKeyboardHeight(e.endCoordinates.screenY, e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    let removeWeb: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const vv = window.visualViewport;
      const syncWeb = () => {
        if (!vv) {
          setKeyboardOffset(0);
          return;
        }
        const lift = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        setKeyboardOffset(lift > 80 ? lift : 0);
      };
      vv?.addEventListener('resize', syncWeb);
      vv?.addEventListener('scroll', syncWeb);
      window.addEventListener('resize', syncWeb);
      removeWeb = () => {
        vv?.removeEventListener('resize', syncWeb);
        vv?.removeEventListener('scroll', syncWeb);
        window.removeEventListener('resize', syncWeb);
      };
    }

    return () => {
      onShow.remove();
      onHide.remove();
      removeWeb?.();
    };
  }, []);
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  useAudioRecorderState(audioRecorder);

  const REPORT_REASONS = [
    'Harassment',
    'Spam',
    'Scam or fraud',
    'Inappropriate content',
    'Other',
  ];

  useEffect(() => {
    if (id && id !== 'new') {
      setActiveConversationId(id as string);
    }
    if (paramReceiverId) {
      setReceiverId(paramReceiverId as string);
    }
  }, [id, paramReceiverId]);

  useFocusEffect(
    useCallback(() => {
      const conversationId =
        activeConversationId || (id && id !== 'new' ? String(id) : null);
      setGlobalActiveConversationId(conversationId);

      return () => {
        setGlobalActiveConversationId(null);
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
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, isSubscribed, slotBlocked]);

  useEffect(() => {
    if (slotBlocked) return;
    const interval = setInterval(fetchMsgs, 5000);
    return () => clearInterval(interval);
  }, [activeConversationId, slotBlocked]);

  const loadUserAndClaimSlot = async () => {
    try {
      setIsClaimingSlot(true);
      const user = await authService.getProfile();
      if (user) {
        const userId = user._id || user.id;
        setCurrentUserId(userId);
        const subscribed = user.subscription?.status === 'active';
        setIsSubscribed(subscribed);

        if (subscribed) {
          setIsClaimingSlot(false);
          setIsLoading(false);
          fetchMsgs();
          return;
        }
      }

      const claimParams: { conversationId?: string; receiverId?: string } = {};
      if (id && id !== 'new') {
        claimParams.conversationId = id as string;
      }
      if (paramReceiverId) {
        claimParams.receiverId = paramReceiverId as string;
      } else if (id && id !== 'new') {
        claimParams.receiverId = id as string;
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
      fetchMsgs();
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
      const msg = data?.message || 'Unable to open this chat';

      if (code === 'CHAT_LIMIT_REACHED') {
        setSlotBlocked(true);
        Alert.alert(
          'All Chat Slots Full',
          msg,
          [
            { text: 'Go Back', onPress: () => router.back() },
            { text: 'Upgrade', onPress: () => router.push('/subscription' as any) },
          ]
        );
      } else if (code === 'USER_BLOCKED') {
        setIsChatBlocked(true);
        setBlockedByMe(!!data?.blockedByMe);
        setBlockMessage(msg);
      } else {
        Alert.alert('Error', msg, [{ text: 'OK', onPress: () => router.back() }]);
      }
    }
  };

  const fetchMsgs = async () => {
    const fetchId = activeConversationId || (id === 'new' ? receiverId : id);

    if (!fetchId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getMessages(fetchId as string);
      setMessages(data);

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
      'Chat Slot Timer',
      isPinned
        ? 'This chat is pinned and keeps its slot until you unpin it.'
        : `This chat uses one of your 3 free slots for 24 hours from when you opened it.\n\nTime remaining: ${timeLeft}\n\nPin the chat to keep the slot after 24 hours, or upgrade for more slots.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/subscription' as any) },
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
        isSessionReplaced ? 'Signed In Elsewhere' : 'Session Expired',
        isSessionReplaced
          ? 'This account was signed in on another device. Sign in again on this phone to continue.'
          : 'Please login again to continue chatting.',
        [{ text: 'OK', onPress: () => router.replace('/auth/login' as any) }]
      );
    } else if (errorCode === 'CHAT_LIMIT_REACHED') {
      Alert.alert('All Chat Slots Full', serverMsg || 'Wait for a slot to expire or upgrade.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/subscription' as any) },
      ]);
    } else if (errorCode === 'USER_BLOCKED') {
      setIsChatBlocked(true);
      setBlockedByMe(!!serverError?.blockedByMe);
      setBlockMessage(serverMsg || 'Messaging is blocked for this chat.');
    } else {
      Alert.alert('Message Failed', serverMsg || error.message || 'Could not send');
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
      });

      applySendResponse(response);
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

    try {
      setIsSending(true);
      setShowEmojiPicker(false);
      const caption = inputText.trim();
      if (caption) setInputText('');

      const upload = await uploadChatMedia(uri, mimeType, filename);
      const response = await sendMessage({
        receiverId: (receiverId as string) || undefined,
        conversationId: activeConversationId || undefined,
        text: caption || undefined,
        mediaUrl: upload.mediaUrl,
        messageType: upload.messageType,
        mediaDuration: duration,
      });

      applySendResponse(response);
    } catch (error: any) {
      handleSendError(error);
    } finally {
      setIsSending(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    setShowAttachMenu(false);
    setShowEmojiPicker(false);
    if (slotBlocked || isChatBlocked || isSending) return;

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to send photos.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });

    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    await sendMediaMessage(
      asset.uri,
      asset.mimeType || 'image/jpeg',
      `chat-${Date.now()}.jpg`
    );
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

  const showVoiceNotice = (title: string, message: string) => {
    setVoiceNotice({ title, message });
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
        showVoiceNotice('Chat unavailable', 'No free chat slots. Upgrade or wait for a slot to open.');
      } else if (isChatBlocked) {
        showVoiceNotice('Messaging blocked', blockMessage || 'You cannot message this user.');
      }
      return;
    }

    if (!receiverId && !activeConversationId) {
      showVoiceNotice('Chat not ready', 'Please wait for the chat to load.');
      return;
    }

    try {
      if (Platform.OS === 'web') {
        if (!navigator.mediaDevices?.getUserMedia) {
          showVoiceNotice('Not supported', 'Voice recording is not supported in this browser.');
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
        showVoiceNotice(
          'Permission needed',
          'Allow microphone access in settings to send voice messages.'
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
      showVoiceNotice('Recording failed', 'Could not start voice recording. Try again.');
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
      showVoiceNotice('Too short', 'Record for at least one second before sending.');
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
        showVoiceNotice('Recording failed', 'No audio was captured. Please try again.');
        return;
      }

      await sendMediaMessage(uri, 'audio/m4a', `voice-${Date.now()}.m4a`, duration);
    } catch (error) {
      console.error('Voice recording send failed:', error);
      showVoiceNotice('Recording failed', 'Could not send voice message. Please try again.');
    }
  };

  const handleAcceptCallRequest = async (messageId: string) => {
    setRespondingCallId(messageId);
    try {
      const { phone } = await callRequestService.accept(messageId);
      await fetchMsgs();
      Linking.openURL(`tel:${phone}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not start call');
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
      Alert.alert('Error', error.response?.data?.message || 'Could not decline request');
    } finally {
      setRespondingCallId(null);
    }
  };

  const handleHeaderCallRequest = async () => {
    if (!receiverId) {
      Alert.alert('Error', 'Call is not available for this chat yet.');
      return;
    }

    if (currentUserId && String(currentUserId) === String(receiverId)) {
      Alert.alert('Error', 'You cannot call yourself');
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
      Alert.alert('Call request sent', 'The user will get a call request in chat.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send call request');
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
      setBlockMessage('You blocked this user. Unblock them to send messages.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not block user');
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
      Alert.alert('Error', error.response?.data?.message || 'Could not unblock user');
    }
  };

  const handleSubmitReport = async () => {
    if (!receiverId || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await reportUser({
        reportedUserId: receiverId as string,
        conversationId: activeConversationId || undefined,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setShowReportModal(false);
      setReportDetails('');
      setShowChatMenu(false);
      Alert.alert(
        'Report submitted',
        'Thank you. Our team will review this report and take action if needed.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = String(item.sender) === String(currentUserId);
    const date = new Date(item.createdAt);
    const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (item.messageType === 'call_request') {
      if (isMe) {
        return (
          <View style={[styles.messageWrapper, styles.meWrapper]}>
            <View style={[styles.bubble, styles.meBubble, styles.callRequestBubble]}>
              <View style={styles.callRequestHeader}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={[styles.messageText, styles.meMessageText, styles.callRequestTitle]}>
                  Call request has been sent
                </Text>
              </View>
              <Text style={[styles.callRequestSub, styles.meTimeText]}>
                Waiting for them to call you back
              </Text>
              <Text style={[styles.timeText, styles.meTimeText]}>{timeText}</Text>
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
                Incoming call request
              </Text>
            </View>
            <Text style={styles.callRequestSubDark}>
              Phone number hidden until you tap Call
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
                      <Text style={styles.callAcceptText}>Call</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.callDeclineBtn}
                  onPress={() => handleDeclineCallRequest(item._id)}
                  disabled={respondingCallId === item._id}
                >
                  <Text style={styles.callDeclineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.callRequestStatusText}>{item.text}</Text>
            )}
            <Text style={[styles.timeText, styles.otherTimeText]}>{timeText}</Text>
          </View>
        </View>
      );
    }

    if (item.messageType === 'image' && item.mediaUrl) {
      return (
        <View style={[styles.messageWrapper, isMe ? styles.meWrapper : styles.otherWrapper]}>
          <View style={[styles.bubble, isMe ? styles.meBubble : styles.otherBubble, styles.mediaBubble]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setPreviewImageUrl(item.mediaUrl!)}
            >
              <Image source={{ uri: item.mediaUrl }} style={styles.chatImage} resizeMode="cover" />
            </TouchableOpacity>
            {item.text ? (
              <Text style={[styles.messageText, isMe ? styles.meMessageText : styles.otherMessageText, styles.mediaCaption]}>
                {item.text}
              </Text>
            ) : null}
            <Text style={[styles.timeText, isMe ? styles.meTimeText : styles.otherTimeText, styles.mediaTime]}>
              {timeText}
            </Text>
          </View>
        </View>
      );
    }

    if (item.messageType === 'audio' && item.mediaUrl) {
      return (
        <View style={[styles.messageWrapper, isMe ? styles.meWrapper : styles.otherWrapper]}>
          <View style={[styles.bubble, isMe ? styles.meBubble : styles.otherBubble, styles.mediaBubble]}>
            <AudioMessageBubble uri={item.mediaUrl} duration={item.mediaDuration} isMe={isMe} />
            {item.text ? (
              <Text style={[styles.messageText, isMe ? styles.meMessageText : styles.otherMessageText, styles.mediaCaption]}>
                {item.text}
              </Text>
            ) : null}
            <Text style={[styles.timeText, isMe ? styles.meTimeText : styles.otherTimeText, styles.mediaTime]}>
              {timeText}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageWrapper, isMe ? styles.meWrapper : styles.otherWrapper]}>
        <View style={styles.messageRow}>
          <View style={[styles.bubble, isMe ? styles.meBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isMe ? styles.meMessageText : styles.otherMessageText]}>
              {item.text}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.timeText, isMe ? styles.meTimeText : styles.otherTimeText]}>
                {timeText}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const showSlotTimer =
    !isSubscribed && !slotBlocked && (!!expiresAt || isPinned);

  // Newest first for inverted FlatList (WhatsApp-style: latest at bottom)
  const listMessages = useMemo(() => [...messages].reverse(), [messages]);
  const listBottomPad =
    72 + (keyboardOffset > 0 ? keyboardOffset : insets.bottom);
  const listTopPad = showSlotTimer ? 40 : 4;

  if (isClaimingSlot) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={{ marginTop: 12, color: '#64748B' }}>Opening chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent={Platform.OS === 'android' ? false : undefined}
        backgroundColor={Platform.OS === 'android' ? '#fff' : 'transparent'}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerUser}>
          <View style={styles.avatar}>
            {typeof avatarUrl === 'string' && avatarUrl.trim() ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarLetter || 'R'}</Text>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDotSmall} />
              <Text style={styles.headerStatus}>
                {isPinned ? 'Pinned' : 'Online'}
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
            {blockMessage || 'Messaging is not available for this chat.'}
          </Text>
          {blockedByMe && receiverId && (
            <TouchableOpacity onPress={handleUnblockUser}>
              <Text style={styles.unblockLink}>Unblock</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.keyboardView}>
        {showSlotTimer && (
          <View style={styles.timerFloat} pointerEvents="box-none">
            <View style={styles.timerBar}>
              <Ionicons
                name={expiresAt ? 'time-outline' : 'bookmark'}
                size={12}
                color="#EF4444"
              />
              <Text style={styles.timerText}>
                {expiresAt ? timeLeft : 'Pinned'}
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
        ) : (
          <FlatList
            ref={flatListRef}
            style={styles.messageList}
            data={listMessages}
            inverted
            extraData={currentUserId}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={[
              styles.listContent,
              {
                // inverted: paddingTop sits next to the input (visual bottom)
                paddingTop: listBottomPad,
                paddingBottom: listTopPad,
              },
            ]}
            ListEmptyComponent={() => (
              <View style={[styles.dateContainer, styles.invertedEmpty]}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateText}>Say hello to start the conversation</Text>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        <View
          style={[
            styles.inputBar,
            styles.inputBarDocked,
            {
              bottom: keyboardOffset > 0 ? keyboardOffset : 0,
              paddingBottom:
                keyboardOffset > 0 ? 10 : 10 + insets.bottom,
            },
          ]}
        >
          {showEmojiPicker && !isRecording && (
            <View style={styles.emojiDock}>
              <ChatEmojiPicker onSelect={handleSelectEmoji} />
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
                  Recording {formatAudioDuration(recordingSeconds)}
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
                  (slotBlocked || isChatBlocked || isSending) && styles.attachBtnDisabled,
                ]}
                onPress={() => setShowAttachMenu(true)}
                disabled={slotBlocked || isChatBlocked || isSending}
              >
                <Ionicons name="image-outline" size={22} color="#64748B" />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder={
                  isChatBlocked
                    ? 'Messaging blocked'
                    : slotBlocked
                      ? 'No free slots'
                      : 'Type a message'
                }
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!slotBlocked && !isChatBlocked}
                onFocus={() => {
                  setShowEmojiPicker(false);
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
      </View>

      <Modal visible={showAttachMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={[styles.attachSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity style={styles.attachOption} onPress={() => pickImage(false)}>
              <Ionicons name="images-outline" size={22} color="#FF9500" />
              <Text style={styles.attachOptionText}>Photo library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={() => pickImage(true)}>
              <Ionicons name="camera-outline" size={22} color="#FF9500" />
              <Text style={styles.attachOptionText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuCancel}
              onPress={() => setShowAttachMenu(false)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
                <Text style={styles.menuItemText}>Unblock user</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                <Ionicons name="ban-outline" size={20} color="#EF4444" />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Block user</Text>
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
              <Text style={styles.menuItemText}>Report user</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCancel} onPress={() => setShowChatMenu(false)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!voiceNotice} transparent animationType="fade">
        <View style={styles.voiceNoticeOverlay}>
          <View style={styles.voiceNoticeSheet}>
            <Text style={styles.voiceNoticeTitle}>{voiceNotice?.title}</Text>
            <Text style={styles.voiceNoticeMessage}>{voiceNotice?.message}</Text>
            <TouchableOpacity
              style={styles.voiceNoticeBtn}
              onPress={() => setVoiceNotice(null)}
            >
              <Text style={styles.voiceNoticeBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.reportOverlay}>
          <View style={[styles.reportSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <Text style={styles.reportTitle}>Report user</Text>
            <Text style={styles.reportSubtitle}>
              Tell us what happened. An admin will review and decide if action is needed.
            </Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonOption,
                    reportReason === reason && styles.reasonOptionActive,
                  ]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      reportReason === reason && styles.reasonOptionTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={styles.reportDetailsInput}
                placeholder="Additional details (optional)"
                placeholderTextColor="#94A3B8"
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
                numberOfLines={4}
              />
            </ScrollView>
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={styles.reportCancelBtn}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reportSubmitBtn}
                onPress={handleSubmitReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.reportSubmitText}>Submit report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

const styles = StyleSheet.create({
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
    backgroundColor: '#fff',
  },
  inputBarDocked: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d1d5db',
  },
  emojiDock: {
    width: '100%',
    marginBottom: 8,
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
  keyboardView: {
    flex: 1,
    position: 'relative',
  },
  messageList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  invertedEmpty: {
    transform: [{ scaleY: -1 }],
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
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
  messageText: {
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
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
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
    fontWeight: '700',
    flexShrink: 1,
  },
  callRequestTitleDark: {
    fontWeight: '700',
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
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
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
  attachSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  attachOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
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
  voiceNoticeBtn: {
    alignSelf: 'flex-end',
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
    marginLeft: 8,
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
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  reportSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  reasonOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  reasonOptionActive: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF8EE',
  },
  reasonOptionText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  reasonOptionTextActive: {
    color: '#FF9500',
    fontWeight: '700',
  },
  reportDetailsInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#0F172A',
    marginTop: 4,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  reportCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  reportSubmitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
