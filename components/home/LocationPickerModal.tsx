import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppLocation } from '@/contexts/AppLocationContext';
import { locationStorage } from '@/services/locationStorage';
import {
  searchLocationSuggestions,
  type LocationSuggestion,
} from '@/services/location.service';

type LocationPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onLocationSet?: () => void;
  /** User must set location before dismissing (first login). */
  required?: boolean;
  /** Show first-time onboarding copy. */
  isFirstTime?: boolean;
};

export function LocationPickerModal({
  visible,
  onClose,
  onLocationSet,
  required = false,
  isFirstTime = false,
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const { location, detecting, setLocation, detectLocation } = useAppLocation();
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setCityInput(location?.city || '');
      setSuggestions([]);
    }
  }, [visible, location?.city]);

  useEffect(() => {
    if (!visible) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = cityInput.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchLocationSuggestions(query);
      setSuggestions(results);
      setSearching(false);
    }, 350);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [cityInput, visible]);

  const finishLocation = async () => {
    await locationStorage.markSetupComplete();
    onLocationSet?.();
    onClose();
  };

  const applySuggestion = async (suggestion: LocationSuggestion) => {
    setSaving(true);
    try {
      await setLocation({
        display: suggestion.display,
        city: suggestion.city,
        state: suggestion.state,
        coordinates: suggestion.coordinates,
      });
      setCityInput(suggestion.city);
      setSuggestions([]);
      await finishLocation();
    } catch {
      Alert.alert('Error', 'Could not save this location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDetect = async () => {
    try {
      await detectLocation();
      await finishLocation();
    } catch (error) {
      Alert.alert(
        'Location failed',
        error instanceof Error ? error.message : 'Could not detect location'
      );
    }
  };

  const handleSaveCity = async () => {
    const city = cityInput.trim();
    if (!city) {
      Alert.alert('Enter location', 'Please enter your city or area name.');
      return;
    }

    if (suggestions.length > 0) {
      await applySuggestion(suggestions[0]);
      return;
    }

    setSaving(true);
    try {
      const results = await searchLocationSuggestions(city);
      if (results.length > 0) {
        await applySuggestion(results[0]);
        return;
      }

      await setLocation({
        display: city,
        city,
      });
      await finishLocation();
    } catch {
      Alert.alert('Error', 'Could not save your location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (required) return;
    onClose();
  };

  const title = isFirstTime ? 'Set your location first' : 'Choose your location';
  const subtitle = isFirstTime
    ? 'Please enter your location to see nearby jobs and workers in your area.'
    : 'Jobs and workers near you will be shown based on this location';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
          disabled={required}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {!required ? (
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>

          {isFirstTime ? (
            <View style={styles.firstTimeBanner}>
              <Ionicons name="information-circle" size={18} color="#C2410C" />
              <Text style={styles.firstTimeText}>
                Location is required before you can browse jobs and workers.
              </Text>
            </View>
          ) : null}

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {location?.display && !isFirstTime ? (
              <View style={styles.currentBox}>
                <Ionicons name="location" size={18} color="#00A300" />
                <Text style={styles.currentText} numberOfLines={2}>
                  {location.display}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.detectBtn}
              onPress={handleDetect}
              disabled={detecting || saving}
            >
              {detecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.detectText}>Use current location</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.inputLabel}>Enter city / area</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="e.g. Jamshedpur, Delhi"
                placeholderTextColor="#94A3B8"
                value={cityInput}
                onChangeText={setCityInput}
                autoCapitalize="words"
                returnKeyType="search"
                onSubmitEditing={handleSaveCity}
              />
              {searching ? <ActivityIndicator size="small" color="#FF9500" /> : null}
            </View>

            {suggestions.length > 0 ? (
              <View style={styles.suggestionsBox}>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionRow}
                    onPress={() => applySuggestion(item)}
                    disabled={saving}
                  >
                    <Ionicons name="location-outline" size={16} color="#64748B" />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.display}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {!searching && cityInput.trim().length >= 2 && suggestions.length === 0 ? (
              <Text style={styles.noResultsText}>No matches found — try a nearby city name.</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, (saving || detecting) && styles.saveBtnDisabled]}
              onPress={handleSaveCity}
              disabled={saving || detecting}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Search in this area</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    flex: 1,
    paddingRight: 8,
  },
  closeBtn: {
    padding: 4,
  },
  firstTimeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  firstTimeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#9A3412',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  currentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  currentText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#166534',
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00A300',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  detectText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#94A3B8',
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#0F172A',
  },
  suggestionsBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#334155',
  },
  noResultsText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  saveBtn: {
    backgroundColor: '#FF9500',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
});
