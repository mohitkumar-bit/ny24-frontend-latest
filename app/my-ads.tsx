import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { jobService, JobPost } from '@/services/job.service';
import { Skeleton } from '@/components/Skeleton';
import { formatFeaturedTimeLeft, getFeaturedEndsAt } from '@/utils/formatTime';
import { showProfessionalToolsInactive } from '@/utils/professionalTools';

interface MyAd {
  id: string;
  title: string;
  category: string;
  price: string;
  isFeatured: boolean;
  featuredEndsAt: number | null;
}

export default function MyAdsScreen() {
  const router = useRouter();
  const [ads, setAds] = React.useState<MyAd[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [featuringId, setFeaturingId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [featureConfirmAd, setFeatureConfirmAd] = React.useState<MyAd | null>(null);
  const [now, setNow] = React.useState(Date.now());
  const [quota, setQuota] = React.useState<Awaited<ReturnType<typeof jobService.getQuota>> | null>(null);

  const canFeatureFree = quota?.canFeatureFree ?? false;
  const plan = quota?.plan ?? 'free';
  const canBuyAddons = plan === 'business' || plan === 'pro';
  const featurePrice = quota?.extraFeaturePrice ?? 99;

  React.useEffect(() => {
    fetchMyAds();
  }, []);

  React.useEffect(() => {
    const hasFeatured = ads.some((ad) => ad.isFeatured && ad.featuredEndsAt);
    if (!hasFeatured) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ads]);

  const fetchQuota = async () => {
    try {
      const q = await jobService.getQuota();
      setQuota(q);
    } catch {
      /* ignore */
    }
  };

  const fetchMyAds = async () => {
    try {
      const [data] = await Promise.all([jobService.getMyJobs(), fetchQuota()]);
      const mappedAds = data.map((job: JobPost) => ({
        id: job._id,
        title: job.title,
        category: job.categories && job.categories.length > 0
          ? job.categories.map((c: any) => c.name).join(', ')
          : 'General',
        price: `₹${job.price}`,
        isFeatured: !!job.isFeatured,
        featuredEndsAt: job.isFeatured
          ? getFeaturedEndsAt(job.featuredAt, job.createdAt)
          : null,
      }));
      setAds(mappedAds);
    } catch (error) {
      console.error('Error fetching my ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeature = async (jobId: string) => {
    if (!canFeatureFree) {
      setFeatureConfirmAd(null);
      showProfessionalToolsInactive();
      return;
    }
    try {
      setFeaturingId(jobId);
      const order = await jobService.createFeatureOrder(jobId);
      setFeatureConfirmAd(null);
      if (!order.paid) {
        Alert.alert('Featured', order.message || 'This post is now featured.');
        fetchMyAds();
        return;
      }
      showProfessionalToolsInactive();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not feature this post');
    } finally {
      setFeaturingId(null);
    }
  };

  const planLabel = plan === 'business' ? 'Business' : plan === 'pro' ? 'Pro' : 'Free';

  const filteredAds = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ads.filter((ad) => {
      if (!q) return true;
      return (
        ad.title.toLowerCase().includes(q) ||
        ad.category.toLowerCase().includes(q) ||
        ad.price.toLowerCase().includes(q)
      );
    });
  }, [ads, searchQuery]);

  const renderQuotaHeader = () => {
    if (!quota) return null;
    const postsUsed = quota.subscriptionPostsUsed ?? quota.postCount ?? 0;
    const postsLimit = quota.postLimit ?? 1;
    const postsPlanLeft = quota.subscriptionPostsRemaining ?? Math.max(0, postsLimit - postsUsed);
    const featuredUsed = quota.subscriptionFeaturesUsed ?? quota.featuredCount ?? 0;
    const featuredLimit = quota.featuredLimit ?? 0;
    const featuredPlanLeft = quota.subscriptionFeaturesRemaining ?? Math.max(0, featuredLimit - featuredUsed);
    const extraPosts = quota.extraPostCredits ?? 0;
    const extraBoosts = quota.extraFeatureCredits ?? 0;
    const postsLeft = postsPlanLeft + extraPosts;
    const featuredLeft = featuredPlanLeft + extraBoosts;

    const postsProgress = postsLimit > 0 ? Math.min(100, (postsUsed / postsLimit) * 100) : 0;
    const boostsProgress =
      featuredLimit > 0 ? Math.min(100, (featuredUsed / featuredLimit) * 100) : 0;
    let postsFootnote = `${postsUsed} of ${postsLimit} plan posts used`;
    if (extraPosts > 0) {
      postsFootnote += ` · ${extraPosts} rolled over`;
    }
    let boostsFootnote =
      featuredLimit === 0
        ? extraBoosts > 0
          ? `${extraBoosts} rolled over boost${extraBoosts === 1 ? '' : 's'}`
          : 'Get free once you complete 30 day login'
        : `${featuredUsed} of ${featuredLimit} plan boosts used`;
    if (featuredLimit > 0 && extraBoosts > 0) {
      boostsFootnote += ` · ${extraBoosts} rolled over`;
    }

    return (
      <View style={styles.quotaPanel}>
        <View style={styles.quotaPanelHeader}>
          <View style={styles.quotaPanelTitleRow}>
            <Text style={styles.quotaPanelTitle}>This month</Text>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>{planLabel}</Text>
            </View>
          </View>
          <Text style={styles.quotaPanelSubtitle}>
            Plan slots reset monthly.
          </Text>
        </View>

        <View style={styles.quotaSection}>
          <Text style={styles.quotaSectionLabel}>Included with your plan</Text>
          <View style={styles.quotaGrid}>
            <View style={[styles.quotaMiniCard, styles.quotaMiniCardPlan]}>
              <View style={styles.quotaMiniCardHead}>
                <View style={styles.quotaMiniIconPlan}>
                  <Ionicons name="document-text-outline" size={14} color="#D99D00" />
                </View>
                <Text style={styles.quotaMiniLabel}>Plan posts</Text>
              </View>
              <View style={styles.quotaMiniMetric}>
                <Text style={styles.quotaMiniValue}>{postsLeft}</Text>
                <Text style={styles.quotaMiniUnit}>remaining</Text>
              </View>
              <View style={styles.quotaProgressTrack}>
                <View style={[styles.quotaProgressFill, { width: `${postsProgress}%` }]} />
              </View>
              <Text style={styles.quotaMiniFootnote}>{postsFootnote}</Text>
            </View>

            <View style={[styles.quotaMiniCard, styles.quotaMiniCardPlan]}>
              <View style={styles.quotaMiniCardHead}>
                <View style={styles.quotaMiniIconPlan}>
                  <Ionicons name="star-outline" size={14} color="#D99D00" />
                </View>
                <Text style={styles.quotaMiniLabel}>Plan boosts</Text>
              </View>
              <View style={styles.quotaMiniMetric}>
                <Text style={styles.quotaMiniValue}>{featuredLeft}</Text>
                <Text style={styles.quotaMiniUnit}>remaining</Text>
              </View>
              <View style={styles.quotaProgressTrack}>
                <View style={[styles.quotaProgressFill, { width: `${boostsProgress}%` }]} />
              </View>
              <Text style={styles.quotaMiniFootnote}>{boostsFootnote}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderAdCard = ({ item }: { item: MyAd }) => (
    <TouchableOpacity
      style={[styles.card, item.isFeatured && styles.cardFeatured]}
      activeOpacity={0.8}
      onPress={() => router.push(`/details/${item.id}` as any)}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, item.isFeatured && styles.iconContainerFeatured]}>
          <Ionicons
            name="briefcase"
            size={22}
            color={item.isFeatured ? '#B45309' : '#475569'}
          />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {item.isFeatured ? (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={10} color="#fff" />
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.category} numberOfLines={1}>{item.category}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>{item.price}</Text>
            {item.isFeatured && item.featuredEndsAt ? (
              <View style={styles.featureTimer}>
                <Ionicons name="time-outline" size={13} color="#64748B" />
                <Text style={styles.featureTimerText}>
                  {formatFeaturedTimeLeft(item.featuredEndsAt, now)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.rightSection}>
          {!item.isFeatured && canBuyAddons ? (
            <TouchableOpacity
              style={styles.featureBtn}
              onPress={(e) => {
                e.stopPropagation();
                setFeatureConfirmAd(item);
              }}
              disabled={featuringId === item.id}
              activeOpacity={0.85}
            >
              {featuringId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="star" size={13} color="#fff" />
                  <Text style={styles.featureBtnText}>
                    {canFeatureFree ? 'Feature' : 'Feature'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Ads</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Search your posts..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={loading ? [1, 2, 3, 4, 5] as any : filteredAds}
        keyExtractor={(item, index) => loading ? `skeleton-${index}` : item.id}
        renderItem={loading ? () => (
          <View style={styles.skeletonCard}>
            <Skeleton width={60} height={60} borderRadius={15} style={{ marginRight: 15 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="80%" height={18} borderRadius={4} />
              <Skeleton width="40%" height={14} borderRadius={4} />
              <Skeleton width="30%" height={20} borderRadius={4} />
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', height: 60 }}>
              <Skeleton width={20} height={20} borderRadius={10} />
              <Skeleton width={60} height={20} borderRadius={8} />
            </View>
          </View>
        ) : renderAdCard}
        refreshing={loading && ads.length > 0}
        onRefresh={fetchMyAds}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={!loading ? renderQuotaHeader : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {ads.length === 0
                  ? "You haven't posted any ads yet."
                  : 'No posts match your search.'}
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={!!featureConfirmAd}
        transparent
        animationType="fade"
        onRequestClose={() => !featuringId && setFeatureConfirmAd(null)}
      >
        <Pressable
          style={styles.confirmOverlay}
          onPress={() => !featuringId && setFeatureConfirmAd(null)}
        >
          <Pressable style={styles.confirmSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="star" size={22} color="#FF9500" />
            </View>
            <Text style={styles.confirmTitle}>Feature this post?</Text>
            <Text style={styles.confirmMessage}>
              {canFeatureFree
                ? `“${featureConfirmAd?.title}” will be featured for 30 days using your included featured slot.`
                : 'Professional tools are not active. Paid featuring is unavailable in the app right now.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setFeatureConfirmAd(null)}
                disabled={!!featuringId}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmOkBtn}
                onPress={() => featureConfirmAd && handleFeature(featureConfirmAd.id)}
                disabled={!!featuringId}
              >
                {featuringId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmOkText}>
                    {canFeatureFree ? 'Feature' : 'OK'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Floating Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/create-post' as any)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
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
    paddingTop: 40,
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 10,
    backgroundColor: '#fff',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  quotaPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quotaPanelHeader: {
    marginBottom: 14,
  },
  quotaPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  quotaPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#182238',
  },
  quotaPanelSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#667085',
  },
  quotaSection: {
    marginTop: 14,
  },
  quotaSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  quotaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quotaMiniCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 132,
  },
  quotaMiniCardPlan: {
    backgroundColor: '#FFFDF5',
    borderColor: 'rgba(244, 184, 0, 0.18)',
  },
  quotaMiniCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  quotaMiniIconPlan: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF5D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaMiniLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
  },
  quotaMiniMetric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  quotaMiniValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#182238',
    lineHeight: 30,
  },
  quotaMiniUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667085',
  },
  quotaProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
    marginBottom: 8,
  },
  quotaProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FF9500',
  },
  quotaMiniFootnote: {
    fontSize: 11,
    lineHeight: 15,
    color: '#94A3B8',
    marginTop: 'auto',
  },
  planPill: {
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  planPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9500',
    textTransform: 'capitalize',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  confirmSheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
  },
  confirmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  confirmOkBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  cardFeatured: {
    backgroundColor: '#FFFDF8',
    borderColor: '#FDE68A',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerFeatured: {
    backgroundColor: '#FEF3C7',
  },
  infoContainer: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D97706',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  featureTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featureTimerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  featureBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  category: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803D',
  },
  rightSection: {
    justifyContent: 'center',
    paddingLeft: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
  },
});
