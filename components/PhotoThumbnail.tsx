import React from 'react';
import { TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { Photo } from '@/lib/types';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GAP = 2;
export const THUMB_SIZE = Math.floor((width - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS);

interface Props {
  photo: Photo;
  index: number;
  allPhotos: Photo[];
}

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

export default function PhotoThumbnail({ photo, index, allPhotos }: Props) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/photo/[id]',
      params: {
        id: photo.id,
        index: String(index),
      },
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={styles.container}
    >
      <Image
        source={{ uri: photo.thumbnail_url || photo.url }}
        style={styles.image}
        contentFit="cover"
        placeholder={blurhash}
        transition={200}
        cachePolicy="memory-disk"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    margin: GAP / 2,
    backgroundColor: '#111',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
