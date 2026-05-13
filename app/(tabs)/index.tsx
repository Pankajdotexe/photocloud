import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '@/context/AuthContext';
import { fetchPhotos, savePhoto, deleteMultiplePhotos } from '@/lib/database';
import { uploadToCloudinary } from '@/lib/cloudinary';
import LoadingSpinner from '@/components/LoadingSpinner';
import SectionHeader from '@/components/SectionHeader';
import UploadButton from '@/components/UploadButton';
import type { Photo } from '@/lib/types';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GAP = 2;
export const THUMB_SIZE = Math.floor(
  (width - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
);

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

type ListItem =
  | { type: 'header'; title: string }
  | { type: 'row'; photos: (Photo | null)[] };

function groupPhotosByMonth(photos: Photo[]): ListItem[] {
  const groups: Map<string, Photo[]> = new Map();
  for (const photo of photos) {
    const date = new Date(photo.taken_at);
    const key = date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(photo);
  }

  const items: ListItem[] = [];
  for (const [title, groupPhotos] of groups) {
    items.push({ type: 'header', title });
    for (let i = 0; i < groupPhotos.length; i += NUM_COLUMNS) {
      const row = groupPhotos.slice(i, i + NUM_COLUMNS);
      while (row.length < NUM_COLUMNS) row.push(null as unknown as Photo);
      items.push({ type: 'row', photos: row });
    }
  }
  return items;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [listItems, setListItems] = useState<ListItem[]>([]);

  // ── Multi-select state ──────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchPhotos(user.id);
      setPhotos(data);
      setListItems(groupPhotosByMonth(data));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }, [user]);

  useEffect(() => {
    loadPhotos().finally(() => setLoading(false));
  }, [loadPhotos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  }, [loadPhotos]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Grant photo library access to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < result.assets.length; i++) {
      const asset = result.assets[i];
      setUploadProgress(`Uploading ${i + 1}/${result.assets.length}...`);
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        const { url, thumbnail_url } = await uploadToCloudinary(manipulated.uri);

        const saved = await savePhoto({
          userId: user!.id,
          url,
          thumbnail_url,
          takenAt: asset.exif?.DateTimeOriginal
            ? new Date(asset.exif.DateTimeOriginal).toISOString()
            : new Date().toISOString(),
        });

        setPhotos((prev) => {
          const updated = [saved, ...prev];
          setListItems(groupPhotosByMonth(updated));
          return updated;
        });
        successCount++;
      } catch (err: any) {
        errors.push(err.message || 'Upload failed');
      }
    }

    setUploading(false);
    setUploadProgress('');

    if (errors.length > 0) {
      Alert.alert(
        'Upload Issues',
        `${successCount} uploaded. ${errors.length} failed:\n${errors[0]}`
      );
    }
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  const enterSelectMode = () => {
    setSelectMode(true);
    setSelected(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(photos.map((p) => p.id)));
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    
    const doDelete = async () => {
      setDeleting(true);
      try {
        await deleteMultiplePhotos([...selected]);
        const newPhotos = photos.filter((p) => !selected.has(p.id));
        setPhotos(newPhotos);
        setListItems(groupPhotosByMonth(newPhotos));
        exitSelectMode();
      } catch (err: any) {
        if (Platform.OS === 'web') {
          window.alert('Delete Failed: ' + err.message);
        } else {
          Alert.alert('Delete Failed', err.message);
        }
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Delete ${selected.size} Photo${selected.size > 1 ? 's' : ''}?\n\nThis will permanently remove the selected photos.`);
      if (confirmed) doDelete();
      return;
    }

    Alert.alert(
      `Delete ${selected.size} Photo${selected.size > 1 ? 's' : ''}`,
      'This will permanently remove the selected photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: doDelete,
        },
      ]
    );
  };

  // ── Tap photo ─────────────────────────────────────────────────────────────
  const handleTapPhoto = (photo: Photo, index: number) => {
    if (selectMode) {
      toggleSelect(photo.id);
    } else {
      router.push({ pathname: '/photo/[id]', params: { id: photo.id, index: String(index) } });
    }
  };

  const handleLongPressPhoto = (photo: Photo) => {
    if (!selectMode) {
      enterSelectMode();
      setSelected(new Set([photo.id]));
    }
  };

  // ── Render thumbnail ──────────────────────────────────────────────────────
  const renderThumbnail = (photo: Photo | null, idx: number) => {
    if (!photo) {
      return (
        <View
          key={`empty-${idx}`}
          style={{ width: THUMB_SIZE, height: THUMB_SIZE, margin: GAP / 2 }}
        />
      );
    }

    const isSelected = selected.has(photo.id);
    const photoIndex = photos.indexOf(photo);

    return (
      <TouchableOpacity
        key={photo.id}
        onPress={() => handleTapPhoto(photo, photoIndex)}
        onLongPress={() => handleLongPressPhoto(photo)}
        activeOpacity={0.85}
        style={[
          styles.thumb,
          isSelected && styles.thumbSelected,
        ]}
      >
        <Image
          source={{ uri: photo.thumbnail_url || photo.url }}
          style={styles.thumbImage}
          contentFit="cover"
          placeholder={blurhash}
          transition={200}
          cachePolicy="memory-disk"
        />
        {/* Overlay in select mode */}
        {selectMode && (
          <View style={styles.selectOverlay}>
            <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </View>
        )}
        {/* Dim overlay when selected */}
        {isSelected && <View style={styles.dimOverlay} />}
      </TouchableOpacity>
    );
  };

  // ── Render list item ──────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return <SectionHeader title={item.title} />;
    }
    return (
      <View style={styles.row}>
        {item.photos.map((photo, idx) => renderThumbnail(photo, idx))}
      </View>
    );
  };

  if (loading) return <LoadingSpinner message="Loading your photos..." />;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PhotoCloud</Text>
        <View style={styles.headerRight}>
          {uploading && (
            <View style={styles.uploadingBadge}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.uploadingText}>{uploadProgress}</Text>
            </View>
          )}
          {!selectMode ? (
            <TouchableOpacity onPress={enterSelectMode} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Select</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={selectAll} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={exitSelectMode} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── Photo Grid ── */}
      {listItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to upload your first photo
          </Text>
        </View>
      ) : (
        <FlashList
          data={listItems}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item.type === 'header' ? item.title : `row-${index}`
          }
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

      {/* ── Selection toolbar ── */}
      {selectMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            {selected.size} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[styles.selectionBtn, styles.cancelBtn]}
              onPress={exitSelectMode}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionBtn,
                styles.deleteBtn,
                selected.size === 0 && styles.btnDisabled,
              ]}
              onPress={handleBulkDelete}
              disabled={selected.size === 0 || deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.deleteBtnText}>
                    Delete {selected.size > 0 ? `(${selected.size})` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Upload FAB (hidden in select mode) ── */}
      {!selectMode && <UploadButton onPress={handleUpload} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  headerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99,102,241,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  uploadingText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: GAP / 2,
  },
  listContent: {
    paddingBottom: 120,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    margin: GAP / 2,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  thumbSelected: {
    opacity: 0.75,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  selectOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99,102,241,0.25)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0d0d0d',
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionCount: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  selectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelBtn: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cancelBtnText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
