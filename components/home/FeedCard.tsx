import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { saveService } from '@/services/save.service';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export interface Post {
  id: string;
  title: string;
  category: string;
  price: string;
  location: string;
  author: string;
  authorProfilePicture?: string | null;
  authorIsVerified?: boolean;
  time: string;
  gradient: [string, string, ...string[]];
  icon: keyof typeof Ionicons.glyphMap;
  isFeatured?: boolean;
  isSaved?: boolean;
  imageUrl?: string;
}

interface FeedCardProps {
  post: Post;
}

export const FeedCard = ({ post }: FeedCardProps) => {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateBubble = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        friction: 4,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleToggleSave = async () => {
    animateBubble();
    try {
      const res = await saveService.toggleSave(post.id);
      setIsSaved(res.isSaved);
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => router.push({
        pathname: "/details/[id]",
        params: { ...post } as any
      })}
    >
      {/* Card Header (Image/Gradient area) */}
      <View style={styles.imageContainer}>
        {post.imageUrl ? (
          <Image source={{ uri: post.imageUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={post.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Ionicons name={post.icon} size={60} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        )}

        {/* Badges */}
        <View style={styles.badgeContainer}>
          {post.isFeatured && (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Ionicons name="star" size={12} color="#fff" style={styles.badgeIcon} />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          <View style={[styles.badge, styles.categoryBadge]}>
            <Text style={styles.badgeText}>{post.category}</Text>
          </View>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {post.title}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, isSaved && styles.savedBtn]}
            onPress={handleToggleSave}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isSaved ? "#fff" : "#FF9500"}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.locationText}>{post.location}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{post.price}</Text>
          <Text style={styles.serviceText}>/service</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.authorContainer}>
            <View style={styles.avatar}>
              {post.authorProfilePicture ? (
                <Image source={{ uri: post.authorProfilePicture }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{post.author[0]}</Text>
              )}
            </View>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{post.author}</Text>
              {post.authorIsVerified && <VerifiedBadge size={14} />}
            </View>
          </View>
          <Text style={styles.timeText}>{post.time}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 25,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginHorizontal: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  savedCard: {
    borderColor: '#FF9500',
    shadowColor: '#FF9500',
    shadowOpacity: 0.15,
    backgroundColor: '#FFFCF8',
  },
  imageContainer: {
    height: 130,
    width: '100%',
    position: 'relative',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredBadge: {
    backgroundColor: '#FF9500',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: '#000',
    lineHeight: 20,
    marginRight: 10,
  },
  saveBtn: {
    backgroundColor: '#FFF5E6',
    padding: 8,
    borderRadius: 20,
  },
  savedBtn: {
    backgroundColor: '#ff5a31ff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  price: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    color: '#20b22cff',
  },
  serviceText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 16,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  avatarText: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
});
