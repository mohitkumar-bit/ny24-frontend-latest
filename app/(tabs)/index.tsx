import React, { useRef } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, Text, SafeAreaView, StatusBar, Animated, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';

import { HomeHeader } from '@/components/home/HomeHeader';
import { CategoryList } from '@/components/home/CategoryList';
import { FeedCard, Post } from '@/components/home/FeedCard';
import { FloatingButton } from '@/components/home/FloatingButton';
import { jobService, JobPost } from '@/services/job.service';
import { notificationService } from '@/services/notification.service';
import { FilterModal } from '@/components/home/FilterModal';
import { LocationPickerModal } from '@/components/home/LocationPickerModal';
import { useAppLocation } from '@/contexts/AppLocationContext';

const mapBackendToPost = (job: JobPost): Post => ({
  id: job._id,
  title: job.title,
  category: job.categories && job.categories.length > 0
    ? job.categories.map((c: any) => c.name).join(', ')
    : 'General',
  price: `₹${job.price}`,
  location: job.location?.address || 'Unknown',
  author: job.author && typeof job.author === 'object' ? job.author.name : 'Anonymous',
  authorProfilePicture:
    job.author && typeof job.author === 'object' ? job.author.profilePicture || null : null,
  authorIsVerified:
    job.author && typeof job.author === 'object' ? !!job.author.isVerified : false,
  isFeatured: (job as any).isFeatured,
  time: new Date(job.createdAt).toLocaleDateString(),
  gradient: ['#FF9500', '#FFD200'],
  icon: job.categories && job.categories.length > 0
    ? job.categories[0].icon
    : 'briefcase-outline',
  imageUrl: (job as any).images?.[0],
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

const DEFAULT_HEADER_HEIGHT = 260;

export default function HomeScreen() {
  const router = useRouter();
  const { location } = useAppLocation();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFilterVisible, setIsFilterVisible] = React.useState(false);
  const [isLocationPickerVisible, setIsLocationPickerVisible] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilters, setActiveFilters] = React.useState<any>({});
  const [headerHeight, setHeaderHeight] = React.useState(DEFAULT_HEADER_HEIGHT);
  const isFocusedRef = useRef(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const clampedScrollY = Animated.diffClamp(scrollY, 0, headerHeight);

  const headerTranslateY = clampedScrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: 'clamp',
  });

  const headerOpacity = clampedScrollY.interpolate({
    inputRange: [0, headerHeight / 2, headerHeight],
    outputRange: [1, 0.5, 0],
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

  const fetchJobs = React.useCallback(async (filters: any = activeFilters, query: string = searchQuery) => {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = { ...filters };
      if (query) {
        params.search = query;
        // Free-text search covers city/state/category; don't lock to device city
        // unless the user set Location in the filter modal.
        if (!activeFilters?.city) delete params.city;
      } else if (location?.city && !params.city) {
        params.city = location.city;
      }

      const [jobs, savedJobs] = await Promise.all([
        query ? jobService.searchJobs(params) : jobService.getJobs(params),
        saveService.getSavedJobs().catch(() => [])
      ]);

      const savedIds = new Set(savedJobs.map((j: any) => j._id));

      setPosts(jobs.map((job: JobPost) => ({
        ...mapBackendToPost(job),
        isSaved: savedIds.has(job._id)
      })));
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilters, searchQuery, location?.city]);

  useFocusEffect(
    React.useCallback(() => {
      isFocusedRef.current = true;
      let cancelled = false;

      (async () => {
        const token = await tokenStorage.getAccessToken();
        if (!token || cancelled) {
          setLoading(false);
          return;
        }

        const filters = location?.city
          ? { ...activeFilters, city: location.city }
          : activeFilters;
        await fetchJobs(filters, searchQuery);
        if (!cancelled) await fetchUnreadCount();
      })();

      return () => {
        cancelled = true;
        isFocusedRef.current = false;
      };
    }, [location?.city, activeFilters, searchQuery, fetchJobs, fetchUnreadCount])
  );

  React.useEffect(() => {
    if (!isFocusedRef.current) return;
    const filters = location?.city
      ? { ...activeFilters, city: location.city }
      : activeFilters;
    fetchJobs(filters, searchQuery);
  }, [location?.city]);

  const handleApplyFilters = (filters: any) => {
    setActiveFilters(filters);
    fetchJobs(filters, searchQuery);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchJobs(activeFilters, query);
  };
  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Feed Stats - Stays in scrollable area */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {posts.length} posts{location?.city ? ` in ${location.city}` : ''}
        </Text>
        <TouchableOpacity style={styles.sortBtn}>
          <Text style={styles.sortText}>Newest</Text>
          <Ionicons name="chevron-down" size={16} color="#00A300" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#FF9500', '#FFFFFF', '#FFFFFF', '#00A300']}
        locations={[0, 0.25, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Sticky Animated Header Section */}
        <Animated.View
          style={[
            styles.stickyHeader,
            {
              transform: [{ translateY: headerTranslateY }],
              opacity: headerOpacity
            }
          ]}
          onLayout={(e) => {
            const next = Math.ceil(e.nativeEvent.layout.height);
            if (next > 0 && next !== headerHeight) {
              setHeaderHeight(next);
            }
          }}
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

          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                placeholder="Search posts, jobs, service..."
                placeholderTextColor="#999"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearch}
                onSubmitEditing={() => fetchJobs(activeFilters, searchQuery)}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setIsFilterVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color="#fff" />
              {Object.keys(activeFilters).length > 0 && <View style={styles.filterBadge} />}
            </TouchableOpacity>
          </View>

          <CategoryList
            activeCategoryId={activeFilters.category || 'all'}
            onSelectCategory={(id) => handleApplyFilters({ ...activeFilters, category: id === 'all' ? undefined : id })}
          />
        </Animated.View>

        <Animated.FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedCard post={item} />}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchJobs}
              tintColor="#FF9500"
              colors={["#FF9500"]}
            />
          }
          ListHeaderComponent={() => (
            <View>
              <View style={{ height: headerHeight + 12 }} />
              {loading || posts.length > 0 ? renderHeader() : null}
            </View>
          )}
          contentContainerStyle={[
            styles.listContent,
            !loading && posts.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={56} color="#ccc" />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyText}>
                  Try changing filters or searching something else
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
    paddingBottom: 100,
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
    zIndex: 10,
    paddingBottom: 7,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listHeader: {
    marginBottom: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 5,
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
    paddingBottom: 10,
    paddingTop: 0,
  },
  statsText: {
    paddingTop: 10,
    fontSize: 14,
    color: '#666',
  },
  sortBtn: {
    marginTop: 10,
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
