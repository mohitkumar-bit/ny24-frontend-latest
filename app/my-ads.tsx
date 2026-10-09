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
import { useTranslation } from 'react-i18next';
import { usePhonetic } from '@/hooks/usePhonetic';
import { jobService, JobPost } from '@/services/job.service';
import { Skeleton } from '@/components/Skeleton';
import {
  formatFeaturedTimeLeft,
  getBoostDaysIfStartedNow,
  getFeaturedEndsAt,
  getPostExpiresAt,
} from '@/utils/formatTime';
import { showProfessionalToolsInactive } from '@/utils/professionalTools';

interface MyAd {
  id: string;
  title: string;
  category: string;
  price: string;
  isFeatured: boolean;
  featuredEndsAt: number | null;
  postEndsAt: number | null;
}

const isAdArchived = (ad: MyAd, now: number) => ad.postEndsAt == null || ad.postEndsAt <= now;

export default function MyAdsScreen() {
  const { t } = useTranslation();
  const phonetic = usePhonetic();
  const router = useRouter();
  const [ads, setAds] = React.useState<MyAd[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [featuringId, setFeaturingId] = React.useState<string | null>(null);
  const [repostingId, setRepostingId] = React.useState<string | null>(null);
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
    const hasLiveAd = ads.some((ad) => !isAdArchived(ad, Date.now()));
    if (!hasLiveAd) return;
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
          : '',
        price: `₹${job.price}`,
        isFeatured: !!job.isFeatured,
        featuredEndsAt: job.isFeatured ? getFeaturedEndsAt(job) : null,
        postEndsAt: getPostExpiresAt(job),
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
        Alert.alert(t('myAds.featured'), order.message || t('myAds.featuredSuccess'));
        fetchMyAds();
        return;
      }
      showProfessionalToolsInactive();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('myAds.featureFailed'));
    } finally {
      setFeaturingId(null);
    }
  };

  const repost = async (ad: MyAd) => {
    try {
      setRepostingId(ad.id);
      const result = await jobService.repostJob(ad.id);
      Alert.alert(t('myAds.repostedTitle'), result.message || t('myAds.repostedMessage'));
      fetchMyAds();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('myAds.repostFailed'));
    } finally {
      setRepostingId(null);
    }
  };

  const handleRepost = (ad: MyAd) => {
    Alert.alert(t('myAds.repostConfirmTitle'), t('myAds.repostConfirmMessage', { title: ad.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('myAds.repost'), onPress: () => repost(ad) },
    ]);
  };

  const planLabel =
    plan === 'business'
      ? t('myAds.planBusiness')
      : plan === 'pro'
        ? t('myAds.planPro')
        : t('myAds.planFree');

  const categoryLabel = (ad: MyAd) => ad.category || t('myAds.generalCategory');

  const filteredAds = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const loadedAt = Date.now();
    const matches = ads.filter((ad) => {
      if (!q) return true;
      return (
        ad.title.toLowerCase().includes(q) ||
        (ad.category || t('myAds.generalCategory')).toLowerCase().includes(q) ||
        ad.price.toLowerCase().includes(q)
      );
    });
    // Live posts first, archived ones below; order within each group is unchanged.
    return [
      ...matches.filter((ad) => !isAdArchived(ad, loadedAt)),
      ...matches.filter((ad) => isAdArchived(ad, loadedAt)),
    ];
  }, [ads, searchQuery, t]);

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
    const postsFootnote =
      postsLimit === 0 && extraPosts === 0
        ? ''
        : extraPosts > 0
          ? t('myAds.postsUsedRollover', { used: postsUsed, limit: postsLimit, extra: extraPosts })
          : t('myAds.postsUsed', { used: postsUsed, limit: postsLimit });
    const boostsFootnote =
      featuredLimit === 0
        ? extraBoosts > 0
          ? extraBoosts === 1
            ? t('myAds.boostRolledOverOne', { extra: extraBoosts })
            : t('myAds.boostRolledOverMany', { extra: extraBoosts })
          : ''
        : extraBoosts > 0
          ? t('myAds.boostsUsedRollover', { used: featuredUsed, limit: featuredLimit, extra: extraBoosts })
          : t('myAds.boostsUsed', { used: featuredUsed, limit: featuredLimit });

    return (
      <View style={styles.quotaPanel}>
        <View style={styles.quotaPanelHeader}>
          <View style={styles.quotaPanelTitleRow}>
            <Text style={styles.quotaPanelTitle}>{t('myAds.thisMonth')}</Text>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>{planLabel}</Text>
            </View>
          </View>
          <Text style={styles.quotaPanelSubtitle}>
            {t('myAds.slotsResetMonthly')}
          </Text>
        </View>

        <View style={styles.quotaSection}>
          <Text style={styles.quotaSectionLabel}>{t('myAds.includedWithPlan')}</Text>
          <View style={styles.quotaGrid}>
            <View style={[styles.quotaMiniCard, styles.quotaMiniCardPlan]}>
              <View style={styles.quotaMiniCardHead}>
                <View style={styles.quotaMiniIconPlan}>
                  <Ionicons name="document-text-outline" size={14} color="#D99D00" />
                </View>
                <Text style={styles.quotaMiniLabel}>{t('myAds.planPosts')}</Text>
              </View>
              <View style={styles.quotaMiniMetric}>
                <Text style={styles.quotaMiniValue}>{postsLeft}</Text>
                <Text style={styles.quotaMiniUnit}>{t('myAds.remaining')}</Text>
              </View>
              <View style={styles.quotaProgressTrack}>
                <View style={[styles.quotaProgressFill, { width: `${postsProgress}%` }]} />
              </View>
              {postsFootnote ? <Text style={styles.quotaMiniFootnote}>{postsFootnote}</Text> : null}
            </View>

            <View style={[styles.quotaMiniCard, styles.quotaMiniCardPlan]}>
              <View style={styles.quotaMiniCardHead}>
                <View style={styles.quotaMiniIconPlan}>
                  <Ionicons name="star-outline" size={14} color="#D99D00" />
                </View>
                <Text style={styles.quotaMiniLabel}>{t('myAds.planBoosts')}</Text>
              </View>
              <View style={styles.quotaMiniMetric}>
                <Text style={styles.quotaMiniValue}>{featuredLeft}</Text>
                <Text style={styles.quotaMiniUnit}>{t('myAds.remaining')}</Text>
              </View>
              <View style={styles.quotaProgressTrack}>
                <View style={[styles.quotaProgressFill, { width: `${boostsProgress}%` }]} />
              </View>
              {boostsFootnote ? <Text style={styles.quotaMiniFootnote}>{boostsFootnote}</Text> : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderAdCard = ({ item }: { item: MyAd }) => {
    const archived = isAdArchived(item, now);
    const boosted =
      !archived && item.isFeatured && item.featuredEndsAt != null && item.featuredEndsAt > now;
    const canBoost = !archived && !boosted && getBoostDaysIfStartedNow(item.postEndsAt, now) > 0;

    return (
    <TouchableOpacity
      style={[styles.card, boosted && styles.cardFeatured, archived && styles.cardArchived]}
      activeOpacity={0.8}
      onPress={() => router.push(`/details/${item.id}` as any)}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, boosted && styles.iconContainerFeatured]}>
          <Ionicons
            name={archived ? 'archive-outline' : 'briefcase'}
            size={22}
            color={boosted ? '#B45309' : archived ? '#94A3B8' : '#475569'}
          />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, archived && styles.titleArchived]} numberOfLines={1}>
              {item.title}
            </Text>
            {boosted ? (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={10} color="#fff" />
                <Text style={styles.featuredBadgeText}>{t('myAds.featured')}</Text>
              </View>
            ) : null}
            {archived ? (
              <View style={styles.archivedBadge}>
                <Text style={styles.archivedBadgeText}>{t('myAds.archived')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.category} numberOfLines={1}>{phonetic(categoryLabel(item))}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>{item.price}</Text>
            {boosted && item.featuredEndsAt ? (
              <View style={styles.featureTimer}>
                <Ionicons name="star-outline" size={12} color="#B45309" />
                <Text style={styles.featureTimerText}>
                  {formatFeaturedTimeLeft(item.featuredEndsAt, now)}
                </Text>
              </View>
            ) : !archived && item.postEndsAt ? (
              <View style={styles.featureTimer}>
                <Ionicons name="time-outline" size={13} color="#64748B" />
                <Text style={styles.featureTimerText}>
                  {formatFeaturedTimeLeft(item.postEndsAt, now)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.rightSection}>
          {archived ? (
            <TouchableOpacity
              style={styles.repostBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleRepost(item);
              }}
              disabled={repostingId === item.id}
              activeOpacity={0.85}
            >
              {repostingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh" size={13} color="#fff" />
                  <Text style={styles.featureBtnText}>{t('myAds.repost')}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : canBoost && canBuyAddons ? (
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
                    {canFeatureFree ? t('myAds.feature') : t('myAds.feature')}
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myAds.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder={t('myAds.searchPlaceholder')}
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
                  ? t('myAds.noAdsYet')
                  : t('myAds.noSearchResults')}
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
            <Text style={styles.confirmTitle}>{t('myAds.confirmTitle')}</Text>
            <Text style={styles.confirmMessage}>
              {canFeatureFree
                ? (() => {
                    const days = getBoostDaysIfStartedNow(featureConfirmAd?.postEndsAt ?? null, now);
                    return t(days === 1 ? 'myAds.confirmMessageOneDay' : 'myAds.confirmMessage', {
                      title: featureConfirmAd?.title,
                      days,
                    });
                  })()
                : t('myAds.paidFeatureInactive')}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setFeatureConfirmAd(null)}
                disabled={!!featuringId}
              >
                <Text style={styles.confirmCancelText}>{t('common.cancel')}</Text>
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
                    {canFeatureFree ? t('myAds.feature') : t('common.ok')}
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
  repostBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F766E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardArchived: {
    backgroundColor: '#F8FAFC',
  },
  titleArchived: {
    color: '#64748B',
  },
  archivedBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
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
