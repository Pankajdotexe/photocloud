import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { searchPhotos } from '@/lib/database';
import PhotoThumbnail, { THUMB_SIZE } from '@/components/PhotoThumbnail';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Photo } from '@/lib/types';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GAP = 2;

type RowItem = (Photo | null)[];

function toRows(photos: Photo[]): RowItem[] {
  const rows: RowItem[] = [];
  for (let i = 0; i < photos.length; i += NUM_COLUMNS) {
    const row = photos.slice(i, i + NUM_COLUMNS) as (Photo | null)[];
    while (row.length < NUM_COLUMNS) row.push(null);
    rows.push(row);
  }
  return rows;
}

export default function SearchScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);

  // Preload all photos when tab focused
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      searchPhotos(user.id, '').then((data) => {
        setAllPhotos(data);
      });
    }, [user])
  );

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (!user) return;

      setLoading(true);
      try {
        const data = await searchPhotos(user.id, text);
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const displayPhotos = query.trim() ? results : allPhotos;
  const rows = toRows(displayPhotos);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#555" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by month or year (e.g. May 2026)"
          placeholderTextColor="#444"
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Results */}
      {loading ? (
        <LoadingSpinner message="Searching..." />
      ) : (
        <View style={styles.resultsContainer}>
          {query.trim() && (
            <Text style={styles.resultCount}>
              {results.length} photo{results.length !== 1 ? 's' : ''} found
            </Text>
          )}

          {displayPhotos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                {query.trim() ? '🔍' : '📷'}
              </Text>
              <Text style={styles.emptyTitle}>
                {query.trim() ? 'No photos found' : 'No photos yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query.trim()
                  ? `No photos match "${query}"`
                  : 'Upload photos to search through them'}
              </Text>
            </View>
          ) : (
            <FlashList
              data={rows}
              keyExtractor={(_, idx) => `row-${idx}`}
              renderItem={({ item: row }) => (
                <View style={styles.row}>
                  {row.map((photo, idx) =>
                    photo ? (
                      <PhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        index={displayPhotos.indexOf(photo)}
                        allPhotos={displayPhotos}
                      />
                    ) : (
                      <View
                        key={`empty-${idx}`}
                        style={{
                          width: THUMB_SIZE,
                          height: THUMB_SIZE,
                          margin: GAP / 2,
                        }}
                      />
                    )
                  )}
                </View>
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#222',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    height: '100%',
  },
  resultsContainer: {
    flex: 1,
  },
  resultCount: {
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: GAP / 2,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 100,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
