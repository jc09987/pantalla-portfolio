export function isVercelBlobUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isPrivateBlobUrl(url: string) {
  try {
    return new URL(url).hostname.includes(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function displayMediaUrl(url: string | null | undefined) {
  if (!url) return "";
  if (url.startsWith("/api/blob/file")) return url;
  if (!isPrivateBlobUrl(url) && !isVercelBlobUrl(url)) return url;
  if (!isPrivateBlobUrl(url)) return url;
  return `/api/blob/file?src=${encodeURIComponent(url)}`;
}
