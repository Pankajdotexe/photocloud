// ─── Cloudinary Credentials ────────────────────────────────────────────────
const CLOUD_NAME = 'dhnirqcx0';
const UPLOAD_PRESET = 'ml_default';
// ───────────────────────────────────────────────────────────────────────────

export const CLOUDINARY_BASE = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

/**
 * Upload a local image URI to Cloudinary using unsigned upload preset.
 * Returns the secure URL and a 200x200 thumbnail URL.
 */
export async function uploadToCloudinary(
  uri: string
): Promise<{ url: string; thumbnail_url: string }> {
  const formData = new FormData();
  // @ts-ignore — React Native FormData accepts this shape
  formData.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' });
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`${CLOUDINARY_BASE}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || 'Cloudinary upload failed');
  }

  const data = await res.json();
  const url: string = data.secure_url;
  const thumbnail_url: string = url.replace(
    '/upload/',
    '/upload/w_200,h_200,c_fill,q_auto,f_auto/'
  );

  return { url, thumbnail_url };
}

/**
 * Delete a photo from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('upload_preset', UPLOAD_PRESET);

  await fetch(`${CLOUDINARY_BASE}/image/destroy`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Extract the public_id from a Cloudinary URL.
 */
export function extractPublicId(url: string): string {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return '';
    const afterUpload = parts[1];
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    return withoutVersion.replace(/\.[^.]+$/, '');
  } catch {
    return '';
  }
}

/**
 * Build an optimized Cloudinary delivery URL with given width/height.
 */
export function getOptimizedUrl(
  url: string,
  width: number,
  height: number,
  crop: string = 'fill'
): string {
  return url.replace(
    '/upload/',
    `/upload/w_${width},h_${height},c_${crop},q_auto,f_auto/`
  );
}
