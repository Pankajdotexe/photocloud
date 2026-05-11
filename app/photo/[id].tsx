import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
  FlatList,
  Platform,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { fetchPhotos, deletePhoto } from '@/lib/database';
import type { Photo } from '@/lib/types';

const { width, height } = Dimensions.get('window');

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
}

export default function PhotoViewerScreen() {
  const { id, index: indexParam } = useLocalSearchParams<{
    id: string;
    index: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(
    indexParam ? parseInt(indexParam) : 0
  );

  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchPhotos(user.id);
      setPhotos(data);
    } catch (err: any) {
      Alert.alert('Error loading photos', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Scroll to the tapped photo after data loads
  useEffect(() => {
    if (photos.length > 0 && flatListRef.current) {
      const idx = photos.findIndex((p) => p.id === id);
      const targetIdx = idx >= 0 ? idx : currentIndex;
      setCurrentIndex(targetIdx);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: targetIdx,
          animated: false,
        });
      }, 100);
    }
  }, [photos]);

  const currentPhoto = photos[currentIndex];

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!currentPhoto) return;

    Alert.alert(
      'Delete Photo',
      'This will permanently remove the photo from your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deletePhoto(currentPhoto.id);

              const newPhotos = photos.filter(
                (p) => p.id !== currentPhoto.id
              );
              setPhotos(newPhotos);
              showToast('Photo deleted');

              if (newPhotos.length === 0) {
                router.back();
              } else {
                setCurrentIndex((prev) =>
                  Math.min(prev, newPhotos.length - 1)
                );
              }
            } catch (err: any) {
              console.error('[Delete Error]', err);
              Alert.alert(
                'Delete Failed',
                err.message || 'Unknown error. Check console for details.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!currentPhoto) return;
    setSharing(true);
    try {
      const shareUrl = currentPhoto.url;
      const message = `Check out this photo on PhotoCloud!\n${shareUrl}`;

      if (Platform.OS === 'web') {
        // Web Share API
        if (navigator.share) {
          await navigator.share({
            title: 'PhotoCloud Photo',
            text: 'Check out this photo!',
            url: shareUrl,
          });
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(shareUrl);
          alert('Photo link copied to clipboard!');
        }
      } else {
        const result = await Share.share(
          {
            message: Platform.OS === 'ios' ? message : shareUrl,
            url: Platform.OS === 'ios' ? shareUrl : undefined,
            title: 'Share Photo',
          },
          {
            dialogTitle: 'Share Photo',
          }
        );
        if (result.action === Share.sharedAction) {
          showToast('Shared successfully');
        }
      }
    } catch (err: any) {
      if (err.message !== 'Share was dismissed') {
        Alert.alert('Share Failed', err.message);
      }
    } finally {
      setSharing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff' }}>No photos found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#6366f1', fontSize: 16 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Counter */}
        <Text style={styles.counter}>
          {currentIndex + 1} / {photos.length}
        </Text>

        {/* Right actions: Share + Delete */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.iconBtn}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="share-social-outline" size={22} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            style={styles.iconBtn}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Photo Swiper ── */}
      <FlatList
        ref={flatListRef}
        data={photos}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={currentIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: item.url }}
              style={styles.photo}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>
        )}
      />

      {/* ── Bottom Bar ── */}
      {currentPhoto && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.bottomLeft}>
            <Ionicons name="calendar-outline" size={14} color="#999" />
            <Text style={styles.dateText}>
              {formatDate(currentPhoto.taken_at)}
            </Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareChip}>
            <Ionicons name="link-outline" size={13} color="#6366f1" />
            <Text style={styles.shareChipText}>Share link</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width,
    height,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dateText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  shareChipText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
  },
});
