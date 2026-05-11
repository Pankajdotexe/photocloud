export interface Photo {
  id: string;
  user_id: string;
  url: string;
  thumbnail_url: string | null;
  album_id: string | null;
  taken_at: string;
  created_at: string;
}

export interface Album {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
  photo_count?: number;
}

export interface GroupedPhotos {
  title: string; // "May 2026"
  data: Photo[];
}
