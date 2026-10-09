import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Alert, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { workerService } from '@/services/worker.service';
import { authService } from '@/services/auth.service';
import { checkChatLimit } from '@/services/chat.service';
import {
  confirmBlockUser,
  refreshBlockStatus,
  unblockUserWithAlert,
} from '@/utils/userBlockAction';
import { callRequestService } from '@/services/callRequest.service';
import { Skeleton } from '@/components/Skeleton';
import { LimitModal } from '@/components/LimitModal';
import { ReportModal } from '@/components/ReportModal';
import { ReportOptionsMenu } from '@/components/ReportOptionsMenu';
import { reportWorkerProfile } from '@/services/report.service';
import { useTranslation } from 'react-i18next';
import { usePhonetic } from '@/hooks/usePhonetic';

export default function WorkerDetailsScreen() {
  const { t } = useTranslation();
  const phonetic = usePhonetic();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [worker, setWorker] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requestingCall, setRequestingCall] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [workerData, userData] = await Promise.all([
        workerService.getWorkerById(id as string),
        authService.getProfile().catch(() => null)
      ]);
      
      
      if (workerData) {
        setWorker(workerData);
      } else {
        Alert.alert(t('common.error'), t('workerDetails.notFound'));
      }
      setCurrentUser(userData);
    } catch (err: any) {
      console.error('Error fetching worker details:', err);
      Alert.alert(t('common.error'), err.response?.data?.message || t('workerDetails.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async () => {
    if (!currentUser) {
      router.push('/auth/login' as any);
      return;
    }

    const receiverId = worker?.user?._id;
    if (!receiverId) {
      Alert.alert(t('common.error'), t('workerDetails.contactUnavailable'));
      return;
    }

    if (String(currentUser.id) === String(receiverId)) {
      Alert.alert(t('common.error'), t('workerDetails.cannotCallSelf'));
      return;
    }

    setRequestingCall(true);
    try {
      await checkChatLimit(receiverId);

      const res = await callRequestService.sendRequest({
        receiverId,
        sourceType: 'worker',
        sourceId: worker._id,
        sourceTitle: worker.title || worker.user?.name,
      });

      const isSubscribed = currentUser.subscription?.status === 'active';
      router.push({
        pathname: `/chat/${res.conversationId}` as any,
        params: {
          name: worker.user.name,
          avatarLetter: worker.user.name[0],
          receiverId,
          isSubscribed: String(isSubscribed),
        },
      });
    } catch (err: any) {
      const data = err.response?.data || err;
      if (data?.code === 'CHAT_LIMIT_REACHED') {
        processLimitError(data);
      } else {
        Alert.alert(t('common.error'), data?.message || t('workerDetails.callRequestFailed'));
      }
    } finally {
      setRequestingCall(false);
    }
  };

  const [isCheckingLimit, setIsCheckingLimit] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalPlan, setModalPlan] = useState('Free');

  const handleChat = async () => {
    if (worker?.user) {
      setIsCheckingLimit(true);
      try {
        console.log('Checking chat limit for:', worker.user._id);
        await checkChatLimit(worker.user._id);
        
        // If it didn't throw, we're allowed
        router.push(`/chat/new?name=${encodeURIComponent(worker.user.name)}&avatarLetter=${encodeURIComponent(worker.user.name[0])}&receiverId=${worker.user._id}`);
      } catch (error: any) {
        console.log('Chat limit error caught:', error);
        processLimitError(error);
      } finally {
        setIsCheckingLimit(false);
      }
    }
  };

  const currentUserId = currentUser?.id || (currentUser as any)?._id;
  const isOwnProfile =
    !!currentUserId &&
    !!worker?.user?._id &&
    String(currentUserId) === String(worker.user._id);

  const handleReportPress = () => {
    if (!currentUser) {
      router.push('/auth/login' as any);
      return;
    }
    setShowReportModal(true);
  };

  const handleBlockPress = async () => {
    const targetUserId = worker?.user?._id;
    if (!targetUserId) return;

    if (!currentUser) {
      router.push('/auth/login' as any);
      return;
    }

    if (blockedByMe) {
      await unblockUserWithAlert(targetUserId, () => setBlockedByMe(false));
      return;
    }

    confirmBlockUser(targetUserId, worker?.user?.name || t('block.thisUser'), () =>
      setBlockedByMe(true)
    );
  };

  const handleMenuOpen = async () => {
    const targetUserId = worker?.user?._id;
    if (!targetUserId || !currentUser) return;
    try {
      setBlockedByMe(await refreshBlockStatus(targetUserId));
    } catch {
      // ignore
    }
  };

  const handleSubmitReport = async (reason: string, details: string) => {
    if (!id) return;
    setSubmittingReport(true);
    try {
      await reportWorkerProfile(id as string, { reason, details });
      setShowReportModal(false);
      Alert.alert(
        t('report.submittedTitle'),
        t('report.submittedMessage')
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('report.submitFailed'));
    } finally {
      setSubmittingReport(false);
    }
  };

  const processLimitError = (error: any) => {
    console.log('Processing worker limit error:', error);
    const isLimitReached = (error.code === 'CHAT_LIMIT_REACHED') || 
                           (error.message?.toLowerCase().includes('limit reached')) ||
                           (error.toString().toLowerCase().includes('limit reached'));

    if (isLimitReached) {
      setModalMessage(error.message || '');
      setModalPlan('Free'); // You could dynamic this if sender.subscription is available
      setShowLimitModal(true);
    } else {
      alert(error.message || error.toString());
    }
  };

  const genderLabel = (gender: string) => {
    switch (gender) {
      case 'Male':
        return t('workerDetails.genderMale');
      case 'Female':
        return t('workerDetails.genderFemale');
      case 'Other':
        return t('workerDetails.genderOther');
      default:
        return gender;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('workerDetails.workerDetailsTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.content}>
          <Skeleton width="100%" height={200} borderRadius={20} style={{ marginBottom: 20 }} />
          <Skeleton width="60%" height={30} borderRadius={5} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={100} borderRadius={10} style={{ marginBottom: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LimitModal 
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title={t('workerDetails.chatSlotsFullTitle')}
        message={t('workerDetails.chatSlotsFullMessage')}
        plan={modalPlan}
      />
      <LinearGradient
        colors={['#FF9500', '#FFFFFF', '#FFFFFF']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('workerDetails.professionalProfile')}</Text>
          {!isOwnProfile && worker ? (
            <ReportOptionsMenu
              onReport={handleReportPress}
              onBlock={handleBlockPress}
              onMenuOpen={handleMenuOpen}
              blockedByMe={blockedByMe}
              buttonStyle={styles.reportHeaderBtn}
              iconColor="#64748B"
              reportLabel={t('common.report')}
            />
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 90 + Math.max(insets.bottom, 12) },
          ]}
        >
          {/* Main Card */}
          <View style={styles.mainCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarLarge}>
                {worker?.user?.profilePicture ? (
                  <Image source={{ uri: worker.user.profilePicture }} style={styles.avatarLargeImage} />
                ) : (
                  <Text style={styles.avatarLargeText}>{phonetic(worker?.user?.name)?.[0]}</Text>
                )}
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.workerName} numberOfLines={1}>
                    {phonetic(worker?.user?.name)}
                  </Text>
                  {(worker?.user?.isVerified || worker?.isVerified) ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#fff" />
                      <Text style={styles.verifiedText}>{t('workerDetails.verified')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.workerTitle}>{phonetic(worker?.title) || t('workerDetails.defaultTitle')}</Text>
              </View>

              {/* Availability Badge */}
              <View style={[
                styles.availabilityBadge,
                { backgroundColor: worker?.availability !== false ? '#E6F4EA' : '#F1F3F4' }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: worker?.availability !== false ? '#00A300' : '#70757A' }
                ]} />
                <Text style={[
                  styles.availabilityText,
                  { color: worker?.availability !== false ? '#00A300' : '#70757A' }
                ]}>
                  {worker?.availability !== false ? t('workerDetails.available') : t('workerDetails.busy')}
                </Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{worker?.experience}</Text>
                <Text style={styles.statLab}>{t('workerDetails.experience')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>₹{worker?.hourlyRate}</Text>
                <Text style={styles.statLab}>{t('workerDetails.perHour')}</Text>
              </View>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t('workerDetails.aboutProfessional')}</Text>
            <View style={styles.infoCard}>
              <Text style={styles.bioText}>{phonetic(worker?.description)}</Text>
            </View>
          </View>

          {/* Skills Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t('workerDetails.skillsExpertise')}</Text>
            <View style={styles.skillsGrid}>
              {worker?.skills?.map((skill: any) => (
                <View key={skill._id} style={styles.skillItem}>
                  <Ionicons name={skill.icon as any} size={18} color="#FF9500" />
                  <Text style={styles.skillName}>{phonetic(skill.name)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t('workerDetails.serviceArea')}</Text>
            <View style={styles.locationCard}>
              <Ionicons name="location" size={24} color="#FF9500" />
              <View style={styles.locationInfo}>
                <Text style={styles.cityText}>{phonetic(worker?.location?.city)}</Text>
                <Text style={styles.addressText}>{phonetic(worker?.location?.address)}</Text>
              </View>
            </View>
          </View>

          {/* Personal Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t('workerDetails.personalInformation')}</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Ionicons name="calendar-outline" size={20} color="#FF9500" />
                <View>
                  <Text style={styles.infoLabel}>{t('workerDetails.age')}</Text>
                  <Text style={styles.infoValue}>{worker?.age || '24'}</Text>
                </View>
              </View>
              <View style={styles.infoBox}>
                <Ionicons name="person-outline" size={20} color="#FF9500" />
                <View>
                  <Text style={styles.infoLabel}>{t('workerDetails.gender')}</Text>
                  <Text style={styles.infoValue}>{genderLabel(worker?.gender || 'Male')}</Text>
                </View>
              </View>
              <View style={[styles.infoBox, { width: '100%', marginTop: 10 }]}>
                <Ionicons 
                  name={worker?.interestedInLongDistance ? "airplane-outline" : "home-outline"} 
                  size={20} 
                  color="#FF9500" 
                />
                <View>
                  <Text style={styles.infoLabel}>{t('workerDetails.travelPreferences')}</Text>
                  <Text style={styles.infoValue}>
                    {worker?.interestedInLongDistance ? t('workerDetails.openToLongDistance') : t('workerDetails.prefersLocal')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Reviews Section (Dummy)
          <View style={styles.section}>
            <View style={styles.reviewHeaderRow}>
              <Text style={styles.sectionHeader}>Recent Reviews</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {[
              { id: '1', user: 'Rahul S.', rating: 5, comment: 'Excellent service, very professional and punctual!', date: '2 days ago' },
              { id: '2', user: 'Anita M.', rating: 4, comment: 'Good quality work. Would recommend.', date: '1 week ago' }
            ].map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewUser}>{review.user}</Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons key={s} name="star" size={12} color={s <= review.rating ? "#FFD700" : "#EEE"} />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
            ))}
          </View> */}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          <TouchableOpacity style={styles.callBtn} onPress={handleCall} disabled={requestingCall}>
            {requestingCall ? (
              <ActivityIndicator color="#FF9500" size="small" />
            ) : (
              <>
                <Ionicons name="call" size={20} color="#FF9500" />
                <Text style={styles.callBtnText}>{t('workerDetails.requestCall')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.chatBtn} 
            onPress={handleChat}
            disabled={isCheckingLimit}
          >
            {isCheckingLimit ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                <Text style={styles.chatBtnText}>{t('common.chat')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ReportModal
        visible={showReportModal}
        title={t('report.workerTitle')}
        subtitle={t('report.workerSubtitle')}
        submitting={submittingReport}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleSubmitReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 5,
  },
  reportHeaderBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 25,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarLargeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  workerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flexShrink: 1,
  },
  workerTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D9BF0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    flexShrink: 0,
  },
  verifiedText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 15,
    padding: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statLab: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EEE',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#F1F1F1',
  },
  bioText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  skillName: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EEE',
    gap: 15,
  },
  locationInfo: {
    flex: 1,
  },
  cityText: {
    fontSize: 15,
    color: '#000',
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 15,
    flexDirection: 'row',
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  callBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9500',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  callBtnText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  chatBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F1F1F1',
    width: '48%',
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  // reviewCard: {
  //   backgroundColor: '#fff',
  //   borderRadius: 15,
  //   padding: 15,
  //   marginBottom: 12,
  //   borderWidth: 1,
  //   borderColor: '#F0F0F0',
  // },
  // reviewTop: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   marginBottom: 8,
  // },
  // reviewUser: {
  //   fontSize: 14,
  //   fontWeight: 'bold',
  //   color: '#333',
  // },
  // ratingRow: {
  //   flexDirection: 'row',
  //   gap: 2,
  // },
  // reviewComment: {
  //   fontSize: 13,
  //   color: '#666',
  //   lineHeight: 18,
  //   marginBottom: 8,
  // },
  // reviewDate: {
  //   fontSize: 11,
  //   color: '#AAA',
  // },
});
