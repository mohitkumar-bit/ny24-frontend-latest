import React, { useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, StatusBar, Animated, RefreshControl, Alert, Platform, Keyboard, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';

import { HomeHeader } from '@/components/home/HomeHeader';
import { CategoryList } from '@/components/home/CategoryList';
import { FeedCard, Post } from '@/components/home/FeedCard';
import { FloatingButton } from '@/components/home/FloatingButton';
import { jobService, JobPost } from '@/services/job.service';
import { getPlayableVideoUrl } from '@/services/api';
import { notificationService } from '@/services/notification.service';
import { FilterModal } from '@/components/home/FilterModal';
import { LocationPickerModal } from '@/components/home/LocationPickerModal';
import { SearchCategorySuggestions } from '@/components/home/SearchCategorySuggestions';
import { useAppLocation } from '@/contexts/AppLocationContext';
import type { Category } from '@/services/category.service';
import { buildInterleavedFeed } from '@/utils/feedInterleave';
import { ReportModal } from '@/components/ReportModal';
import { reportPost } from '@/services/report.service';
import { buildNearbyParams } from '@/utils/nearbyParams';

const mapBackendToPost = (job: JobPost): Post => ({
  id: job._id,
  title: job.title,
  category: job.categories && job.categories.length > 0
    ? job.categories.map((c: any) => c.name).join(', ')
    : 'General',
  price: `₹${job.price}`,
  location: job.location?.address || 'Unknown',
  author: job.author && typeof job.author === 'object' ? job.author.name : 'Anonymous',
  authorId:
    job.author && typeof job.author === 'object' ? String(job.author._id) : undefined,
  authorProfilePicture:
    job.author && typeof job.author === 'object' ? job.author.profilePicture || null : null,
  authorIsVerified:
    job.author && typeof job.author === 'object' ? !!job.author.isVerified : false,
  isFeatured: (job as any).isFeatured,
  isVideoPost: !!(job as any).isVideoPost && !!(job as any).videoUrl,
  videoUrl:
    (job as any).isVideoPost && (job as any).videoUrl
      ? getPlayableVideoUrl(job._id)
      : (job as any).videoUrl,
  isBannerAd: !!(job as any).isBannerAd && !!(job as any).bannerUrl,
  bannerUrl: (job as any).bannerUrl || undefined,
  time: new Date(job.createdAt).toLocaleDateString(),
  gradient: ['#FF9500', '#FFD200'],
  icon: job.categories && job.categories.length > 0
    ? job.categories[0].icon
    : 'briefcase-outline',
  imageUrl: (job as any).images?.find((url: unknown) => typeof url === 'string' && url.trim()) || undefined,
});

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    title: 'Electrician Available – Home & Commercial Wiring',
    category: 'Electric',
    price: '₹800',
    location: 'Bistupur, Jamshedpur',
    author: 'Ravi Kumar',
    time: '2h ago',
    gradient: ['#FF9500', '#FFD200'],
    icon: 'flash-outline',
    isFeatured: true,
  },
  {
    id: '2',
    title: 'AC Taxi Driver – City & Outstation Trips',
    category: 'Taxi',
    price: '₹1500',
    location: 'Sakchi, Jamshedpur',
    author: 'Sameer Singh',
    time: '4h ago',
    gradient: ['#6A11CB', '#2575FC'],
    icon: 'car-outline',
    isFeatured: true,
  },
];

import { saveService } from '@/services/save.service';
import { tokenStorage } from '@/services/tokenStorage';
import { authService } from '@/services/auth.service';

const DEFAULT_HEADER_HEIGHT = Platform.OS === 'ios' ? 240 : 220;

