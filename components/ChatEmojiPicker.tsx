import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { filterEmojis } from '@/constants/chatEmojiData';
import { recentEmojisStorage } from '@/services/recentEmojisStorage';

type Props = {
  onSelect: (emoji: string) => void;
};

function EmojiGrid({
  emojis,
  onSelect,
  emptyText,
}: {
  emojis: string[];
  onSelect: (emoji: string) => void;
  emptyText?: string;
}) {
  if (!emojis.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{emptyText || 'No emojis found'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {emojis.map((emoji, index) => (
        <TouchableOpacity
          key={`${emoji}-${index}`}
          style={styles.emojiBtn}
          onPress={() => onSelect(emoji)}
          activeOpacity={0.6}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ChatEmojiPicker({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    recentEmojisStorage.get().then(setRecentEmojis);
  }, []);

  const filteredEntries = useMemo(() => filterEmojis(query), [query]);
  const filteredEmojis = useMemo(
    () => filteredEntries.map((entry) => entry.emoji),
    [filteredEntries]
  );

  const recentForDisplay = useMemo(() => {
    if (query.trim()) {
      const allowed = new Set(filteredEmojis);
      return recentEmojis.filter((emoji) => allowed.has(emoji));
    }
    return recentEmojis;
  }, [query, recentEmojis, filteredEmojis]);

  const allForDisplay = useMemo(() => {
    const recentSet = new Set(recentForDisplay);
    return filteredEmojis.filter((emoji) => !recentSet.has(emoji));
  }, [filteredEmojis, recentForDisplay]);

  const handleSelect = async (emoji: string) => {
    onSelect(emoji);
    const updated = await recentEmojisStorage.add(emoji);
    setRecentEmojis(updated);
  };

  const isSearching = Boolean(query.trim());

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search emoji..."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
      >
        {recentForDisplay.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently used</Text>
            <View style={styles.recentRow}>
              {recentForDisplay.map((emoji, index) => (
                <TouchableOpacity
                  key={`recent-${emoji}-${index}`}
                  style={styles.recentBtn}
                  onPress={() => handleSelect(emoji)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSearching ? 'Search results' : 'All emojis'}
          </Text>
          <EmojiGrid
            emojis={allForDisplay}
            onSelect={handleSelect}
            emptyText={
              isSearching
                ? 'No emojis match your search'
                : recentForDisplay.length
                  ? 'No more emojis'
                  : 'No emojis found'
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: 248,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  section: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  recentBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    margin: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiBtn: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});
