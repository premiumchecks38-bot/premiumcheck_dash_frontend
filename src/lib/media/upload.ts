import type { Media, MediaFolder, UploadSignature } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";

/**
 * Images go straight from the browser to Cloudinary with a short lived signature from the
 * backend (so large files never pass through the dashboard server), then the backend checks
 * the upload with Cloudinary and registers it in the media library.
 */

export const MEDIA_FOLDERS: { value: MediaFolder; label: string }[] = [
  { value: "general", label: "General" },
  { value: "brand", label: "Brand" },
  { value: "home", label: "Home page" },
  { value: "services", label: "Services" },
  { value: "categories", label: "Categories" },
  { value: "areas", label: "Areas" },
  { value: "blogs", label: "Blog" },
  { value: "pages", label: "Pages" },
  { value: "reviews", label: "Reviews" },
  { value: "team", label: "Team" },
  { value: "seo", label: "SEO and sharing" },
];

export const FOLDER_LABELS: Record<string, string> = Object.fromEntries(
  MEDIA_FOLDERS.map((f) => [f.value, f.label]),
);

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
];
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/** Why a file cannot be uploaded, or null. The signature's limits are checked again later. */
export function fileProblem(file: File, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (!IMAGE_TYPES.includes(file.type))
    return `${file.name} is not a JPG, PNG, WebP, GIF, SVG or AVIF image`;
  if (file.size > maxBytes)
    return `${file.name} is larger than ${String(Math.round(maxBytes / 1024 / 1024))} MB`;
  return null;
}

/** Send one file to Cloudinary, reporting progress from 0 to 1. */
function sendToCloudinary(
  file: File,
  signed: UploadSignature,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.api_key);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    for (const [key, value] of Object.entries(signed.params as Record<string, string | number>)) {
      form.append(key, String(value));
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.upload_url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("The image could not be uploaded to storage. Try again."));
    };
    xhr.onerror = () => {
      reject(new Error("The upload was interrupted. Check your connection and try again."));
    };
    xhr.onabort = () => {
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", () => {
      xhr.abort();
    });
    xhr.send(form);
  });
}

/** Signature, upload and registration of one image; resolves with the new media item. */
export async function uploadImage(
  file: File,
  folder: MediaFolder,
  onProgress: (fraction: number) => void,
  details: { alt_text?: string | null; title?: string | null } = {},
  signal?: AbortSignal,
): Promise<Media> {
  const signed = await admin<UploadSignature>("/media/upload-signature", {
    json: { folder, resource_type: "image", file_name: file.name },
  });
  if (file.size > signed.max_file_size) {
    throw new Error(
      `${file.name} is larger than ${String(Math.round(signed.max_file_size / 1024 / 1024))} MB`,
    );
  }
  await sendToCloudinary(file, signed, onProgress, signal);
  onProgress(1);
  return admin<Media>("/media/register", {
    json: {
      public_id: signed.public_id,
      alt_text: details.alt_text ?? null,
      title: details.title ?? file.name.replace(/\.[^.]+$/, ""),
    },
  });
}

/** Human file size. */
export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024 * 1024) return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
