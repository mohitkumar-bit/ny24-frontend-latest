import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { usePhonetic } from '@/hooks/usePhonetic';
import { categoryService, Category } from '@/services/category.service';

type Props = {
  query: string;
  onSelect: (category: Category) => void;
  onDropdownPressIn?: () => void;
};

const LIST_MAX_HEIGHT = 200;
const ROW_HEIGHT = 48;

export function SearchCategorySuggestions({
  query,
  onSelect,
  onDropdownPressIn,
}: Props) {
  const { t } = useTranslation();
  const phonetic = usePhonetic();
  const [categories, setCategories] = useState<Category[]>([]);
  const isDraggingRef = useRef(false);
  const typedQuery = query.trim();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await categoryService.getCategories();
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = typedQuery.toLowerCase();
    if (!q) return [];
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, typedQuery]);

  const listHeight = Math.min(suggestions.length * ROW_HEIGHT, LIST_MAX_HEIGHT);
  const canScroll = suggestions.length * ROW_HEIGHT > LIST_MAX_HEIGHT;

  if (!typedQuery || suggestions.length === 0) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View
        style={styles.dropdown}
        pointerEvents="auto"
        onTouchStart={onDropdownPressIn}
      >
        <Text style={styles.label}>{t('home.recommendedCategories')}</Text>
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item._id}
          style={{ height: listHeight }}
          scrollEnabled={canScroll}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={canScroll}
          persistentScrollbar={Platform.OS === 'android' && canScroll}
          indicatorStyle="default"
          bounces={canScroll}
          overScrollMode="always"
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            isDraggingRef.current = true;
          }}
          onScrollEndDrag={() => {
            isDraggingRef.current = false;
          }}
          onMomentumScrollEnd={() => {
            isDraggingRef.current = false;
          }}
          getItemLayout={(_, index) => ({
            length: ROW_HEIGHT,
            offset: ROW_HEIGHT * index,
            index,
          })}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              delayPressIn={150}
              onPress={() => {
                if (isDraggingRef.current) return;
                onSelect(item);
              }}
            >
              <View style={styles.iconBox}>
                <Ionicons
                  name={(item.icon as any) || 'briefcase-outline'}
                  size={18}
                  color="#FF9500"
                />
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {phonetic(item.name)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    zIndex: 400,
    ...Platform.select({
      android: { elevation: 24 },
      ios: {},
    }),
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingTop: 6,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {},
    }),
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    paddingHorizontal: 12,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: ROW_HEIGHT,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF5E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  name: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    marginRight: 8,
  },
});
