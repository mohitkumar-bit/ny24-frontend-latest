import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface LimitModalProps {
  visible: boolean;
  onClose: () => void;
  /** @deprecated Upgrade/payment is disabled — kept optional for call-site compatibility */
  onUpgrade?: () => void;
  title?: string;
  message?: string;
  plan?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const LimitModal: React.FC<LimitModalProps> = ({
  visible,
  onClose,
  title,
  message,
  icon = 'construct-outline',
}) => {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.7)' }]} />

        <View style={styles.modalContainer}>
          <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.card}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBg}>
                <Ionicons name={icon} size={32} color="#FF9500" />
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={12} color="#fff" />
                </View>
              </View>
            </View>

            <Text style={styles.title}>{title ?? t('professionalTools.inactiveTitle')}</Text>

            <Text style={styles.message}>{message ?? t('professionalTools.inactiveMessage')}</Text>

            <TouchableOpacity style={styles.okBtn} onPress={onClose} activeOpacity={0.85}>
              <LinearGradient colors={['#FF9500', '#FFB347']} style={styles.gradientBtn}>
                <Text style={styles.okText}>{t('common.ok')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FF3B30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  okBtn: {
    width: '100%',
    height: 55,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  okText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
