import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { saveService } from '@/services/save.service';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { FeedVideoPlayer } from '@/components/home/FeedVideoPlayer';
import { FeedBanner } from '@/components/home/FeedBanner';
import { authService } from '@/services/auth.service';
import { checkChatLimit } from '@/services/chat.service';
import { ReportOptionsMenu } from '@/components/ReportOptionsMenu';

export interface Post {
  id: string;
  title: string;
  category: string;
  price: string;
  location: string;
  author: string;
  authorId?: string;
  authorProfilePicture?: string | null;
  authorIsVerified?: boolean;
  time: string;
  gradient: [string, string, ...string[]];
  icon: keyof typeof Ionicons.glyphMap;
  isFeatured?: boolean;
  isVideoPost?: boolean;
  videoUrl?: string;
  isBannerAd?: boolean;
  bannerUrl?: string;
  isSaved?: boolean;
  imageUrl?: string;
}

interface FeedCardProps {
  post: Post;
  isVideoActive?: boolean;
  currentUserId?: string | null;
  onReportPost?: (postId: string) => void;
}

export const FeedCard = ({
  post,
  isVideoActive = false,
  currentUserId = null,
  onReportPost,
}: FeedCardProps) => {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [imageFailed, setImageFailed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isVideoPost = !!(post.isVideoPost && post.videoUrl);
  const isBannerAd = !!(post.isBannerAd && post.bannerUrl);
  const isPromoCard = isVideoPost || isBannerAd;

  useEffect(() => {
    setImageFailed(false);
  }, [post.imageUrl, post.id]);

  const openDetails = () => {
    router.push({
      pathname: '/details/[id]',
      params: { ...post } as any,
    });
  };

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

  const handlePromoChat = async () => {
    if (!post.authorId) return;

    try {
      const user = await authService.getProfile().catch(() => null);
      if (!user) {
        router.push('/auth/login' as any);
        return;
      }

      const userId = user.id || (user as any)?._id;
      if (userId && String(userId) === String(post.authorId)) return;

      await checkChatLimit(post.authorId);
      router.push({
        pathname: '/chat/[id]' as any,
        params: {
          id: 'new',
          name: post.author,
          avatarLetter: post.author?.[0] || '?',
          avatarUrl: post.authorProfilePicture || '',
          receiverId: post.authorId,
        },
      });
    } catch (error: any) {
      Alert.alert('Chat unavailable', error?.message || 'Could not start chat');
    }
  };

  const isOwnPromoPost =
    !!post.authorId &&
    !!currentUserId &&
    String(currentUserId) === String(post.authorId);

  const isOwnPost =
    !!post.authorId &&
    !!currentUserId &&
    String(currentUserId) === String(post.authorId);

  const handleReportPress = async () => {
    try {
      const user = await authService.getProfile().catch(() => null);
      if (!user) {
        router.push('/auth/login' as any);
        return;
      }
      onReportPost?.(post.id);
    } catch {
      Alert.alert('Error', 'Please log in to report this post');
    }
  };

  const renderPromoAuthorBar = () => (
    <View style={styles.promoAuthorBar} pointerEvents="box-none">
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.promoAuthorGradient}
      >
        <View style={styles.promoAuthorRow}>
          <View style={styles.promoAuthorInfo}>
            <View style={styles.promoAvatar}>
              {post.authorProfilePicture ? (
                <Image source={{ uri: post.authorProfilePicture }} style={styles.promoAvatarImage} />
              ) : (
                <Text style={styles.promoAvatarText}>{post.author?.[0] || '?'}</Text>
              )}
            </View>
            <View style={styles.promoAuthorNameRow}>
              <Text style={styles.promoAuthorName} numberOfLines={1}>
                {post.author}
              </Text>
              {post.authorIsVerified ? <VerifiedBadge size={14} /> : null}
            </View>
          </View>
          <View style={styles.promoActions}>
            {!isOwnPromoPost ? (
              <>
                <ReportOptionsMenu
                  onReport={handleReportPress}
                  buttonStyle={styles.promoActionBtn}
                  iconColor="#fff"
                  iconSize={18}
                  reportLabel="Report"
                />
                {post.authorId ? (
                  <TouchableOpacity
                    style={styles.promoChatBtn}
                    activeOpacity={0.85}
                    onPress={handlePromoChat}
                  >
                    <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={[styles.card, isPromoCard && styles.promoCard]}>
      {isVideoPost ? (
        <View style={styles.promoMediaWrap}>
          <FeedVideoPlayer uri={post.videoUrl!} isActive={isVideoActive} />
          {renderPromoAuthorBar()}
        </View>
      ) : isBannerAd ? (
        <View style={styles.promoMediaWrap}>
          <FeedBanner uri={post.bannerUrl!} />
          {renderPromoAuthorBar()}
        </View>
      ) : (
        <>
          <View style={styles.imageContainer}>
            {post.imageUrl && !imageFailed ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={openDetails}
                style={styles.imageTouch}
              >
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.coverImage}
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.9} onPress={openDetails} style={styles.imageTouch}>
                <LinearGradient
                  colors={post.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradient}
                >
                  <Ionicons name={post.icon} size={60} color="rgba(255,255,255,0.6)" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            <View style={styles.badgeContainer} pointerEvents="box-none">
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

          <TouchableOpacity style={styles.content} activeOpacity={0.9} onPress={openDetails}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {post.title}
          </Text>
          <View style={styles.headerActions}>
            {!isOwnPost ? (
              <ReportOptionsMenu
                onReport={handleReportPress}
                buttonStyle={styles.reportBtn}
                iconColor="#94A3B8"
                iconSize={20}
                reportLabel="Report"
              />
            ) : null}
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
          </TouchableOpacity>
        </>
      )}
    </View>
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
  videoCard: {
    backgroundColor: '#000',
    padding: 0,
  },
  promoCard: {
    backgroundColor: '#000',
    padding: 0,
  },
  promoMediaWrap: {
    position: 'relative',
    width: '100%',
  },
  promoAuthorBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  promoAuthorGradient: {
    paddingHorizontal: 14,
    paddingTop: 28,
    paddingBottom: 14,
  },
  promoAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  promoAuthorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  promoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  promoAvatarImage: {
    width: '100%',
    height: '100%',
  },
  promoAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  promoAuthorNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  promoAuthorName: {
    flexShrink: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  promoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoChatBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  imageTouch: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
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
