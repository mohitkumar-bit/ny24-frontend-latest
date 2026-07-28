import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppNotification, notificationService } from '@/services/notification.service';

const formatDate = (date: string) =>
  new Date(date).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const typeLabels: Record<AppNotification['type'], string> = {
  general: 'General',
  promo: 'Promotion',
  alert: 'Alert',
  update: 'Update',
  chat: 'Chat',
};

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await notificationService.getNotifications();
        const found = data.notifications.find((n) => n._id === id) ?? null;
        setNotification(found);

        if (found && !found.isRead) {
          await notificationService.markAsRead(found._id);
          setNotification({ ...found, isRead: true });
        }
      } catch (error) {
        console.error('Error loading notification:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#00A300" size="large" />
          </View>
        ) : !notification ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Notification not found</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="notifications" size={28} color="#00A300" />
            </View>

            <Text style={styles.title}>{notification.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{typeLabels[notification.type]}</Text>
              </View>
              <Text style={styles.time}>{formatDate(notification.createdAt)}</Text>
            </View>

            <View style={styles.bodyCard}>
              <Text style={styles.body}>{notification.body}</Text>
            </View>
          </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#475569',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  typeBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#475569',
    textTransform: 'capitalize',
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
  },
  bodyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  body: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#334155',
    lineHeight: 24,
  },
});
