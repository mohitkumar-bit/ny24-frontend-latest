import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { workerService } from '@/services/worker.service';
import { CategoryList } from '@/components/home/CategoryList';
import { WorkerCard, Worker } from '@/components/workers/WorkerCard';
import { Skeleton } from '@/components/Skeleton';
import { FilterModal } from '@/components/home/FilterModal';
import { LocationPickerModal } from '@/components/home/LocationPickerModal';
import { WorkersHeader } from '@/components/workers/WorkersHeader';
import { useAppLocation } from '@/contexts/AppLocationContext';

const WorkersScreen = () => {
  const { location } = useAppLocation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isLocationPickerVisible, setIsLocationPickerVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>({});

  const featuredWorkers = workers.filter((w) => (w as any).isFeatured);
  const organicWorkers = workers.filter((w) => !(w as any).isFeatured);

  const fetchWorkers = useCallback(async (filters: any = activeFilters, query: string = searchQuery) => {
    setLoading(true);
    try {
      const params: any = { ...filters };
      if (query) {
        params.search = query;
        if (!activeFilters?.city) delete params.city;
      } else if (location?.city && !params.city) {
        params.city = location.city;
      }

      const data = await workerService.searchWorkers(params);
      setWorkers(data);
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilters, searchQuery, location?.city]);

  useEffect(() => {
    const filters = location?.city
      ? { ...activeFilters, city: location.city }
      : activeFilters;
    fetchWorkers(filters, searchQuery);
  }, [location?.city]);

  const handleSearch = async (query: string, filters: any = activeFilters) => {
    setSearchQuery(query);
    await fetchWorkers(filters, query);
  };

  const handleCategorySelect = (categoryId: string | null) => {
    const newCategory = activeCategory === categoryId ? null : categoryId;
    setActiveCategory(newCategory);
    const updatedFilters = { ...activeFilters, category: newCategory || undefined };
    setActiveFilters(updatedFilters);
    handleSearch(searchQuery, updatedFilters);
  };

  const handleApplyFilters = (filters: any) => {
    setActiveFilters(filters);
    setActiveCategory(filters.category || null);
    setSearchQuery(filters.city || '');
    handleSearch(filters.city || '', filters);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkers();
    setRefreshing(false);
  };

  const renderListHeader = () => {
    if (!loading && workers.length === 0) return null;

    return (
      <View style={styles.listHeader}>
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            {workers.length} workers{location?.city ? ` in ${location.city}` : ' available'}
          </Text>
        </View>

        {featuredWorkers.length > 0 && (
          <View style={styles.featuredSection}>
            <Text style={styles.featuredTitle}>Featured</Text>
            {featuredWorkers.slice(0, 3).map((w) => (
              <WorkerCard key={w._id} worker={w} />
            ))}
          </View>
        )}

        {featuredWorkers.length > 0 && <View style={styles.featuredDivider} />}

        {featuredWorkers.length > 0 && organicWorkers.length > 0 && (
          <Text style={styles.allTitle}>All</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#FF9500', '#FFFFFF', '#FFFFFF']}
        locations={[0, 0.2, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stickyHeader}>
          <LinearGradient
            colors={['#FF9500', '#FFFFFF']}
            style={StyleSheet.absoluteFill}
          />
          <WorkersHeader onLocationPress={() => setIsLocationPickerVisible(true)} />

          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={22} color="#999" style={styles.searchIcon} />
              <TextInput
                placeholder="Search by category, city, name..."
                placeholderTextColor="#999"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={(text) => handleSearch(text)}
                onSubmitEditing={() => handleSearch(searchQuery)}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    handleSearch('', { ...activeFilters, city: undefined });
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterBtnMain}
              onPress={() => setIsFilterVisible(true)}
            >
              <Ionicons name="options-outline" size={24} color="#fff" />
              {Object.keys(activeFilters).length > 0 && <View style={styles.filterBadge} />}
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesSection}>
            <CategoryList
              activeCategoryId={activeCategory || 'all'}
              onSelectCategory={(id) => handleCategorySelect(id === 'all' ? null : id)}
            />
          </View>
        </View>

        <FlatList
          data={loading ? ([1, 2, 3, 4] as any) : organicWorkers}
          keyExtractor={(item, index) => (loading ? `skeleton-${index}` : (item as Worker)._id)}
          renderItem={({ item }) => loading ? (
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonContent}>
                <Skeleton width={48} height={48} borderRadius={24} />
                <View style={styles.skeletonInfo}>
                  <Skeleton width="60%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                  <Skeleton width="40%" height={14} borderRadius={4} />
                </View>
                <View style={styles.skeletonRight}>
                  <Skeleton width={60} height={22} borderRadius={4} style={{ marginBottom: 8 }} />
                  <Skeleton width={50} height={14} borderRadius={4} />
                </View>
              </View>
            </View>
          ) : (
            <WorkerCard worker={item as Worker} />
          )}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={[
            styles.listContent,
            !loading && workers.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF9500"
              colors={["#FF9500"]}
            />
          }
          ListEmptyComponent={
            !loading && workers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={56} color="#ccc" />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyText}>
                  Try changing filters or searching another city
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>

      <FilterModal
        isVisible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        initialFilters={{
          ...activeFilters,
          city: activeFilters.city || location?.city || '',
        }}
        onApply={handleApplyFilters}
        showLongDistance={true}
      />

      <LocationPickerModal
        visible={isLocationPickerVisible}
        onClose={() => setIsLocationPickerVisible(false)}
      />
    </View>
  );
};

export default WorkersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  stickyHeader: {
    zIndex: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    overflow: 'hidden',
  },
  listHeader: {
    paddingTop: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  searchRow: {
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
  filterBtnMain: {
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
  filterBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    backgroundColor: '#FF4D4D',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  categoriesSection: {
    width: "100%",
    marginBottom: 0,
  },
  categoryList: {
    paddingRight: 20,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  featuredSection: {
    paddingTop: 10,
    paddingBottom: 6,
  },
  featuredDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
  },
  featuredTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF9500',
    marginBottom: 10,
    marginLeft: 16,
  },
  allTitle: {
    marginTop: 10,
    marginLeft: 16,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '800',
    color: '#FF9500',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  skeletonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
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
});