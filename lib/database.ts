import { supabase } from './supabase';
import type { Photo, Album } from './types';

// ─── Photos ────────────────────────────────────────────────────────────────

/** Fetch all photos for the current user, newest first */
export async function fetchPhotos(userId: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false });

  if (error) throw error;
  return (data as Photo[]) ?? [];
}

/** Fetch photos belonging to a specific album */
export async function fetchAlbumPhotos(albumId: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('album_id', albumId)
    .order('taken_at', { ascending: false });

  if (error) throw error;
  return (data as Photo[]) ?? [];
}

/** Save a photo record after uploading to Cloudinary */
export async function savePhoto(params: {
  userId: string;
  url: string;
  thumbnail_url: string;
  albumId?: string;
  takenAt?: string;
}): Promise<Photo> {
  const { data, error } = await supabase
    .from('photos')
    .insert({
      user_id: params.userId,
      url: params.url,
      thumbnail_url: params.thumbnail_url,
      album_id: params.albumId ?? null,
      taken_at: params.takenAt ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Photo;
}

/** Delete a single photo record from Supabase */
export async function deletePhoto(photoId: string): Promise<void> {
  const { error, count } = await supabase
    .from('photos')
    .delete({ count: 'exact' })
    .eq('id', photoId);

  if (error) throw new Error(`Delete failed: ${error.message} (code: ${error.code})`);
  // RLS might block silently (count=0 but no error)
  if (count === 0) throw new Error('Photo not found or permission denied. Check Supabase RLS policies.');
}

/** Delete multiple photos by their IDs */
export async function deleteMultiplePhotos(photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return;
  const { error, count } = await supabase
    .from('photos')
    .delete({ count: 'exact' })
    .in('id', photoIds);

  if (error) throw new Error(`Bulk delete failed: ${error.message}`);
}

/** Search photos by a text query (matches month/year in taken_at) */
export async function searchPhotos(
  userId: string,
  query: string
): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false });

  if (error) throw error;

  const photos = (data as Photo[]) ?? [];

  if (!query.trim()) return photos;

  const q = query.toLowerCase();
  return photos.filter((p) => {
    const d = new Date(p.taken_at);
    const monthYear = d
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      .toLowerCase();
    const shortMonth = d
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      .toLowerCase();
    return monthYear.includes(q) || shortMonth.includes(q);
  });
}

/** Count total photos and approximate storage (bytes) for a user */
export async function getUserStats(
  userId: string
): Promise<{ count: number }> {
  const { count, error } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return { count: count ?? 0 };
}

// ─── Albums ────────────────────────────────────────────────────────────────

/** Fetch all albums for the current user */
export async function fetchAlbums(userId: string): Promise<Album[]> {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Album[]) ?? [];
}

/** Create a new album */
export async function createAlbum(params: {
  userId: string;
  name: string;
  coverUrl?: string;
}): Promise<Album> {
  const { data, error } = await supabase
    .from('albums')
    .insert({
      user_id: params.userId,
      name: params.name,
      cover_url: params.coverUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Album;
}

/** Update album cover URL */
export async function updateAlbumCover(
  albumId: string,
  coverUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('albums')
    .update({ cover_url: coverUrl })
    .eq('id', albumId);
  if (error) throw error;
}

/** Delete an album */
export async function deleteAlbum(albumId: string): Promise<void> {
  const { error } = await supabase.from('albums').delete().eq('id', albumId);
  if (error) throw error;
}