const SEARCH_DEBOUNCE_MS = 400;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0
  );
  const { location, loading: locationLoading } = useAppLocation();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [isFilterVisible, setIsFilterVisible] = React.useState(false);
  const [isLocationPickerVisible, setIsLocationPickerVisible] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [activeFilters, setActiveFilters] = React.useState<any>({});
  const [headerHeight, setHeaderHeight] = React.useState(DEFAULT_HEADER_HEIGHT);
  const headerHeightRef = useRef(DEFAULT_HEADER_HEIGHT);
  const locationRef = useRef(location);
  locationRef.current = location;
  const [activeVideoId, setActiveVideoId] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [reportPostId, setReportPostId] = React.useState<string | null>(null);
  const [submittingReport, setSubmittingReport] = React.useState(false);
  const listBottomInset = 80;
  const isFocusedRef = useRef(false);
  const searchInputRef = useRef<TextInput>(null);
  const activeFiltersRef = useRef(activeFilters);
  const searchQueryRef = useRef(searchQuery);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectingSuggestionRef = useRef(false);
  const postsRef = useRef(posts);
  activeFiltersRef.current = activeFilters;
  searchQueryRef.current = searchQuery;
  postsRef.current = posts;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: Post; isViewable: boolean }> }) => {
      const visibleVideo = viewableItems.find(
        (entry) => entry.isViewable && entry.item?.isVideoPost && entry.item?.videoUrl
      );
      setActiveVideoId(visibleVideo?.item?.id ?? null);
    }
  ).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
  }).current;

  const scrollY = useRef(new Animated.Value(0)).current;

  const clampedScrollY = Animated.diffClamp(scrollY, 0, headerHeight);

  const headerTranslateY = clampedScrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: 'clamp',
  });

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) return;
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    }
  }, []);

  const fetchJobs = React.useCallback(async (
    filters: any,
    query: string,
    options?: { silent?: boolean; refresh?: boolean }
  ) => {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }

    const silent = options?.silent === true;
    const refresh = options?.refresh === true;

    if (refresh) {
      setRefreshing(true);
    } else if (!silent) {
      setInitialLoading(true);
    }

    try {
      const params = { ...filters };
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        params.search = trimmedQuery;
        if (!filters?.city) delete params.city;
      } else if (filters?.city) {
        params.city = filters.city;
      } else {
        Object.assign(
          params,
          buildNearbyParams(locationRef.current, { hasSearch: false, filterCity: filters?.city })
        );
      }

      const [jobs, savedJobs] = await Promise.all([
        trimmedQuery ? jobService.searchJobs(params) : jobService.getJobs(params),
        saveService.getSavedJobs().catch(() => [])
      ]);

      const savedIds = new Set(savedJobs.map((j: any) => j._id));

      const mappedPosts = jobs.map((job: JobPost) => ({
        ...mapBackendToPost(job),
        isSaved: savedIds.has(job._id)
      }));

      const orderedPosts = trimmedQuery
        ? buildInterleavedFeed(mappedPosts)
        : mappedPosts;

      setPosts(orderedPosts);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      isFocusedRef.current = true;
      let cancelled = false;

      (async () => {
        const token = await tokenStorage.getAccessToken();
        if (!token || cancelled) {
          setInitialLoading(false);
          return;
        }

        await fetchJobs(activeFiltersRef.current, searchQueryRef.current, { silent: false });
        if (!cancelled) {
          await fetchUnreadCount();
          const user = await authService.getProfile().catch(() => null);
          if (user) {
            setCurrentUserId(String(user.id || user._id));
          } else {
            setCurrentUserId(null);
          }
        }
      })();

      return () => {
        cancelled = true;
        isFocusedRef.current = false;
        setActiveVideoId(null);
        setShowSuggestions(false);
      };
    }, [fetchJobs, fetchUnreadCount])
  );

  React.useEffect(() => {
    if (!isFocusedRef.current || locationLoading) return;
    fetchJobs(activeFiltersRef.current, searchQueryRef.current, { silent: true });
  }, [location?.city, location?.state, location?.coordinates, locationLoading, fetchJobs]);

  const clearSearchTimers = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchBlurRef.current) clearTimeout(searchBlurRef.current);
  };

  const handleApplyFilters = (filters: any, query: string = '') => {
    clearSearchTimers();
    setActiveFilters(filters);
    setSearchQuery(query);
    setShowSuggestions(false);
    fetchJobs(filters, query, { silent: postsRef.current.length > 0 });
  };

  const handleSearchInput = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(query.trim().length > 0);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchJobs(activeFiltersRef.current, query, { silent: true });
    }, SEARCH_DEBOUNCE_MS);
  };

  const closeSuggestions = React.useCallback(() => {
    if (searchBlurRef.current) clearTimeout(searchBlurRef.current);
    selectingSuggestionRef.current = false;
    setShowSuggestions(false);
  }, []);

  const handleSearchSubmit = (query: string = searchQueryRef.current) => {
    clearSearchTimers();
    closeSuggestions();
    fetchJobs(activeFiltersRef.current, query, { silent: true });
  };

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (searchBlurRef.current) clearTimeout(searchBlurRef.current);
    };
  }, []);

  const handleSelectSuggestedCategory = (category: Category) => {
    selectingSuggestionRef.current = true;
    clearSearchTimers();
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    handleApplyFilters({ ...activeFiltersRef.current, category: category._id }, '');
    selectingSuggestionRef.current = false;
  };

  const handleOpenReport = (postId: string) => {
    setReportPostId(postId);
  };

  const handleSubmitReport = async (reason: string, details: string) => {
    if (!reportPostId) return;
    setSubmittingReport(true);
    try {
      await reportPost(reportPostId, { reason, details });
      setReportPostId(null);
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
  const listHeaderSpacer = React.useMemo(
    () => (
      <View>
        <View style={{ height: headerHeight }} />
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {posts.length} posts{location?.city ? ` near ${location.city}` : ''}
          </Text>
          <TouchableOpacity style={styles.sortBtn}>
            <Text style={styles.sortText}>Newest</Text>
            <Ionicons name="chevron-down" size={16} color="#00A300" />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [headerHeight, posts.length, location?.city]
  );

  const handleStickyHeaderLayout = React.useCallback((height: number) => {
    const next = Math.ceil(height);
    if (next <= 0) return;
    if (Math.abs(next - headerHeightRef.current) < 8) return;
    headerHeightRef.current = next;
    setHeaderHeight(next);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#FF9500', '#FFFFFF', '#FFFFFF', '#00A300']}
        locations={[0, 0.25, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        {/* Sticky Animated Header Section */}
        <Animated.View
          style={[
            styles.stickyHeader,
            { paddingTop: topInset, transform: [{ translateY: headerTranslateY }] },
          ]}
          onLayout={(e) => handleStickyHeaderLayout(e.nativeEvent.layout.height)}
        >
          <LinearGradient
            colors={['#FF9500', '#FFFFFF']}
            style={StyleSheet.absoluteFill}
          />
          <HomeHeader
            unreadCount={unreadCount}
            onNotificationPress={() => router.push('/notifications' as any)}
            onLocationPress={() => setIsLocationPickerVisible(true)}
          />

          {!locationLoading && !location?.city?.trim() ? (
            <TouchableOpacity
              style={styles.locationPrompt}
              onPress={() => setIsLocationPickerVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="location-outline" size={18} color="#C2410C" />
              <Text style={styles.locationPromptText}>
                Set your location to see nearby posts and workers
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#C2410C" />
            </TouchableOpacity>
          ) : null}

          <View style={styles.searchBlock}>
            <View style={styles.searchContainer}>
              <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  ref={searchInputRef}
                  placeholder="Search posts, jobs, service..."
                  placeholderTextColor="#999"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={handleSearchInput}
                  onFocus={() => {
                    if (searchBlurRef.current) clearTimeout(searchBlurRef.current);
                    if (searchQuery.trim().length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    if (selectingSuggestionRef.current) return;
                    searchBlurRef.current = setTimeout(() => {
                      selectingSuggestionRef.current = false;
                      setShowSuggestions(false);
                    }, 250);
                  }}
                  onSubmitEditing={() => handleSearchSubmit()}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      closeSuggestions();
                      handleSearchInput('');
                      handleSearchSubmit('');
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#ccc" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => {
                  closeSuggestions();
                  setIsFilterVisible(true);
                }}
              >
                <Ionicons name="options-outline" size={20} color="#fff" />
                {Object.keys(activeFilters).length > 0 && <View style={styles.filterBadge} />}
              </TouchableOpacity>

              {showSuggestions && searchQuery.trim().length > 0 ? (
                <SearchCategorySuggestions
                  query={searchQuery}
                  onSelect={handleSelectSuggestedCategory}
                  onDropdownPressIn={() => {
                    if (searchBlurRef.current) clearTimeout(searchBlurRef.current);
                    selectingSuggestionRef.current = true;
                    requestAnimationFrame(() => searchInputRef.current?.focus());
                  }}
                />
              ) : null}
              </View>
            </View>
          </View>

          <View style={styles.categoriesSection}>
            <CategoryList
              activeCategoryId={activeFilters.category || 'all'}
              onSelectCategory={(id) => {
                handleApplyFilters(
                  { ...activeFiltersRef.current, category: id === 'all' ? undefined : id },
                  ''
                );
              }}
            />
          </View>
        </Animated.View>

        {showSuggestions && searchQuery.trim().length > 0 ? (
          <Pressable
            style={[styles.suggestionsBackdrop, { top: headerHeight }]}
            onPress={closeSuggestions}
          />
        ) : null}

        <Animated.FlatList
          data={posts}
          scrollEnabled={!showSuggestions}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedCard
              post={item}
              isVideoActive={item.id === activeVideoId}
              currentUserId={currentUserId}
              onReportPost={handleOpenReport}
            />
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: true,
              listener: () => {
                if (showSuggestions) setShowSuggestions(false);
              },
            }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchJobs(
                activeFiltersRef.current,
                searchQueryRef.current,
                { refresh: true }
              )}
              tintColor="#FF9500"
              colors={["#FF9500"]}
            />
          }
          ListHeaderComponent={listHeaderSpacer}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listBottomInset },
            !initialLoading && posts.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            initialLoading && posts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={56} color="#ccc" />
                <Text style={styles.emptyTitle}>
                  {searchQuery.trim() || activeFilters.category || activeFilters.city
                    ? 'No results found'
                    : 'No posts yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery.trim() || activeFilters.category || activeFilters.city
                    ? 'Try changing filters or searching something else'
                    : 'Be the first to post in your area'}
                </Text>
              </View>
            )
          }
        />
      </SafeAreaView>
      <FloatingButton />

      <FilterModal
        isVisible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        initialFilters={{
          ...activeFilters,
          city: activeFilters.city || location?.city || '',
        }}
        onApply={handleApplyFilters}
      />

      <LocationPickerModal
        visible={isLocationPickerVisible}
        onClose={() => setIsLocationPickerVisible(false)}
        onLocationSet={() => setIsLocationPickerVisible(false)}
        reserveTabBarSpace={Platform.OS === 'ios'}
      />

      <ReportModal
        visible={!!reportPostId}
        title="Report post"
        subtitle="Tell us why you are reporting this post. Our team will review it."
        submitting={submittingReport}
        onClose={() => setReportPostId(null)}
        onSubmit={handleSubmitReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 0,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'visible',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  locationPromptText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#C2410C',
    lineHeight: 18,
  },
  searchBlock: {
    position: 'relative',
    zIndex: 300,
    elevation: 300,
    overflow: 'visible',
  },
  suggestionsBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  searchRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoriesSection: {
    zIndex: 1,
  },
  listHeader: {
    marginBottom: 0,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterBtn: {
    width: 50,
    height: 50,
    backgroundColor: '#FF9500',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00A300',
  },
  filterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    backgroundColor: '#FF4D4D',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FF9500',
  },
});
