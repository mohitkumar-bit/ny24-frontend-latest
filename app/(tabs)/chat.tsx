import React, { useCallback, useMemo, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getConversations, togglePinConversation } from '../../services/chat.service';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { authService } from '../../services/auth.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LimitModal } from '@/components/LimitModal';

interface Chat {
  _id: string;
  otherUser: {
    _id: string;
    name: string;
    profilePicture?: string | null;
  };
  lastMessage?: {
    text: string;
    createdAt: string;
    messageType?: 'text' | 'call_request' | 'image' | 'audio';
  };
  lastMessageAt?: string;
  unreadCount?: number;
  isPinned?: boolean;
  hasActiveSlot?: boolean;
  createdAt: string;
  updatedAt?: string;
  slotInfo?: {
    openedAt?: string;
    expiresAt?: string | null;
    isPinned?: boolean;
  };
}

const FREE_VISIBLE_CHATS = 3;

const getLastMessagePreview = (chat: Chat) => {
  const msg = chat.lastMessage;
  if (!msg) return 'No messages yet';
  if (msg.messageType === 'image') return msg.text?.trim() || 'Photo';
  if (msg.messageType === 'audio') return msg.text?.trim() || 'Voice message';
  if (msg.messageType === 'call_request') return 'Call request';
  return msg.text || 'No messages yet';
};

