import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePhonetic } from '@/hooks/usePhonetic';

export interface Worker {
  _id: string;
  title: string;
  skills: { _id: string; name: string; icon: string }[];
  hourlyRate: number;
  experience: string;
  location: { city: string; address: string };
  user: { _id: string; name: string; profilePicture?: string | null; isVerified?: boolean };
  availability?: boolean;
  distanceKm?: number | null;
  isFeatured?: boolean;
}

interface WorkerCardProps {
  worker: Worker;
}

export const WorkerCard = ({ worker }: WorkerCardProps) => {
  const { t } = useTranslation();
  const phonetic = usePhonetic();
  const router = useRouter();
  const userName = phonetic(worker.user?.name?.trim()) || t('workers.defaultName');
  const skills = Array.isArray(worker.skills) ? worker.skills : [];
  const locationLabel =
    phonetic(worker.location?.address || worker.location?.city) || t('workers.locationUnavailable');

  if (!worker?._id || !worker.user?._id) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => router.push({
        pathname: "/worker-details/[id]",
        params: { id: worker._id } as any
      })}
    >
      <View style={styles.content}>
        <View style={styles.avatar}>
          {worker.user.profilePicture ? (
            <Image source={{ uri: worker.user.profilePicture }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{userName[0]}</Text>
          )}
          <View style={[
            styles.statusDot,
            { backgroundColor: worker.availability !== false ? '#00A300' : '#FF4D4D' }
          ]} />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{userName}</Text>
            {worker.user?.isVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                <Text style={styles.verifiedText}>{t('workers.verified')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {phonetic(skills.map((s) => s.name).join(', ')) || phonetic(worker.title) || t('workers.defaultTitle')}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>₹</Text>
            <Text style={styles.price}>{worker.hourlyRate}</Text>
            <Text style={styles.rateSuffix}>{t('workers.perHour')}</Text>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={14} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
            {worker.distanceKm != null && (
              <Text style={styles.distanceText}> · {worker.distanceKm} km</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9500',
    textTransform: 'uppercase',
  },
  infoSection: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D9BF0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    flexShrink: 0,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flexShrink: 1,
  },
  title: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  currency: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00A300',
    marginRight: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00A300',
  },
  rateSuffix: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    maxWidth: 80,
  },
  distanceText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
