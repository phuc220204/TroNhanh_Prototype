import { supabase } from "../supabaseClient";
import { logError } from "./supabase-error";

export interface UploadedMedia {
  storage_path: string;
  sort_order: number;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
  mime_type?: string | null;
}

/**
 * Compress an image file using Canvas to image/webp format.
 * Preserves aspect ratio, ensuring max(width, height) <= maxPx.
 */
export async function compressImage(file: File, maxPx = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Cannot get 2d context for image compression"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Image compression failed"));
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Upload listing images to Supabase Storage bucket 'listing-images'.
 * Path structure: `${sellerId}/${listingId}/${crypto.randomUUID()}.webp`
 * ⚠️ sellerId MUST be the first segment of path for security policy enforcement.
 */
export async function uploadListingImages(
  sellerId: string,
  listingId: string,
  files: File[],
  onProgress?: (index: number, total: number) => void
): Promise<UploadedMedia[]> {
  const results: UploadedMedia[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    if (onProgress) onProgress(i, files.length);

    try {
      const compressedBlob = await compressImage(file);
      const filename = `${crypto.randomUUID()}.webp`;
      const storagePath = `${sellerId}/${listingId}/${filename}`;

      const { error } = await supabase.storage
        .from("listing-images")
        .upload(storagePath, compressedBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (error) throw error;

      results.push({
        storage_path: storagePath,
        sort_order: i,
        size_bytes: compressedBlob.size,
        mime_type: "image/webp",
      });
    } catch (err) {
      logError("media-service.uploadListingImages", err);
      throw err;
    }
  }

  if (onProgress) onProgress(files.length, files.length);
  return results;
}

/**
 * Delete a listing image from Supabase Storage bucket 'listing-images'.
 */
export async function deleteListingImage(path: string): Promise<void> {
  if (!path) return;
  try {
    const { error } = await supabase.storage.from("listing-images").remove([path]);
    if (error) throw error;
  } catch (err) {
    logError("media-service.deleteListingImage", err);
  }
}

/**
 * Derive the public URL for a given storage path in 'listing-images' bucket.
 * ⚠️ Store storage_path in DB, derive public URL at render time.
 */
export function publicUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}
