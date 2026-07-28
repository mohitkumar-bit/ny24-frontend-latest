import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { jobService, JobPost } from '@/services/job.service';
import { Skeleton } from '@/components/Skeleton';

interface MyAd {
  id: string;
  title: string;
  category: string;
  price: string;
  isFeatured: boolean;
}

const MOCK_MY_ADS: MyAd[] = [];

export default function MyAdsScreen() {
  const router = useRouter();
  const [ads, setAds] = React.useState<MyAd[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchMyAds();
  }, []);

  const fetchMyAds = async () => {
    try {
      const data = await jobService.getMyJobs();
      const mappedAds = data.map((job: JobPost) => ({
        id: job._id,
        title: job.title,
        category: job.categories && job.categories.length > 0
          ? job.categories.map((c: any) => c.name).join(', ')
          : 'General',
        price: `₹${job.price}`,
        isFeatured: !!job.isFeatured,
      }));
      setAds(mappedAds);
    } catch (error) {
      console.error('Error fetching my ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAdCard = ({ item }: { item: MyAd }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/details/${item.id}` as any)}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="briefcase" size={24} color="#FF9500" />
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
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.price}>{item.price}</Text>
        </View>

        <View style={styles.rightSection}>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
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

      <FlatList
        data={loading ? [1, 2, 3, 4, 5] as any : ads}
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
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't posted any ads yet.</Text>
            </View>
          ) : null
        }
      />

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
    padding: 20,
    gap: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#FFF8EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flexShrink: 1,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FF9500',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  category: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '500',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF9500',
  },
  rightSection: {
    justifyContent: 'center',
    paddingLeft: 8,
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
