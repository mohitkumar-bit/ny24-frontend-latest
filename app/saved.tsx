import React from 'react';
import { View, StyleSheet, FlatList, Text, SafeAreaView, StatusBar, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedCard, Post } from '@/components/home/FeedCard';
import { saveService } from '@/services/save.service';
import { JobPost } from '@/services/job.service';
import { Skeleton } from '@/components/Skeleton';
import { useRouter } from 'expo-router';

const mapBackendToPost = (job: JobPost): Post => ({
  id: job._id,
  title: job.title,
  category: job.categories && job.categories.length > 0
    ? job.categories.map((c: any) => c.name).join(', ')
    : 'General',
  price: `₹${job.price}`,
  location: job.location?.address || 'Unknown',
  author: typeof job.author === 'object' ? job.author.name : 'Anonymous',
  time: new Date(job.createdAt).toLocaleDateString(),
  gradient: ['#FF9500', '#FFD200'],
  icon: job.categories && job.categories.length > 0
    ? job.categories[0].icon
    : 'bookmark-outline',
  isSaved: true,
});



export default function SavedScreen() {
  const router = useRouter();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchSavedJobs = async () => {
    try {
      const jobs = await saveService.getSavedJobs();
      setPosts(jobs.map(mapBackendToPost));
    } catch (err) {
      console.error('Error fetching saved jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchSavedJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSavedJobs();
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* White Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Saved Jobs</Text>
            <Text style={styles.headerSubtitle}>{posts.length} jobs saved</Text>
          </View>
        </View>

        <FlatList
          data={loading && !refreshing ? [1, 2, 3] as any : posts}
          keyExtractor={(item, index) => loading && !refreshing ? `skeleton-${index}` : item.id}
          renderItem={loading && !refreshing ? () => (
            <View style={styles.skeletonCard}>
              <Skeleton width="100%" height={150} borderRadius={20} />
              <View style={{ marginTop: 10, gap: 8 }}>
                <Skeleton width="60%" height={20} borderRadius={5} />
                <Skeleton width="40%" height={15} borderRadius={5} />
              </View>
            </View>
          ) : ({ item }) => <FeedCard post={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF9500']} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No saved jobs yet.</Text>
            </View>
          }
        />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  listContent: {
    paddingVertical: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  skeletonCard: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
});
