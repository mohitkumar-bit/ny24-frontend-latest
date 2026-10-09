import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView } from '@/utils/keyboardController';
import { REPORT_REASONS, reportReasonLabel, type ReportReason } from '@/constants/reportReasons';

type ReportModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void | Promise<void>;
};

export function ReportModal({
  visible,
  title,
  subtitle,
  submitting = false,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [reasonDropdownOpen, setReasonDropdownOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ top: 0, left: 0, width: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const triggerRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      setReason(REPORT_REASONS[0]);
      setDetails('');
      setReasonDropdownOpen(false);
      setKeyboardHeight(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const handleSelectReason = (option: ReportReason) => {
    setReason(option);
    setReasonDropdownOpen(false);
  };

  const toggleReasonDropdown = () => {
    Keyboard.dismiss();

    if (reasonDropdownOpen) {
      setReasonDropdownOpen(false);
      return;
    }

    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownLayout({ top: y + height + 6, left: x, width });
      setReasonDropdownOpen(true);
    });
  };

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  const keyboardOpen = keyboardHeight > 0;

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardOpen && {
              justifyContent: 'flex-start',
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: keyboardHeight + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.dialog}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                disabled={submitting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.fieldLabel}>{t('report.reason')}</Text>
              <View style={styles.dropdownContainer} ref={triggerRef} collapsable={false}>
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    reasonDropdownOpen && styles.dropdownTriggerOpen,
                  ]}
                  onPress={toggleReasonDropdown}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownTriggerText}>{reportReasonLabel(reason)}</Text>
                  <Ionicons
                    name={reasonDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>{t('report.detailsLabel')}</Text>
              <TextInput
                style={styles.detailsInput}
                placeholder={t('report.detailsPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={details}
                onChangeText={setDetails}
                onFocus={() => setReasonDropdownOpen(false)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => onSubmit(reason, details.trim())}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>{t('report.submitReport')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {reasonDropdownOpen ? (
          <>
            <Pressable
              style={styles.dropdownBackdrop}
              onPress={() => setReasonDropdownOpen(false)}
            />
            <View
              style={[
                styles.dropdownMenu,
                {
                  top: dropdownLayout.top,
                  left: dropdownLayout.left,
                  width: dropdownLayout.width,
                },
              ]}
            >
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {REPORT_REASONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      reason === option && styles.dropdownOptionActive,
                    ]}
                    onPress={() => handleSelectReason(option)}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        reason === option && styles.dropdownOptionTextActive,
                      ]}
                    >
                      {reportReasonLabel(option)}
                    </Text>
                    {reason === option ? (
                      <Ionicons name="checkmark" size={18} color="#FF9500" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  form: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  dropdownContainer: {
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  dropdownTriggerOpen: {
    borderColor: '#FF9500',
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    zIndex: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#fff',
    maxHeight: 240,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dropdownOptionActive: {
    backgroundColor: '#FFF8EE',
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
    marginRight: 8,
  },
  dropdownOptionTextActive: {
    color: '#FF9500',
    fontWeight: '700',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    fontSize: 15,
    color: '#0F172A',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
