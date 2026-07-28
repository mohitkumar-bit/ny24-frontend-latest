import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface LimitModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title?: string;
  message?: string;
  plan?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const LimitModal: React.FC<LimitModalProps> = ({ 
  visible, 
  onClose, 
  onUpgrade, 
  title = 'Chat Slots Full',
  message,
  plan = 'Free',
  icon = 'chatbubbles-outline',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.7)' }]} />
        
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.card}
          >
            <View style={styles.iconContainer}>
              <View style={styles.iconBg}>
                <Ionicons name={icon} size={32} color="#FF9500" />
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={12} color="#fff" />
                </View>
              </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.planBadge}>{plan} Plan</Text>
            
            <Text style={styles.message}>
              {message || `All 3 chat slots are in use. Wait for a slot to expire (24h after opening), unpin a chat, or upgrade for more slots.`}
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={onClose}
              >
                <Text style={styles.cancelText}>Maybe Later</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.upgradeBtn} 
                onPress={onUpgrade}
              >
                <LinearGradient
                  colors={['#FF9500', '#FFB347']}
                  style={styles.gradientBtn}
                >
                  <Text style={styles.upgradeText}>Upgrade Now</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  planBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9500',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  upgradeBtn: {
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
    gap: 10,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
});
