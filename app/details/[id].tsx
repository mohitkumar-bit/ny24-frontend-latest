import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '@/services/auth.service';
import { jobService, JobPost } from '@/services/job.service';
import { applicationService } from '@/services/application.service';
import { checkChatLimit } from '@/services/chat.service';
import { callRequestService } from '@/services/callRequest.service';
import type { User } from '@/types';
import { Skeleton } from '@/components/Skeleton';
import { LimitModal } from '@/components/LimitModal';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { saveService } from '@/services/save.service';

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [job, setJob] = React.useState<JobPost | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [applying, setApplying] = React.useState(false);
  const [requestingCall, setRequestingCall] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [jobData, userData, savedJobs] = await Promise.all([
        jobService.getJobById(id as string),
        authService.getProfile().catch(() => null),
        saveService.getSavedJobs().catch(() => []),
      ]);
      setJob(jobData);
      setUser(userData);
      setIsSaved(
        Array.isArray(savedJobs) &&
          savedJobs.some((j: any) => String(j._id) === String(id))
      );
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      router.push('/auth/login' as any);
      return;
    }

    if (!user.isWorker) {
      alert('You need a worker profile to apply for jobs.');
      router.push('/worker-register' as any);
      return;
    }

    setApplying(true);
    try {
      await applicationService.apply(id as string, 'I am interested in this job.');
      alert('Application submitted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Job",
      "Are you sure you want to delete this job post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await jobService.deleteJob(id as string);
              router.replace('/my-ads' as any);
            } catch (err: any) {
              alert(err.response?.data?.message || 'Failed to delete job');
            }
          }
        }
      ]
    );
  };

  const handleCall = async () => {
    if (!user) {
      router.push('/auth/login' as any);
      return;
    }

    const author = job?.author;
    if (!author || typeof author !== 'object') {
      Alert.alert('Error', 'Author contact not available');
      return;
    }

    if (String(user.id) === String(author._id)) {
      Alert.alert('Error', 'You cannot call yourself');
      return;
    }

    setRequestingCall(true);
    try {
      await checkChatLimit(author._id);

      const res = await callRequestService.sendRequest({
        receiverId: author._id,
        sourceType: 'job',
        sourceId: job!._id,
        sourceTitle: job!.title,
      });

      const isSubscribed = user.subscription?.status === 'active';
      router.push({
        pathname: `/chat/${res.conversationId}` as any,
        params: {
          name: author.name,
          avatarLetter: author.name[0],
          receiverId: author._id,
          isSubscribed: String(!!isSubscribed),
        },
      });
    } catch (err: any) {
      const data = err.response?.data || err;
      if (data?.code === 'CHAT_LIMIT_REACHED') {
        processLimitError(data);
      } else {
        Alert.alert('Error', data?.message || 'Failed to send call request');
      }
    } finally {
      setRequestingCall(false);
    }
  };

  const [isCheckingLimit, setIsCheckingLimit] = React.useState(false);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState('');
  const [modalPlan, setModalPlan] = React.useState('Free');

  const handleChat = async () => {
    if (job?.author && typeof job.author === 'object') {
      setIsCheckingLimit(true);
      try {
        console.log('Checking chat limit for post author:', job.author._id);
        await checkChatLimit(job.author._id);

        router.push({
          pathname: '/chat/[id]' as any,
          params: {
            id: job.author._id,
            name: job.author.name,
            avatarLetter: job.author.name[0]
          }
        });
      } catch (error: any) {
        console.log('Chat limit error caught for post author:', error);
        processLimitError(error);
      } finally {
        setIsCheckingLimit(false);
      }
    }
  };

  const processLimitError = (error: any) => {
    console.log('Processing limit error:', error);
    const isLimitReached = (error.code === 'CHAT_LIMIT_REACHED') || 
                           (error.message?.toLowerCase().includes('limit reached')) ||
                           (error.toString().toLowerCase().includes('limit reached'));

    if (isLimitReached) {
      setModalMessage(error.message || '');
      setModalPlan('Free');
      setShowLimitModal(true);
    } else {
      alert(error.message || error.toString());
    }
  };

  const isAuthor = !loading && user && job && String(user.id) === String(job.author?._id);

  const handleToggleSave = async () => {
    if (!user) {
      router.push('/auth/login' as any);
      return;
    }
    if (!job?._id || saving || isAuthor) return;

    setSaving(true);
    try {
      const res = await saveService.toggleSave(job._id);
      setIsSaved(!!res.isSaved);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Could not save this post'
      );
    } finally {
      setSaving(false);
    }
  };

  const gradient = ['#FF9500', '#FFD200'];
  const coverImage = job?.images?.[0];
  const headerIcon =
    (job?.categories?.[0]?.icon as keyof typeof Ionicons.glyphMap) || 'briefcase-outline';

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerContainer}>
            <Skeleton width="100%" height={200} borderRadius={0} />
            <SafeAreaView style={styles.headerOverlay}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <View style={styles.circleBtnPlaceholder} />
            </SafeAreaView>
          </View>

          <View style={styles.content}>
            <View style={[styles.categoriesRow, { marginBottom: 15 }]}>
              <Skeleton width={90} height={28} borderRadius={10} />
              <Skeleton width={100} height={28} borderRadius={10} />
            </View>

            <Skeleton width="75%" height={28} borderRadius={6} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={72} borderRadius={16} style={{ marginBottom: 20 }} />

            <View style={styles.metaSection}>
              <Skeleton width="55%" height={16} borderRadius={4} />
              <Skeleton width="35%" height={16} borderRadius={4} />
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Skeleton width={110} height={20} borderRadius={4} style={{ marginBottom: 12 }} />
              <View style={{ gap: 8 }}>
                <Skeleton width="100%" height={14} borderRadius={4} />
                <Skeleton width="100%" height={14} borderRadius={4} />
                <Skeleton width="65%" height={14} borderRadius={4} />
              </View>
            </View>

            <View style={styles.section}>
              <Skeleton width={80} height={20} borderRadius={4} style={{ marginBottom: 12 }} />
              <View style={styles.sellerCard}>
                <Skeleton width={50} height={50} borderRadius={25} />
                <View style={[styles.sellerInfo, { gap: 8 }]}>
                  <Skeleton width={120} height={16} borderRadius={4} />
                  <Skeleton width={60} height={12} borderRadius={4} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.skeletonBottomRow}>
            <Skeleton width="48%" height={50} borderRadius={15} />
            <Skeleton width="48%" height={50} borderRadius={15} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LimitModal 
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          router.push('/subscription');
        }}
        message={modalMessage}
        plan={modalPlan}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Image/Gradient Section */}
        <View style={styles.headerContainer}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <Ionicons
                name={headerIcon}
                size={120}
                color="rgba(255,255,255,0.4)"
              />
            </LinearGradient>
          )}

          {/* Floating Action Buttons */}
          <SafeAreaView style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            {isAuthor ? (
              <View style={styles.circleBtnPlaceholder} />
            ) : (
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={handleToggleSave}
                disabled={saving}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={isSaved ? '#FF9500' : '#000'}
                />
              </TouchableOpacity>
            )}
          </SafeAreaView>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.categoriesRow}>
            {job?.isFeatured ? (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            ) : null}
            {job?.categories?.map((cat: any) => (
              <View key={cat._id} style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{cat.name}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.title}>{job?.title}</Text>

          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrency}>₹</Text>
              <Text style={styles.priceValue}>{job?.price}</Text>
              <Text style={styles.priceSuffix}>/service</Text>
            </View>
          </View>

          <View style={styles.metaSection}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={18} color="#ccc" />
              <Text style={styles.metaText}>{job?.location?.address || 'Unknown'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={18} color="#ccc" />
              <Text style={styles.metaText}>
                {job ? new Date(job.createdAt).toLocaleDateString() : ''}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {job?.description}
            </Text>
          </View>

          {/* Seller Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Author</Text>
            <View style={styles.sellerCard}>
              <View style={styles.sellerAvatar}>
                {typeof job?.author === 'object' && job.author.profilePicture ? (
                  <Image source={{ uri: job.author.profilePicture }} style={styles.sellerAvatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {typeof job?.author === 'object' ? job.author.name[0] : 'U'}
                  </Text>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>
                    {typeof job?.author === 'object' ? job.author.name : 'Anonymous'}
                  </Text>
                  {typeof job?.author === 'object' && job.author.isVerified && (
                    <VerifiedBadge size={18} />
                  )}
                </View>
                <Text style={styles.sellerSub}>Author</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomBar}>
        {isAuthor ? (
          <>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#ffffffff" />
              <Text style={styles.deleteBtnText}>Delete Ad</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editJobBtn}
              onPress={() => router.push(`/edit-job/${id}` as any)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.editJobBtnText}>Edit Ad</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {user?.isWorker ? (
              <>
                <TouchableOpacity style={styles.callBtn} onPress={handleCall} disabled={requestingCall}>
                  {requestingCall ? (
                    <ActivityIndicator color="#FF9500" size="small" />
                  ) : (
                    <>
                      <Ionicons name="call-outline" size={20} color="#FF9500" />
                      <Text style={styles.callBtnText}>Request Call</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.chatActionBtn} 
                  onPress={handleChat}
                  disabled={isCheckingLimit}
                >
                  {isCheckingLimit ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                      <Text style={styles.chatActionBtnText}>Chat</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => router.push('/worker-register' as any)}
              >
                <Ionicons name="person-add-outline" size={20} color="#fff" />
                <Text style={styles.registerBtnText}>Create Working Profile First</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    height: 200,
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
  headerOverlay: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circleBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBtnPlaceholder: {
    width: 45,
    height: 45,
  },
  content: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  featuredBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  categoryBadge: {
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
  },
  categoryText: {
    color: '#FF9500',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
    marginBottom: 20,
  },
  priceContainer: {
    backgroundColor: '#FDF2E9',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF9500',
    marginRight: 4,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF9500',
  },
  priceSuffix: {
    fontSize: 18,
    color: '#64748B',
    marginLeft: 6,
  },
  metaSection: {
    gap: 12,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 15,
    color: '#94A3B8',
    marginLeft: 8,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
    marginBottom: 25,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 26,
    color: '#64748B',
    fontWeight: '400',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFEAD1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sellerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sellerSub: {
    fontSize: 13,
    color: '#94A3B8',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  bottomBar: {

    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    flexDirection: 'row',
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
  },
  skeletonBottomRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  callBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFBB70',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  callBtnText: {
    color: '#FF9500',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatActionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#00A300',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#00A300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chatActionBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#0F172A', // Dark navy/black
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#bcbcbcff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fb2e2eff',
  },
  deleteBtnText: {
    color: '#ffffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editJobBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editJobBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