const ChatItem = ({
  chat,
  index,
  isSubscribed,
  onRefresh,
}: {
  chat: Chat;
  index: number;
  isSubscribed: boolean;
  onRefresh: () => void;
}) => {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const avatarLetter = chat.otherUser.name.charAt(0).toUpperCase();
  const avatarUrl = chat.otherUser.profilePicture || null;
  // First 3 in list are visible; 4th+ show locked. Slots still used only when you open/send.
  const isLocked = !isSubscribed && index >= FREE_VISIBLE_CHATS;

  const getFormattedTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePinToggle = async () => {
    try {
      await togglePinConversation(chat._id);
      setMenuVisible(false);
      onRefresh();
    } catch (error: any) {
      const data = error.response?.data || error;
      if (data?.code === 'CHAT_LIMIT_REACHED') {
        Alert.alert('All Slots Full', data.message || 'Cannot pin — all chat slots are in use.');
      } else {
        Alert.alert('Error', data?.message || 'Could not update pin');
      }
    }
  };

  return (
    <View style={styles.chatItemWrapper}>
      <TouchableOpacity
        style={styles.chatItem}
        onLongPress={() => !isLocked && setMenuVisible(true)}
        onPress={() => {
          if (isLocked) {
            setUpgradeModalVisible(true);
            return;
          }
          router.push(
            `/chat/${chat._id}?name=${encodeURIComponent(chat.otherUser.name)}&avatarLetter=${encodeURIComponent(avatarLetter)}&avatarUrl=${encodeURIComponent(avatarUrl || '')}&receiverId=${chat.otherUser._id}&isSubscribed=${isSubscribed}`
          );
        }}
        activeOpacity={isLocked ? 1 : 0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            )}
          </View>
          {!isLocked && chat.isPinned && (
            <View style={styles.pinBadge}>
              <MaterialCommunityIcons name="pin" size={10} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatContentRow}>
            <View style={styles.chatTextColumn}>
              {!isLocked && (
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {chat.otherUser.name}
                  </Text>
                  {chat.isPinned && (
                    <MaterialCommunityIcons name="pin" size={16} color="#EF4444" style={{ marginLeft: 4 }} />
                  )}
                </View>
              )}

              {isLocked ? (
                <View style={styles.lockedMessageBox}>
                  <BlurView intensity={85} tint="light" style={styles.messageBlurLayer}>
                    <View style={styles.blurOverlay}>
                      <Ionicons name="lock-closed" size={15} color="#FF9500" />
                      <Text style={styles.blurText}>Upgrade to View</Text>
                    </View>
                  </BlurView>
                </View>
              ) : (
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {getLastMessagePreview(chat)}
                </Text>
              )}
            </View>

            <View style={styles.metaColumn}>
              <Text style={[styles.timeText, (chat.unreadCount ?? 0) > 0 ? styles.activeTimeText : null]}>
                {getFormattedTime(chat.lastMessageAt || chat.lastMessage?.createdAt)}
              </Text>
              {(chat.unreadCount ?? 0) > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {!isLocked ? (
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
        </TouchableOpacity>
      ) : (
        <View style={styles.menuBtnPlaceholder} />
      )}

      <LimitModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        onUpgrade={() => {
          setUpgradeModalVisible(false);
          router.push('/subscription' as any);
        }}
        title="Chat Locked"
        message="Free users can only open the top 3 chats. Upgrade to a subscription to view all messages and unlock more chat slots."
        plan="Free"
      />

      {/* Custom Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{chat.otherUser.name}</Text>
            <TouchableOpacity 
              style={styles.menuOption} 
              onPress={handlePinToggle}
            >
              <MaterialCommunityIcons 
                name={chat.isPinned ? "pin-off" : "pin"} 
                size={22} 
                color="#EF4444" 
              />
              <Text style={styles.menuOptionText}>
                {chat.isPinned ? "Unpin Chat" : "Pin Chat"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuOption, styles.cancelOption]} 
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [slotsUsed, setSlotsUsed] = useState(0);
  const [slotLimit, setSlotLimit] = useState(3);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((chat) => {
      const name = chat.otherUser?.name?.toLowerCase() || '';
      const preview = getLastMessagePreview(chat).toLowerCase();
      return name.includes(query) || preview.includes(query);
    });
  }, [conversations, searchQuery]);

  const openSearch = () => {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
  };

  const fetchData = async () => {
    try {
      const [data, profile] = await Promise.all([
        getConversations(),
        authService.getProfile()
      ]);
      
      // Use the isSubscribed status from either the chat API or the profile API
      const subStatus = data.isSubscribed || profile?.subscription?.status === 'active';
      const convs = data.conversations || [];
      
      setIsSubscribed(subStatus);
      const slotCount =
        data.slotsUsed ??
        (subStatus ? 0 : convs.filter((c: Chat) => c.hasActiveSlot).length);
      setSlotsUsed(slotCount);
      setSlotLimit(data.slotLimit ?? 3);

      setConversations(convs);
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      
      // Auto-refresh every 5 seconds while screen is focused
      const interval = setInterval(() => {
        fetchData();
      }, 5000);

      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Messages Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          {!isSubscribed && (
            <Text style={styles.slotsText}>
              {slotsUsed}/{slotLimit} chat slots used
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={openSearch}>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search chats..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={closeSearch} style={styles.searchCancelBtn}>
            <Text style={styles.searchCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF9500" />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <ChatItem 
              chat={item} 
              index={index}
              isSubscribed={isSubscribed} 
              onRefresh={fetchData}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF9500']} />
          }
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
              {searchQuery.trim() ? (
                <>
                  <Ionicons name="search-outline" size={64} color="#E2E8F0" />
                  <Text style={{ fontSize: 18, color: '#64748B', marginTop: 16 }}>No chats found</Text>
                  <Text style={{ color: '#94A3B8', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 }}>
                    Try a different name or message keyword
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="chatbubbles-outline" size={80} color="#E2E8F0" />
                  <Text style={{ fontSize: 18, color: '#64748B', marginTop: 16 }}>No messages yet</Text>
                  <Text style={{ color: '#94A3B8', marginTop: 8 }}>Find a worker to start chatting</Text>
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FDF2E9', // Very light orange/white
  },
  headerBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  slotsText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 8,
  },
  searchCancelBtn: {
    paddingLeft: 4,
  },
  searchCancelText: {
    fontSize: 15,
    color: '#FF9500',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  chatItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
  },
  chatItem: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 15,
    paddingRight: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFEAD1', // Light orange background
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9500', // Brand orange
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
    marginRight: 4,
  },
  chatContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  chatTextColumn: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
    gap: 4,
  },
  metaColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 44,
    paddingTop: 2,
    gap: 6,
  },
  userName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  activeTimeText: {
    color: '#FF9500',
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  unreadBadge: {
    backgroundColor: '#25D366', // WhatsApp Green
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginLeft: 90, // Align with the start of the text
  },
  pinBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  menuBtn: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 12,
  },
  menuBtnPlaceholder: {
    width: 44,
    paddingRight: 12,
  },
  lockedMessageBox: {
    alignSelf: 'stretch',
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  messageBlurLayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    gap: 8,
  },
  blurText: {
    color: '#FF9500',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  menuOptionText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  cancelOption: {
    borderBottomWidth: 0,
    marginTop: 10,
    justifyContent: 'center',
  },
  cancelText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
