import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Switch, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePhonetic } from '@/hooks/usePhonetic';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { workerService } from '@/services/worker.service';
import { Skeleton } from '@/components/Skeleton';
import { authService } from '@/services/auth.service';

export default function WorkerProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const phonetic = usePhonetic();
  const insets = useSafeAreaInsets();

  const genderLabel = (value: string) => {
    switch (value) {
      case 'Male':
        return t('gender.male');
      case 'Female':
        return t('gender.female');
      case 'Other':
        return t('gender.other');
      default:
        return value;
    }
  };
  const [profile, setProfile] = useState<any>(null);
  const [isUserVerified, setIsUserVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkerProfile();
  }, []);

  const fetchWorkerProfile = async () => {
    try {
      const [data, user] = await Promise.all([
        workerService.getMyProfile(),
        authService.getProfile(),
      ]);
      setProfile(data.profile);
      setIsUserVerified(!!user?.isVerified || !!data.profile?.user?.isVerified);
    } catch (error) {
      console.error('Error fetching worker profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (value: boolean) => {
    const oldProfile = { ...profile };
    setProfile({ ...profile, availability: value });

    try {
      const response = await workerService.updateProfile({ availability: value });
      if (response.success) {
        setProfile((prev: any) => ({ ...prev, ...response.profile }));
      } else {
        setProfile(oldProfile);
        Alert.alert(t('common.error'), t('workerProfile.updateAvailabilityFailed'));
      }
    } catch (error: any) {
      setProfile(oldProfile);
      console.error('Error updating availability:', error);
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('workerProfile.updateAvailabilityFailed')
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('workerProfile.title')}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.content}>
            <Skeleton width="100%" height={200} borderRadius={20} style={{ marginBottom: 20 }} />
            <Skeleton width="60%" height={30} borderRadius={5} style={{ marginBottom: 15 }} />
            <Skeleton width="100%" height={100} borderRadius={10} style={{ marginBottom: 20 }} />
            <Skeleton width="40%" height={25} borderRadius={5} style={{ marginBottom: 15 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Skeleton width={80} height={35} borderRadius={20} />
              <Skeleton width={80} height={35} borderRadius={20} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#FF9500', '#FFFFFF', '#FFFFFF']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('workerProfile.title')}</Text>
          <TouchableOpacity onPress={() => router.push('/worker-register' as any)} style={styles.headerActionBtn}>
            <Ionicons name="create-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        >
          {/* Main Profile Info Card */}
          <View style={styles.mainCard}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.profileTitle}>{phonetic(profile?.title)}</Text>
                {isUserVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#00A300" />
                    <Text style={styles.verifiedText}>{t('workerProfile.verifiedProfessional')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.rateCard}>
                <Text style={styles.rateLabel}>{t('workerProfile.hourlyRate')}</Text>
                <Text style={styles.rateValue}>₹{profile?.hourlyRate}</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <View style={styles.statValueSlot}>
                  <Text style={styles.statVal}>{profile?.experience}</Text>
                </View>
                <Text style={styles.statLab}>{t('workerProfile.yearsExp')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <View style={styles.statValueSlot}>
                  <Switch
                    value={profile?.availability !== false}
                    onValueChange={toggleAvailability}
                    trackColor={{ false: '#767577', true: '#FF9500' }}
                    thumbColor={profile?.availability !== false ? '#fff' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    style={Platform.OS === 'ios' ? styles.iosSwitch : undefined}
                  />
                </View>
                <Text style={styles.statLab}>{profile?.availability !== false ? t('workerProfile.available') : t('workerProfile.busy')}</Text>
              </View>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t('workerProfile.aboutMe')}</Text>
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{phonetic(profile?.description)}</Text>
            </View>
          </View>

          {/* Skills Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t('workerProfile.skillsCategories')}</Text>
            <View style={styles.skillsGrid}>
              {profile?.skills?.map((skill: any) => (
                <View key={skill._id} style={styles.skillItem}>
                  <Ionicons name={skill.icon} size={20} color="#FF9500" />
                  <Text style={styles.skillName}>{phonetic(skill.name)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t('workerProfile.workingLocation')}</Text>
            <View style={styles.locationCard}>
              <Ionicons name="location" size={24} color="#FF9500" />
              <View style={styles.locationInfo}>
                <Text style={styles.addressText}>{phonetic(profile?.location?.address)}</Text>
                <Text style={styles.cityText}>
                  {phonetic(
                    [
                      profile?.location?.city,
                      profile?.location?.state,
                      profile?.location?.pincode,
                      profile?.location?.country,
                    ]
                      .filter(Boolean)
                      .join(', ')
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* Personal Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t('workerProfile.personalInfo')}</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Ionicons name="calendar-outline" size={20} color="#FF9500" />
                <View>
                  <Text style={styles.infoLabel}>{t('workerProfile.age')}</Text>
                  <Text style={styles.infoValue}>{profile?.age || t('workerProfile.notAvailable')}</Text>
                </View>
              </View>
              <View style={styles.infoBox}>
                <Ionicons name="person-outline" size={20} color="#FF9500" />
                <View>
                  <Text style={styles.infoLabel}>{t('workerProfile.gender')}</Text>
                  <Text style={styles.infoValue}>{profile?.gender ? genderLabel(profile.gender) : t('workerProfile.notAvailable')}</Text>
                </View>
              </View>
              <View style={[styles.infoBox, { width: '100%', marginTop: 10 }]}>
                <Ionicons 
                  name={profile?.interestedInLongDistance ? "airplane-outline" : "home-outline"} 
                  size={20} 
                  color="#FF9500" 
                />
                <View>
                  <Text style={styles.infoLabel}>{t('workerProfile.serviceArea')}</Text>
                  <Text style={styles.infoValue}>
                    {profile?.interestedInLongDistance ? t('workerProfile.longDistance') : t('workerProfile.localOnly')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => router.push('/worker-register' as any)}
          >
            <Text style={styles.editBtnText}>{t('workerProfile.editProfile')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  content: {
    padding: 20,
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 13,
    color: '#00A300',
    fontWeight: '600',
  },
  rateCard: {
    alignItems: 'flex-end',
  },
  rateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  rateValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF9500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FAFAFA',
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValueSlot: {
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 22,
  },
  statLab: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#EEE',
    marginHorizontal: 8,
  },
  iosSwitch: {
    transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }],
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingLeft: 5,
  },
  bioCard: {
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
    gap: 12,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    minWidth: '45%',
  },
  skillName: {
    fontSize: 14,
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
  addressText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  cityText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: '#FF9500',
    borderRadius: 15,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
});
