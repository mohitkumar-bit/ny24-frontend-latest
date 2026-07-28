import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppNotification, notificationService } from '@/services/notification.service';

const formatDate = (date: string) =>
  new Date(date).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getIconName = (type: AppNotification['type']) => {
  if (type === 'alert') return 'alert-circle';
  if (type === 'promo') return 'gift';
  return 'notifications';
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications.filter((item) => item.type !== 'chat'));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {notifications.length} notification{notifications.length === 1 ? '' : 's'}
            </Text>
          </View>
          {hasUnread && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#00A300" size="large" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadNotifications(true)}
                colors={['#00A300']}
              />
            }
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyList : styles.listContent
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptySubtitle}>Updates from gigSEVA will appear here</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, !item.isRead && styles.itemUnread]}
                onPress={() => router.push(`/notifications/${item._id}` as any)}
              >
                <View style={styles.itemIcon}>
                  <Ionicons
                    name={getIconName(item.type)}
                    size={20}
                    color={item.isRead ? '#94A3B8' : '#00A300'}
                  />
                </View>
                <View style={styles.itemContent}>
                  <Text
                    style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.itemBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.itemTime}>{formatDate(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 2,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#00A300',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#475569',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemUnread: {
    backgroundColor: '#F0FDF4',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
    marginBottom: 4,
  },
  itemTitleUnread: {
    color: '#0F172A',
  },
  itemBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    lineHeight: 18,
  },
  itemTime: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A300',
  },
});
