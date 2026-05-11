import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAlbumPhotos, fetchAlbums } from '@/lib/database';
import PhotoThumbnail, { THUMB_SIZE } from '@/components/PhotoThumbnail';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Photo, Album } from '@/lib/types';

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

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [albumPhotos, albums] = await Promise.all([
        fetchAlbumPhotos(id),
        fetchAlbums(''), // we just need this specific album info
      ]);
      setPhotos(albumPhotos);
    } catch (err: any) {
      // silently fail, show empty state
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return <LoadingSpinner message="Loading album..." />;
  }

  const rows = toRows(photos);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.albumName} numberOfLines={1}>
            {album?.name ?? 'Album'}
          </Text>
          <Text style={styles.photoCount}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>Album is empty</Text>
          <Text style={styles.emptySubtitle}>
            Photos added to this album will appear here
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
                    index={photos.indexOf(photo)}
                    allPhotos={photos}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  albumName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  photoCount: {
    color: '#555',
    fontSize: 13,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: GAP / 2,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
