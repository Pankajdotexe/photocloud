import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { Album } from '@/lib/types';

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.floor((width - 48) / 2);

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

interface Props {
  album: Album;
}

export default function AlbumCard({ album }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({ pathname: '/album/[id]', params: { id: album.id } })
      }
      activeOpacity={0.8}
    >
      {album.cover_url ? (
        <Image
          source={{ uri: album.cover_url }}
          style={styles.coverImage}
          contentFit="cover"
          placeholder={blurhash}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.placeholderCover}>
          <Text style={styles.placeholderIcon}>🏞️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.albumName} numberOfLines={1}>
          {album.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    margin: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  coverImage: {
    width: '100%',
    height: CARD_SIZE,
  },
  placeholderCover: {
    width: '100%',
    height: CARD_SIZE,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
  },
  info: {
    padding: 12,
  },
  albumName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
